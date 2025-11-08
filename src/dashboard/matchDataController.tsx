  import React, { useEffect, useRef, useState, useMemo } from 'react';
  import { useParams } from 'react-router-dom';
    import api from '../login/api';
  import { socket } from "./socket"; // shared socket
  import SocketManager from './socketManager';
  import { requestQueue, UpdateBatcher } from './requestQueue';

// Retry utility with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.response?.status === 429 && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};



interface Player {
  _id: string;
  playerName: string;
  killNum: number;
  bHasDied: boolean;
  damage?: number;
  survivalTime?: number;
  assists?: number;
  [key: string]: any; // optional for unknown fields
}

interface Team {
  _id: string;
  teamId?: string;
  teamName: string;
  teamTag?: string;
  slot?: number;
  placePoints: number;
  players: Player[];
  [key: string]: any;
}

interface MatchData {
  _id: string;
  teams: Team[];
  [key: string]: any;
}



  const MatchDataViewer: React.FC = () => {
    const { tournamentId, roundId, matchId } = useParams<{
      tournamentId: string;
      roundId: string;
      matchId: string;
    }>();

    const [matchData, setMatchData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [highlightedTeam, setHighlightedTeam] = useState<string | null>(null);
const [sortBy, setSortBy] = useState<'slot' | 'placePoints'>('slot');
    const [editingTeam, setEditingTeam] = useState<null | {
      teamIndex: number;
      teamId: string;
      teamName: string;
    }>(null);
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [playersLoading, setPlayersLoading] = useState(false);

   const teamRefs = useRef<Record<string, HTMLDivElement | null>>({});
   const matchCacheRef = useRef<Record<string, any>>({});
  const setTeamRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) teamRefs.current[id] = el;
  };
    useEffect(() => {
      if (!tournamentId || !roundId || !matchId) return;
      fetchMatchData();
    }, [tournamentId, roundId, matchId]);
useEffect(() => {
  if (!socket) return;

  console.log('MatchDataController: Setting up socket listeners');

  // 🔹 Handle team-level updates (placePoints, etc.)
  const handleTeamUpdate = (data: any) => {
    setMatchData((prevData: any) => {
      if (!prevData?.teams) return prevData;

      const updatedTeams = prevData.teams.map((team: any) => {
        if (team._id !== data.teamId) return team;

        const changes = data?.changes || {};
        // Start with shallow merge for non-array fields
        const nextTeam: any = { ...team, ...changes };

        // If server sent a partial players array (e.g., only {_id, bHasDied}), deep-merge by id
        if (Array.isArray(changes.players)) {
          const updatesById = new Map(
            changes.players.map((p: any) => [p._id?.toString?.() || p._id, p])
          );
          nextTeam.players = (team.players || []).map((p: any) => {
            const key = p._id?.toString?.() || p._id;
            const upd = updatesById.get(key);
            return upd ? { ...p, ...upd } : p; // preserve existing fields like playerName
          });
        }

        return nextTeam;
      });

      return { ...prevData, teams: updatedTeams };
    });
  };

  // 🔹 Handle player-level updates (killNum, bHasDied, etc.)
  const handlePlayerUpdate = (data: any) => {
    setMatchData((prevData: any) => {
      if (!prevData?.teams) return prevData;

      return {
        ...prevData,
        teams: prevData.teams.map((team: any) => {
          if (team._id !== data.teamId) return team;

          return {
            ...team,
            players: team.players.map((player: any) =>
              player._id === data.playerId
                ? { ...player, ...data.updates } // merge updated fields
                : player
            ),
          };
        }),
      };
    });
  };

  // 🔹 Register socket listeners
  socket.on('matchDataUpdated', handleTeamUpdate);
  socket.on('playerStatsUpdated', handlePlayerUpdate);

  // 🔹 Cleanup on unmount
  return () => {
    console.log('MatchDataController: Cleaning up socket listeners');
    socket.off('matchDataUpdated', handleTeamUpdate);
    socket.off('playerStatsUpdated', handlePlayerUpdate);
    // Notify socket manager that this component is done with the socket
    SocketManager.getInstance().disconnect();
  };
}, []);

    const fetchMatchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const url = `/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata`;
    const response = await api.get(url);
    const data = response.data;

    // Normalize team IDs so _id always exists
   setMatchData({
  ...data,
  teams: Array.isArray(data?.teams)
    ? data.teams.map((team: Team) => ({
  ...team,
  _id: team?._id || team?.teamId || null,
  placePoints: team.placePoints ?? 0,
}))
    : [],
});
  } catch (err: any) {
    setError(err.message || 'Failed to fetch match data');
  } finally {
    setLoading(false);
  }
};

