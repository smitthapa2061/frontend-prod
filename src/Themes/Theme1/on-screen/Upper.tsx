import React, { useEffect, useState, useMemo } from 'react';
import SocketManager from '../../../dashboard/socketManager.tsx';

interface Tournament {
  _id: string;
  tournamentName: string;
  torLogo?: string;
  day?: string;
  primaryColor?: string;
  secondaryColor?: string;
  overlayBg?: string;
}

interface Round {
  _id: string;
  roundName: string;
  apiEnable?: boolean;
}

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
}

interface Player {
  _id: string;
  playerName: string;
  killNum: number;
  bHasDied: boolean;
  picUrl?: string;

  // Live stats fields
  health: number;
  healthMax: number;
  liveState: number; // 0 = knocked, 5 = dead, etc.
}

interface Team {
  _id: string;
  teamTag: string;
  slot?: number;
  placePoints: number;
  players: Player[];
  teamLogo:string;
}

interface MatchData {
  _id: string;
  teams: Team[];
}

interface UpperProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
}

const Upper: React.FC<UpperProps> = ({ tournament, round, match, matchData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [socketStatus, setSocketStatus] = useState<string>('disconnected');
  const [updateCount, setUpdateCount] = useState<number>(0);

  useEffect(() => {
    if (matchData) {
      console.log('Upper: Received new matchData prop, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      setLastUpdateTime(Date.now());
    }
  }, [matchData]);

  useEffect(() => {
    if (!match?._id || !matchDataId) return;

    console.log('Setting up real-time listeners for Upper - match:', match._id, 'matchData:', matchDataId);

    // Get a fresh socket connection from the manager
    const socketManager = SocketManager.getInstance();
    const freshSocket = socketManager.connect();

    console.log('Socket connected:', freshSocket?.connected);
    console.log('Socket ID:', freshSocket?.id);

    // Update initial status
    setSocketStatus(freshSocket?.connected ? 'connected' : 'disconnected');

    // Test socket connection
    freshSocket.emit('test', 'Upper component connected');

    // Log all incoming events for debugging
    const debugHandler = (eventName: string, data: any) => {
      console.log(`Upper: Received ${eventName}:`, data);
    };

    freshSocket.onAny(debugHandler);

    // Create unique event handler names to avoid conflicts with dashboard
    const upperHandlers = {
      handleLiveUpdate: (data: any) => {
        console.log('Upper: Received liveMatchUpdate for match:', data.matchId);

        // The data is the entire MatchData object, so we need to check if it matches our current match
        if (data.matchId?.toString() === match._id?.toString()) {
          console.log('Upper: Updating localMatchData with live API data');
          setLocalMatchData(data);
          setLastUpdateTime(Date.now());
          setUpdateCount(prev => prev + 1);
        }
      },

      handleMatchDataUpdate: (data: any) => {
        console.log('Upper: Received matchDataUpdated:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            const updatedTeams = prev.teams.map((team: any) => {
              // Check both _id and teamId for team matching
              if (team._id === data.teamId || team.teamId === data.teamId) {
                const changes = data.changes || {};
                const nextTeam: any = { ...team, ...changes };
                if (Array.isArray(changes.players)) {
                  const updatesById = new Map(
                    changes.players.map((p: any) => [p._id?.toString?.() || p._id, p])
                  );
                  nextTeam.players = team.players.map((p: Player) => {
                    const key = p._id?.toString?.() || p._id;
                    const upd = updatesById.get(key);
                    return upd ? { ...p, ...upd } : p;
                  });
                }
                return nextTeam;
              }
              return team;
            });
            return { ...prev, teams: updatedTeams };
          });
          setLastUpdateTime(Date.now());
          setUpdateCount(prev => prev + 1);
        }
      },

      handlePlayerUpdate: (data: any) => {
        console.log('Upper: Received playerStatsUpdated:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                // Check both _id and teamId for team matching
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  return {
                    ...team,
                    players: team.players.map((player: Player) =>
                      player._id === data.playerId
                        ? { ...player, ...data.updates }
                        : player
                    ),
                  };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },

      handleTeamPointsUpdate: (data: any) => {
        console.log('Upper: Received team points update:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                // Check both _id and teamId for team matching
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  return {
                    ...team,
                    placePoints: data.changes?.placePoints ?? team.placePoints,
                  };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },

      handleTeamStatsUpdate: (data: any) => {
        console.log('Upper: Received teamStatsUpdated:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                // Check both _id and teamId for team matching
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  // Update player kill numbers if provided
                  const updatedPlayers = data.players ?
                    team.players.map((player: any) => {
                      const playerUpdate = data.players.find((p: any) => p._id === player._id);
                      return playerUpdate ? { ...player, killNum: playerUpdate.killNum } : player;
                    }) : team.players;

                  return {
                    ...team,
                    players: updatedPlayers,
                  };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },

      handleBulkTeamUpdate: (data: any) => {
        console.log('Upper: Received bulk team update:', data);
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev: MatchData | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                // Check both _id and teamId for team matching
                if ((team._id === data.teamId || team.teamId === data.teamId) && data.changes?.players) {
                  const playerUpdates = new Map(
                    data.changes.players.map((p: any) => [p._id?.toString?.() || p._id, p])
                  );
                  return {
                    ...team,
                    players: team.players.map((player: Player) => {
                      const key = player._id?.toString?.() || player._id;
                      const update = playerUpdates.get(key);
                      return update ? { ...player, ...update } : player;
                    }),
                  };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },

      handleConnect: () => {
        console.log('Upper: Socket connected');
        setSocketStatus('connected');
      },

      handleDisconnect: () => {
        console.log('Upper: Socket disconnected');
        setSocketStatus('disconnected');
      }
    };

    // Listen to all relevant socket events with unique handlers
    freshSocket.on('liveMatchUpdate', upperHandlers.handleLiveUpdate);
    freshSocket.on('matchDataUpdated', upperHandlers.handleMatchDataUpdate);
    freshSocket.on('playerStatsUpdated', upperHandlers.handlePlayerUpdate);
    freshSocket.on('teamPointsUpdated', upperHandlers.handleTeamPointsUpdate);
    freshSocket.on('teamStatsUpdated', upperHandlers.handleTeamStatsUpdate);
    freshSocket.on('bulkTeamUpdate', upperHandlers.handleBulkTeamUpdate);
    freshSocket.on('connect', upperHandlers.handleConnect);
    freshSocket.on('disconnect', upperHandlers.handleDisconnect);

    return () => {
      console.log('Upper: Cleaning up socket listeners');
      // Clean up debug handler
      freshSocket.offAny();

      // Clean up with the exact same handler references
      freshSocket.off('liveMatchUpdate', upperHandlers.handleLiveUpdate);
      freshSocket.off('matchDataUpdated', upperHandlers.handleMatchDataUpdate);
      freshSocket.off('playerStatsUpdated', upperHandlers.handlePlayerUpdate);
      freshSocket.off('teamPointsUpdated', upperHandlers.handleTeamPointsUpdate);
      freshSocket.off('teamStatsUpdated', upperHandlers.handleTeamStatsUpdate);
      freshSocket.off('bulkTeamUpdate', upperHandlers.handleBulkTeamUpdate);
      freshSocket.off('connect', upperHandlers.handleConnect);
      freshSocket.off('disconnect', upperHandlers.handleDisconnect);
      // Notify socket manager that this component is done with the socket
      socketManager.disconnect();
    };
  }, [match?._id, matchDataId]);

  // Add effect to handle prop changes and force re-render
  useEffect(() => {
    if (matchData && matchData._id?.toString() !== matchDataId) {
      console.log('MatchData prop changed, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
    }
  }, [matchData, matchDataId]);

  // Get top 5 teams by alive players - recalculated on every localMatchData change
  const topTeams = useMemo(() => {
    if (!localMatchData) return [];

    console.log('Upper: Recalculating topTeams at', new Date(lastUpdateTime).toLocaleTimeString());

    const useApiHealth = round?.apiEnable === true;

    return localMatchData.teams
      .map(team => {
        const aliveCount = team.players.filter(p => !p.bHasDied).length;
        let wwcd: number;
        if (useApiHealth) {
          // API enabled - use health sum / 4
          wwcd = Math.round(team.players.reduce((sum, p) => sum + (p.health || 0), 0) / 4);
        } else {
          // API disabled - count alive players (not bHasDied) * 25
          wwcd = Math.round(aliveCount * 25);
        }
        return {
          ...team,
          totalKills: team.players.reduce((sum, p) => sum + (p.killNum || 0), 0),
          aliveCount,
          wwcd,
        };
      })
      .filter(team => team.aliveCount > 0) // Only teams with alive players
      .sort((a, b) => b.aliveCount - a.aliveCount)
      .slice(0, 5);
  }, [localMatchData, lastUpdateTime, round?.apiEnable]);

  if (!localMatchData) {
    return (
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg ">
        <text x="1600" y="350" fontFamily="Arial" fontSize="24" fill="white">No match data</text>
      </svg>
    );
  }

  // Upper component UI
  return (
    <div className="w-[1920px] h-[1080px] flex justify-center relative ">
      <div
     
        className='w-[100%] h-[500px] top-[60px] relative rounded-lg p-4 '
      >
     
        <div className="flex  flex-wrap gap-[50px] justify-center scale-150 ">
          {topTeams.map((team, index) => (
            <div 
               style={{
          background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
        }}
            key={team._id} className="flex items-center bg-black/50 p-2 ">
         
              
              <div className="w-[40px] h-[40px] mr-3">
                <img src={team.teamLogo} alt={team.teamTag} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 text-white font-[400] text-[2rem] mr-[10px] font-bebas relative w-[60px]" >{team.teamTag}</div>
              <div className="flex gap-[2px] w-[50px]   ">
  {team.players.slice(0, 4).map((player) => {
    const isDead = player.liveState === 5 || player.bHasDied;
    const isAlive = [0, 1, 2, 3].includes(player.liveState);
    const isKnocked = player.liveState === 4;
    const useApiHealth = round?.apiEnable === true;

    let barHeight = 0;
    let barColor = "";

    if (useApiHealth) {
      // API enabled - use full health system
      if (isDead) {
        barHeight = 40;
        barColor = "bg-gray-500";
      } else if (isKnocked) {
        const healthRatio = Math.max(0, Math.min(1, player.health / (player.healthMax || 100)));
        barHeight = healthRatio * 40;
        barColor = "bg-red-500";
      } else if (isAlive) {
        const healthRatio = Math.max(0, Math.min(1, player.health / (player.healthMax || 100)));
        barHeight = healthRatio * 40;
        barColor = "bg-white";
      }
    } else {
      // API disabled - use simple bHasDied system
      if (isDead) {
        barHeight = 40;
        barColor = "bg-gray-500";
      } else if (isKnocked) {
        barHeight = 40;
        barColor = "bg-red-500";
      } else if (isAlive) {
        barHeight = 40;
        barColor = "bg-white";
      }
    }

    return (
      <div key={player._id} className=" w-[10px] h-[40px] bg-gray-600" style={{ position: 'relative' }}>
        {/* Health bar */}
        <div
          className={`transition-all duration-300 ${barColor}`}
          style={{
            height: `${barHeight}px`,
            position: 'absolute',
            bottom: 0,
            width: '100%'
          }}
        />
      </div>
    );
  })}
</div>

              <div className="text-black bg-white w-[190px] h-[30px] font-bold absolute top-[75px] ml-[-10px] text-center text-[0.8rem] font-[Righteous] flex items-center justify-center p-[10px]">WWCD CHANCE- <span className='text-yellow-600'>{team.wwcd}%</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Upper;