// Create batchers for different types of updates with proper accumulators
const killUpdateBatcher = useRef(new UpdateBatcher<{ change: number }>(
  800, // Increased from 200ms to reduce rate limiting
  (existing, newUpdate) => ({ change: existing.change + newUpdate.change })
));
const pointsUpdateBatcher = useRef(new UpdateBatcher<{ points: number }>(1000)); // Increased from 300ms
const deathUpdateBatcher = useRef(new UpdateBatcher<{ bHasDied: boolean }>(600)); // Increased from 150ms

const updateKillCount = async (teamIndex: number, playerIndex: number, change: number) => {
  if (!matchData) return;

  const team = matchData.teams[teamIndex];
  const player = team.players[playerIndex];

  // Calculate new killNum, clamp at 0
  const newKillNum = Math.max(0, player.killNum + change);
  const actualChange = newKillNum - player.killNum;

  // Update local state immediately (optimistic update)
  setMatchData((prevData: any) => {
    if (!prevData) return prevData;

    const updatedTeams = [...prevData.teams];
    updatedTeams[teamIndex] = {
      ...team,
      players: team.players.map((p: Player, idx: number) =>
        idx === playerIndex
          ? { ...p, killNum: newKillNum }
          : p
      ),
    };

    return { ...prevData, teams: updatedTeams };
  });

  // Only send update if actualChange is not zero
  if (actualChange === 0) return;

  // Use the batcher to accumulate changes
  killUpdateBatcher.current.batch(
    `${teamIndex}-${playerIndex}`,
    { change: actualChange },
    async (batchedUpdate) => {
      await retryWithBackoff(() =>
        api.patch(
          `/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata/${matchData._id}/team/${team._id}/player/${player._id}/stats`,
          { killNumChange: batchedUpdate.change }
        )
      );
    }
  );
};

// Use the direct function for immediate UI response
const throttledUpdateKillCount = updateKillCount;



const savePlacePoints = async (teamId: string, teamIndex: number, newPoints: number) => {
  if (!matchData) return;

  // Update local state immediately
  setMatchData((prevData: any) => {
    if (!prevData?.teams?.[teamIndex]) return prevData;

    const updatedTeams = [...prevData.teams];
    updatedTeams[teamIndex] = {
      ...updatedTeams[teamIndex],
      placePoints: typeof newPoints === 'number' ? newPoints : 0,
    };

    return { ...prevData, teams: updatedTeams };
  });

  // Use batcher to prevent rapid requests
  pointsUpdateBatcher.current.batch(
    `${teamId}-points`,
    { points: newPoints },
    async (batchedUpdate) => {
      await retryWithBackoff(() =>
        api.patch(
          `/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata/${matchData._id}/team/${teamId}/points`,
          { placePoints: batchedUpdate.points }
        )
      );
    }
  );
};



const openChangePlayers = async (teamIndex: number, teamId: string, teamName: string) => {
  try {
    // Open modal immediately for responsiveness
    setEditingTeam({ teamIndex, teamId, teamName });
    setPlayersLoading(true);

    // Use cached match if available; otherwise fetch only this match by id
    let currentMatch = matchCacheRef.current[String(matchId)];
    if (!currentMatch) {
      const matchRes = await api.get(`/matches/${matchId}`);
      currentMatch = matchRes.data;
      matchCacheRef.current[String(matchId)] = currentMatch;
    }

    // Derive roster from current match groups
    const group = (currentMatch.groups || []).find((grp: any) =>
      grp.slots?.some((slot: any) => slot.team && slot.team._id === teamId)
    );
    if (!group) throw new Error('Group for team not found');

    const teamSlot = group.slots.find((slot: any) => slot.team && slot.team._id === teamId);
    if (!teamSlot) throw new Error('Team not found in group');

    const playersForTeam = (teamSlot.team.players || []).filter((p: any) => p && p.playerName && p._id);

    // Preselected players from current state (no extra fetch)
    const preselectedPlayers = (matchData?.teams?.[teamIndex]?.players || []).filter((p: any) => p && p.playerName && p._id);

    const normalizeName = (name: string) => name.trim().toLowerCase();

    const preselectedMap = new Map<string, any>();
    preselectedPlayers.forEach((p: Player) => preselectedMap.set(normalizeName(p.playerName), p));

    const filteredAvailablePlayers = playersForTeam.filter((p: Player) => {
      const normalized = normalizeName(p.playerName);
      const pre = preselectedMap.get(normalized);
      return !(pre && pre._id !== p._id);
    });

    const combinedPlayersMap = new Map<string, any>();
    [...preselectedPlayers, ...filteredAvailablePlayers].forEach((p: any) => {
      combinedPlayersMap.set(p._id.toString(), p);
    });
    const combinedPlayers = Array.from(combinedPlayersMap.values());

    setAvailablePlayers(combinedPlayers);
    const selectedPlayerIds = preselectedPlayers
      .map((p: Player) => p._id.toString())
      .filter((id: string) => combinedPlayersMap.has(id));
    setSelectedPlayers(selectedPlayerIds);
  } catch (err: any) {
    setError(err.message || 'Failed to fetch team players');
  } finally {
    setPlayersLoading(false);
  }
};

const saveChangedPlayers = async () => {
  if (!editingTeam || selectedPlayers.length < 1 || selectedPlayers.length > 4) {
    alert('Please select between 1 and 4 players.');
    return;
  }

  try {
    const oldPlayers = matchData.teams[editingTeam.teamIndex].players.map((p: any) => p._id.toString());
    const newPlayers = selectedPlayers.map((id) => id.toString());

    // --- Modified replacement logic for any number of players ---
  const removed = oldPlayers.filter((id: string) => !newPlayers.includes(id));

    const added = newPlayers.filter(id => !oldPlayers.includes(id));

    // Pair up as many as possible for replacement
   const replacements = removed
  .map((oldId: string, idx: number) => ({
    oldPlayerId: oldId,
    newPlayerId: added[idx] as string | undefined,
  }))
  .filter((pair: { oldPlayerId: string; newPlayerId?: string }) => pair.newPlayerId !== undefined);

    if (replacements.length > 0) {
      const url = `/matchdata/${matchData._id}/team/${editingTeam.teamId}/replace`;
      await api.put(url, { replacements });
    }

    // If there are extra added players, add them
    if (added.length > removed.length) {
      const extraAdded = added.slice(removed.length);
      if (extraAdded.length > 0) {
        const url = `/matchdata/${matchData._id}/team/${editingTeam.teamId}/player/add`;
        await api.post(url, { newPlayerIds: extraAdded });
      }
    }

    // If there are extra removed players, remove them
    if (removed.length > added.length) {
      const extraRemoved = removed.slice(added.length);
      if (extraRemoved.length > 0) {
        const url = `/matchdata/${matchData._id}/team/${editingTeam.teamId}/players/remove`;
        await api.delete(url, { data: { playerIds: extraRemoved } });
      }
    }
    // --- End of modified replacement logic ---

    // Update state locally without resetting existing players stats
    setMatchData((prev: any) => {
      if (!prev) return prev;
      const updatedTeams = [...prev.teams];

      const currentPlayers = updatedTeams[editingTeam.teamIndex].players;

      const newPlayersWithStats = selectedPlayers.map((id) => {
        // If player already exists → preserve stats
        const existing = currentPlayers.find((p: any) => p._id.toString() === id);
        if (existing) return existing;

        // If player is new → create blank stats object
        const fromAvailable = availablePlayers.find(p => p._id.toString() === id);
        if (fromAvailable) {
          return {
            ...fromAvailable,
            killNum: 0,
            damage: 0,
            survivalTime: 0,
            assists: 0,
            bHasDied: false,
            // add any other fields your backend initializes for a new player
          };
        }

        return null;
      }).filter(Boolean);

      updatedTeams[editingTeam.teamIndex] = {
        ...updatedTeams[editingTeam.teamIndex],
        players: newPlayersWithStats
      };

      return { ...prev, teams: updatedTeams };
    });

    setEditingTeam(null);
  } catch (err: any) {
    setError(err.message || 'Failed to update players');
  }
};

const togglePlayerDeath = async (teamIndex: number, playerIndex: number) => {
  if (!matchData) return;

  const team = matchData.teams[teamIndex];
  const player = team.players[playerIndex];
  const newBHasDied = !player.bHasDied;
  const playerKey = `${teamIndex}-${playerIndex}-death`;

  // Optimistic UI
  setMatchData((prev: MatchData | null) => {
    if (!prev) return prev;

    const updatedTeams = [...prev.teams];
    updatedTeams[teamIndex] = {
      ...team,
      players: team.players.map((p: Player, idx: number) =>
        idx === playerIndex ? { ...p, bHasDied: newBHasDied } : p
      ),
    };

    return { ...prev, teams: updatedTeams };
  });

  // Use batcher to prevent rapid requests
  deathUpdateBatcher.current.batch(
    playerKey,
    { bHasDied: newBHasDied },
    async (batchedUpdate) => {
      await retryWithBackoff(() =>
        api.patch(
          `/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata/${matchData._id}/team/${team._id}/player/${player._id}/stats`,
          { bHasDied: batchedUpdate.bHasDied }
        )
      );
    }
  );
};

// Toggle all players in a team using bulk update with request queue
const toggleAllPlayersDeath = async (teamIndex: number) => {
  if (!matchData) return;

  const team = matchData.teams[teamIndex];
  const newValue = !team.players.every((p: Player) => p.bHasDied);
  const teamKey = `${teamIndex}-bulk-death`;

  // Optimistic UI
  setMatchData((prev: MatchData | null) => {
    if (!prev) return prev;
    const updatedTeams = [...prev.teams];
    updatedTeams[teamIndex] = {
      ...team,
      players: team.players.map((p: Player) => ({ ...p, bHasDied: newValue })),
    };
    return { ...prev, teams: updatedTeams };
  });

  // Use request queue to prevent rapid bulk updates
  requestQueue.add(async () => {
    await api.patch(
      `/tournament/${tournamentId}/round/${roundId}/match/${matchId}/matchdata/${matchData._id}/team/${team._id}/bulk`,
      { bHasDied: newValue }
    );
  }).catch((err) => {
    console.error('Failed to toggle all players death:', err);
  });
};


// Sorting logic for teams grid only (memoized)
const sortedTeams = useMemo(() => {
  const teams = [...(matchData?.teams ?? [])];
  teams.sort((a: any, b: any) => {
    if (sortBy === 'slot') {
      return (a.slot ?? 0) - (b.slot ?? 0);
    } else {
      // Sort descending by placePoints
      return (b.placePoints ?? 0) - (a.placePoints ?? 0);
    }
  });
  return teams;
}, [matchData?.teams, sortBy]);

// Totals for header (memoized)
const totalTeams = useMemo(() => (
  (matchData?.teams || []).filter((team: any) => team.players.some((p: any) => !p.bHasDied)).length
), [matchData?.teams]);

const totalPlayers = useMemo(() => (
  (matchData?.teams || []).reduce((sum: number, team: any) => sum + team.players.filter((p: any) => !p.bHasDied).length, 0)
), [matchData?.teams]);

    
    if (loading) return <p style={{ color: '#fff' }}>Loading match data...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (!matchData) return <p style={{ color: '#fff' }}>No match data found.</p>;

 
    return (
    <div
  style={{
    background: 'linear-gradient(135deg, #000000,#000000)', // purple → blue gradient
    color: '#fff',
    minHeight: '100vh',
 
  }}
>
 

      {/* Sticky header + navigation in one box */}
<div
  style={{
    position: 'sticky',
    top: 0,
    background: '#000',
    color: '#ffcc00',
    zIndex: 9999,
    padding: '0.5rem',
    borderBottom: '2px solid #222',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  }}
>
  {/* Header */}
  <div className="flex justify-center gap-6 font-bold text-xl">
    <h2>Teams Alive: {totalTeams}</h2>
    <h2>Players Alive: {totalPlayers}</h2>
  </div>

  {/* Navigation buttons */}
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      justifyContent: 'center',
    }}
  >
    {matchData.teams.map((team: any) => {
      const allPlayersDead =
        team.players.length > 0 && team.players.every((p: any) => p.bHasDied);

      return (
        <button
          key={team._id}
          onClick={() => {
            const currentTeamId = team._id;
            setHighlightedTeam(currentTeamId);
            setTimeout(() => {
              const el = teamRefs.current[currentTeamId];
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 0);
            setTimeout(() => {
              setHighlightedTeam(prev =>
                prev === currentTeamId ? null : prev
              );
            }, 1000);
          }}
          style={{
            background: allPlayersDead ? '#ff0000' : '#ffcc00',
            color: allPlayersDead ? '#fff' : '#000',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            boxShadow:
              highlightedTeam === team._id
                ? '0 0 15px #00ffcc'
                : '0 0 15px transparent',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          Slot {team.slot}
        </button>
      );
    })}
  </div>
</div>

<div style={{ margin: '1rem 0', textAlign: 'center' }}>
  <label style={{ color: '#ffcc00', fontWeight: 'bold', marginRight: '0.5rem' }}>
    Sort by:
  </label>
  <select
    value={sortBy}
    onChange={e => setSortBy(e.target.value as 'slot' | 'placePoints')}
    style={{
      padding: '0.3rem 0.6rem',
      borderRadius: '4px',
      border: '1px solid #ffcc00',
      background: '#222',
      color: '#ffcc00',
      fontWeight: 'bold',
    }}
  >
    <option value="slot">Slot</option>
    <option value="placePoints">Placement Points</option>
  </select>
</div>
        {/* Teams grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
          }}
        >
 {sortedTeams.map((team: any, teamIndex: number) => {
  // Determine if all players in the team have bHasDied true
  const allPlayersDied = team.players.every((p: any) => p.bHasDied);
 // Calculate total kills and total points
  const totalKills = team.players.reduce((sum: number, player: any) => sum + (player.killNum ?? 0), 0);
  const totalPoints = (team.placePoints ?? 0) + totalKills;

  return (
    <div
      key={team._id}
      ref={setTeamRef(team._id)}
     style={{
    border: '2px solid #ffcc00', // keep constant
    boxShadow: highlightedTeam === team._id ? '0 0 15px #00ffcc' : 'none', // only glow changes
    borderRadius: '8px',
    padding: '1rem',
    background: '#111',
    transition: 'box-shadow 0.3s ease', // only animate shadow
  }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
       <h4
  style={{ color: '#ffcc00', flex: 2 }}
  className="flex flex-col"
>
  <span>Name : {team.teamName}</span>
  <span>Tag : {team.teamTag}</span>
  <span>Slot : {team.slot}</span>
</h4>

        {/* Team-level bHasDied checkbox */}
      <input
  type="checkbox"
  checked={allPlayersDied}
  onChange={() => toggleAllPlayersDeath(teamIndex)}
  style={{ marginLeft: '1rem', transform: 'scale(1.3)' }}
  title="Mark all players as Died"
/>


        <span style={{ color: '#ff6600', marginLeft: '0.5rem' }}>All Died</span>
      </div>
      <button
        onClick={() => openChangePlayers(teamIndex, team.teamId || team._id, team.teamName)}
        style={{
          background: '#00bfff',
          color: '#fff',
          border: 'none',
        
          borderRadius: '4px',
          padding: '0.3rem 0.6rem',
          cursor: 'pointer',
          marginBottom: '0.5rem',
        }}
      >
        Change Players
      </button>
      <p>
        <strong>Place Points:</strong>{' '}
       <input
  type="number"
  min={0}
  value={team.placePoints ?? 0}
  onChange={(e) => {
    const val = e.target.value;
    const numVal = val === '' ? 0 : parseInt(val, 10);

    // Update local state immediately (optimistic UI)
 setMatchData((prev: MatchData | null) => {
  if (!prev) return prev;
  const updatedTeams = [...prev.teams];
  updatedTeams[teamIndex] = {
    ...updatedTeams[teamIndex],
    placePoints: isNaN(numVal) ? 0 : numVal,
  };
  return { ...prev, teams: updatedTeams };
});

  }}
  onBlur={(e) => {
    const val = e.target.value;
    const numVal = val === '' ? 0 : parseInt(val, 10);

    // Send backend request only once when user finishes editing
    if (!isNaN(numVal)) {
      savePlacePoints(team._id, teamIndex, numVal);
    }
  }}
  style={{
    width: '60px',
    borderRadius: '4px',
    border: '1px solid #ffcc00',
    background: '#222',
    color: '#ffcc00',
       appearance: 'textfield', // hides arrows (most browsers)
    fontWeight: 'bold',
    textAlign: 'center',
  }}
/>

      </p>
      <h5 style={{ color: '#ff6600' }}>Players:</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {team.players.map((player: any, playerIndex: number) => (
          <div
            key={player._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#222',
              borderRadius: '6px',
              padding: '0.5rem',
              gap: '0.5rem',
            }}
          >
            
            <span style={{ flex: 1, fontWeight: 'bold' }}>{player.playerName}</span>
            <button
          onClick={() => throttledUpdateKillCount(teamIndex, playerIndex, 1)}
              style={{
                background: '#00ff00',
                color: '#000',
                border: 'none',
                padding: '0.3rem 0.6rem',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              +
            </button>
            <span
              style={{
                minWidth: '20px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              {player.killNum ?? 0}
            </span>
            <button
          onClick={() => throttledUpdateKillCount(teamIndex, playerIndex, -1)}
              style={{
                background: '#ff0000',
                color: '#fff',
                border: 'none',
                padding: '0.3rem 0.6rem',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              -
            </button>
           <input
  type="checkbox"
  checked={player.bHasDied ?? false}
  onChange={() => togglePlayerDeath(teamIndex, playerIndex)}
  style={{ marginRight: '0.5rem' }}
  className="scale-150"
  title="Mark as Died"
/>
          </div>
        ))}
          {/* Add total kills and total points display here */}
    <div className="flex flex-wrap gap-10">
  <p>
     <strong>Total Points : </strong>
    <span style={{ color: '#00ff00', fontWeight: 'bold' }}>
      {totalPoints}
    </span>
   
  </p>
  <p>
    <strong>Total Kills :</strong> <span style={{ color: '#00ff00', fontWeight: 'bold' }}>{totalKills}</span>
  </p>
</div>

      </div>
    </div>
  );
})}
        </div>

        {/* Change Players Modal */}
        {editingTeam && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10000,
            }}
          >
            <div
              style={{
                background: '#222',
                padding: '1rem',
                borderRadius: '8px',
                width: '400px',
              }}
            >
              <h3 style={{ color: '#ffcc00' }}>
                Change Players for {editingTeam.teamName}
              </h3>
              <p style={{ color: '#ccc' }}>Select exactly 4 players</p>
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginBottom: '1rem',
                }}
              >
{(playersLoading ? [] : availablePlayers).map((player: any) => {
  const playerIdStr = player._id.toString();
  const isChecked = selectedPlayers.includes(playerIdStr);

  return (
    <label key={playerIdStr} style={{ display: 'block', color: '#fff', marginBottom: '0.3rem' }}>
     <input
  type="checkbox"
  checked={isChecked}
  onChange={() => {
    if (isChecked) {
      // Player is being unchecked
      console.log('Unchecked player id:', playerIdStr);
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerIdStr));
    } else {
      // Player is being checked
      if (selectedPlayers.length >= 4) {
        alert('Please untick a player before selecting another.');
        return;
      }
      console.log('Checked player id:', playerIdStr);
      setSelectedPlayers([...selectedPlayers, playerIdStr]);
    }
  }}
/>

      {player.playerName}
    </label>
  );
})}
        </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setEditingTeam(null)}
                  style={{
                    background: '#aaa',
                    border: 'none',
                    padding: '0.3rem 0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveChangedPlayers}
                  style={{
                    background: '#00ff00',
                    border: 'none',
                    padding: '0.3rem 0.6rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  export default MatchDataViewer;
