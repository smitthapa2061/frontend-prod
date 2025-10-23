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
  teamId?: string;
  teamTag: string;
  slot?: number;
  placePoints: number;
  players: Player[];
  teamLogo: string;
}

interface MatchData {
  _id: string;
  teams: Team[];
}

interface LiveStatsProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
  overallData?: any;
}

const LiveStats: React.FC<LiveStatsProps> = ({ tournament, round, match, matchData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [socketStatus, setSocketStatus] = useState<string>('disconnected');
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [overallMap, setOverallMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (matchData) {
      console.log('LiveStats: Received new matchData prop, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      setLastUpdateTime(Date.now());
    }
  }, [matchData]);

  useEffect(() => {
    if (!match?._id || !matchDataId) return;

    console.log('Setting up real-time listeners for LiveStats - match:', match._id, 'matchData:', matchDataId);
    
    // Get a fresh socket connection from the manager
    const socketManager = SocketManager.getInstance();
    const freshSocket = socketManager.connect();
    
    console.log('Socket connected:', freshSocket?.connected);
    console.log('Socket ID:', freshSocket?.id);
    
    // Update initial status
    setSocketStatus(freshSocket?.connected ? 'connected' : 'disconnected');
    
    // Test socket connection
    freshSocket.emit('test', 'LiveStats component connected');
    
    // Log all incoming events for debugging
    const debugHandler = (eventName: string, data: any) => {
      console.log(`LiveStats: Received ${eventName}:`, data);
    };
    
    freshSocket.onAny(debugHandler);

    // Create unique event handler names to avoid conflicts with dashboard
    const liveStatsHandlers = {
      handleLiveUpdate: (data: any) => {
        console.log('LiveStats: Received liveMatchUpdate for match:', data.matchId);
        
        // The data is the entire MatchData object, so we need to check if it matches our current match
        if (data.matchId?.toString() === match._id?.toString()) {
          console.log('LiveStats: Updating localMatchData with live API data');
          setLocalMatchData(data);
          setLastUpdateTime(Date.now());
          setUpdateCount(prev => prev + 1);
        }
      },

      handleMatchDataUpdate: (data: any) => {
        console.log('LiveStats: Received matchDataUpdated:', data);
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
        console.log('LiveStats: Received playerStatsUpdated:', data);
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
        console.log('LiveStats: Received team points update:', data);
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
        console.log('LiveStats: Received teamStatsUpdated:', data);
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
        console.log('LiveStats: Received bulk team update:', data);
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
        console.log('LiveStats: Socket connected');
        setSocketStatus('connected');
      },

      handleDisconnect: () => {
        console.log('LiveStats: Socket disconnected');
        setSocketStatus('disconnected');
      }
    };

    // Listen to all relevant socket events with unique handlers
    freshSocket.on('liveMatchUpdate', liveStatsHandlers.handleLiveUpdate);
    freshSocket.on('matchDataUpdated', liveStatsHandlers.handleMatchDataUpdate);
    freshSocket.on('playerStatsUpdated', liveStatsHandlers.handlePlayerUpdate);
    freshSocket.on('teamPointsUpdated', liveStatsHandlers.handleTeamPointsUpdate);
    freshSocket.on('teamStatsUpdated', liveStatsHandlers.handleTeamStatsUpdate);
    freshSocket.on('bulkTeamUpdate', liveStatsHandlers.handleBulkTeamUpdate);
    freshSocket.on('connect', liveStatsHandlers.handleConnect);
    freshSocket.on('disconnect', liveStatsHandlers.handleDisconnect);

    return () => {
      console.log('LiveStats: Cleaning up socket listeners');
      // Clean up debug handler
      freshSocket.offAny();
      
      // Clean up with the exact same handler references
      freshSocket.off('liveMatchUpdate', liveStatsHandlers.handleLiveUpdate);
      freshSocket.off('matchDataUpdated', liveStatsHandlers.handleMatchDataUpdate);
      freshSocket.off('playerStatsUpdated', liveStatsHandlers.handlePlayerUpdate);
      freshSocket.off('teamPointsUpdated', liveStatsHandlers.handleTeamPointsUpdate);
      freshSocket.off('teamStatsUpdated', liveStatsHandlers.handleTeamStatsUpdate);
      freshSocket.off('bulkTeamUpdate', liveStatsHandlers.handleBulkTeamUpdate);
      freshSocket.off('connect', liveStatsHandlers.handleConnect);
      freshSocket.off('disconnect', liveStatsHandlers.handleDisconnect);
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

  // Fetch overall aggregated data for tournament/round
  useEffect(() => {
    if (!tournament?._id || !round?._id) return;
    const url = `https://backend-prod-530t.onrender.com/api/public/tournaments/${tournament._id}/rounds/${round._id}/overall`;
    fetch(url, { credentials: 'include' })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(data => {
        const map = new Map<string, any>();
        if (data && Array.isArray(data.teams)) {
          for (const t of data.teams) {
            const key = t.teamId?.toString?.() || t.teamId;
            if (!key) continue;
            map.set(key, {
              placePoints: t.placePoints || 0,
              players: Array.isArray(t.players) ? t.players : [],
            });
          }
        }
        setOverallMap(map);
      })
      .catch(err => {
        console.error('Failed to fetch overall data:', err);
        setOverallMap(new Map());
      });
  }, [tournament?._id, round?._id]);

  // Sort teams by points first, then by kills - recalculated on every localMatchData change
  const sortedTeams = useMemo(() => {
    if (!localMatchData) return [];
    
    console.log('LiveStats: Recalculating sortedTeams at', new Date(lastUpdateTime).toLocaleTimeString());
    
    return localMatchData.teams
      .map(team => {
        const teamKey = (team as any).teamId?.toString?.() || (team as any).teamId || team._id;
        const overall = overallMap.get(teamKey);
        const liveKills = team.players.reduce((sum, p) => sum + (p.killNum || 0), 0);
        const overallKills = overall && Array.isArray(overall.players)
          ? overall.players.reduce((s: number, p: any) => s + (p.killNum || 0), 0)
          : 0;
        const totalPoints = (overall?.placePoints || 0) + liveKills + overallKills;
        const isAllDead = team.players.every(player => player.liveState === 5 || player.bHasDied);

        return {
          ...team,
          totalKills: liveKills,
          alive: team.players.filter(p => p.liveState !== 5).length,
          totalPoints,
          isAllDead,
        } as any;
      })
      .sort((a: any, b: any) => {
        // Sort by total points first (descending), then by kills (descending)
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return b.totalKills - a.totalKills;
      });
  }, [localMatchData, lastUpdateTime, overallMap]);

  if (!localMatchData) {
    return (
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="1600" y="350" fontFamily="Arial" fontSize="24" fill="white">No match data</text>
      </svg>
    );
  }

  const topTeam = sortedTeams[0];
  const remainingTeams = sortedTeams.slice(1);
  // Scale rows to fit without scrolling while keeping designed dimensions
  const listTopOffset = 250; // matches the rows container top (rows start at top-250px)
  const canvasHeight = 1080;
  const availableHeight = Math.max(0, canvasHeight - listTopOffset);
  const rowsCount = Math.max(1, remainingTeams.length);
  const baseRowHeight = 50; // original row height
  const baseHealthBar = 40; // original health bar height
  const totalNeeded = rowsCount * baseRowHeight;
  const rowHeight = rowsCount > 0 ? Math.min(baseRowHeight, Math.floor(availableHeight / rowsCount)) : baseRowHeight;
  const healthBarHeight = Math.max(8, Math.floor((baseHealthBar * rowHeight) / baseRowHeight));
  const scaleY = totalNeeded > 0 ? Math.min(1, availableHeight / totalNeeded) : 1;

  return (
    <div className="w-[1920px] h-[1080px]  flex justify-end relative   top-[0px]">
      
      {/* Debug Status Overlay */}
 
      {/* Black Box with Player Photos */}
    <div
  className="w-[400px] h-[220px] top-[0px] right-0 relative"
  style={{
    background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`,
  
  }}
>
  {/* Players behind */}
  {topTeam && topTeam.players.map((player: Player, index: number) => (
    <div
      key={player._id}
      className="absolute w-[200px] h-[200px]"
      style={{
        left: `${-25 + index * 85}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1, // players behind
      }}
    >
      <img
        src={
          player.picUrl ||
          'https://res.cloudinary.com/dqckienxj/image/upload/v1735718663/defult_chach_apsjhc_jydubc.png'
        }
        alt={player.playerName}
        className="w-full h-full"
      />
    </div>
  ))}

  {/* Gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black z-10 h-[100px] top-[120px]" />

  {/* Top team info box */}
  {topTeam && (
    <div className='absolute w-[100%] h-[40px] top-[180px] z-20 font-[righteous] text-[1.5rem] flex items-center'>
      {/* Rank */}
      <div className='text-white relative left-[20px] w-[30px]'>1</div>
      
      {/* Team Logo */}
      <div className='w-[40px]  relative left-[20px]'>
        <img src={topTeam.teamLogo} alt={topTeam.teamTag} className="w-full h-full " />
      </div>
      <div className='w-[1px] h-[90%] bg-white relative left-[22px]'></div>
      {/* Team Tag */}
      <div className=' relative left-[30px] flex-1 text-white'>{topTeam.teamTag}</div>
      
      {/* Health bars */}
      <div className="flex gap-[2px] w-[40px] items-center justify-center relative left-[-10px]">
        {topTeam.players.map((player: Player) => {
          const isDead = player.liveState === 5 || player.bHasDied;
          const isAlive = [0, 1, 2, 3].includes(player.liveState);
          const isKnocked = player.liveState === 4;
          const useApiHealth = round?.apiEnable === true;

          let barHeight = 0;
          let barColor = "";

          if (useApiHealth) {
            // API enabled - use full health system
            if (isDead) {
              barHeight = 0;
              barColor = "";
            } else if (isKnocked) {
              const healthRatio = Math.max(0, Math.min(1, player.health / (player.healthMax || 100)));
              barHeight = healthRatio * 30;
              barColor = "bg-red-500";
            } else if (isAlive) {
              const healthRatio = Math.max(0, Math.min(1, player.health / (player.healthMax || 100)));
              barHeight = healthRatio * 30;
              barColor = "bg-white";
            }
          } else {
            // API disabled - use simple bHasDied system
            if (isDead) {
              barHeight = 0;
              barColor = "";
            } else if (isKnocked) {
              barHeight = 30;
              barColor = "bg-red-500";
            } else if (isAlive) {
              barHeight = 30;
              barColor = "bg-white";
            }
          }

          return (
            <div key={player._id} className="relative w-[8px] h-[30px] bg-gray-600">
              <div
                className={`absolute bottom-0 w-full transition-all duration-300 ${barColor}`}
                style={{ height: `${barHeight}px` }}
              />
            </div>
          );
        })}
      </div>
      
      {/* Points */}
      <div className='text-white relative left-[-2px] w-[40px] text-center'>{(topTeam as any).totalPoints}</div>
      
      {/* Kills */}
      <div className='text-white relative left-[12px] w-[40px] text-center mr-[20px]'>{topTeam.totalKills}</div>
    </div>
  )}
</div>


      {/* Golden Bar with Column Labels */}
      <div className="absolute top-[220px] right-0 w-[400px] h-[30px] text-[1.1rem] font-[Righteous]
                      bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] 
                      flex items-center justify-between px-4 font-bold text-black text-sm">
        <span>#</span>
        <span>TEAM NAME</span>
        <span className="relative left-[50px]">ALIVE</span>
        <span className="relative left-[28px]">PTS</span>
        <span className='relative left-[4px]'>KILLS</span>
      </div>

     {/* Team Rows */}
<div className="absolute right-0 top-[250px] bottom-0 w-[400px] ">
  <div style={{ transform: `scaleY(${scaleY})`, transformOrigin: 'top right' }}>
  {remainingTeams.map((team, index) => (
    <div key={team._id} className="w-full relative flex items-center text-black font-bold border-b-[#000000] border-b-[1px] overflow-visible " style={{ height: `${baseRowHeight}px`, opacity: team.isAllDead ? 0.7 : 1 }}>
      {/* Rank box */}
      <div
        className="absolute w-[40px] flex items-center justify-center text-white text-[1.5rem]"
        style={{
          height: `${baseRowHeight}px`,
          background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
        }}
      >
        {index + 2}
      </div>

<div className='w-[80px] relative left-[4px] h-[100%] ml-[40px]  bg-white '>

  <img src={team.teamLogo} alt="" />
</div>





      {/* Team name box */}
      <div
        className="h-full w-[260px] flex items-center relative left-[0px] text-black text-[1.5rem] pl-[10px] bg-white"
      >
        {team.teamTag}
      </div>

      {/* Alive */}
      {/* Stats (Alive, Points, Kills) */}
<div
  className="h-full flex text-white "
  style={{
    background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
  }}
>
  {/* Health Bars */}
  <div className="flex gap-[2px] w-[50px] items-center justify-center relative left-[10px] mt-[4px]" style={{ height: `${baseHealthBar}px` }}>
    {team.players.map((player: Player) => {
    const isDead = player.liveState === 5 || player.bHasDied;
    const isAlive = [0, 1, 2, 3].includes(player.liveState);
    const isKnocked = player.liveState === 4;
    const useApiHealth = round?.apiEnable === true;

    let barHeight = 0;
    let barColor = "";

    if (useApiHealth) {
      // API enabled - use full health system
      if (isDead) {
        barHeight = 0;
        barColor = "";
      } else if (isKnocked) {
        const healthRatio = Math.max(0, Math.min(1, player.health / (player.healthMax || 100)));
        barHeight = healthRatio * baseHealthBar;
        barColor = "bg-red-500";
      } else if (isAlive) {
        const healthRatio = Math.max(0, Math.min(1, player.health / (player.healthMax || 100)));
        barHeight = healthRatio * baseHealthBar;
        barColor = "bg-white";
      }
    } else {
      // API disabled - use simple bHasDied system
      if (isDead) {
        barHeight = 0;
        barColor = "";
      } else if (isKnocked) {
        barHeight = baseHealthBar;
        barColor = "bg-red-500";
      } else if (isAlive) {
        barHeight = baseHealthBar;
        barColor = "bg-white";
      }
    }

    return (
      <div key={player._id} className="relative w-[10px] bg-gray-600" style={{ height: `${baseHealthBar}px` }}>
        {/* Health bar */}
        <div
          className={`absolute bottom-0 w-full transition-all duration-300 ${barColor}`}
          style={{
            height: `${barHeight}px`
          }}
        />
      </div>
    );
  })}
</div>





  {/* Points */}
  <div className="w-[60px] flex items-center justify-center text-[1.5rem] relative left-[7px]">
    {(team as any).totalPoints}
  </div>

  {/* Kills */}
  <div className="w-[60px] flex items-center justify-center text-[1.5rem] text-yellow-200">
    {team.totalKills}
  </div>
</div>

    </div>
  ))}

  {/* Legend below the last team */}
  <div className="w-full h-[30px] font-[Righteous] bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] flex justify-center items-center text-black font-bold">
    ALIVE <span className='bg-white w-[20px] h-[20px] ml-[5px] border border-black'></span>
    <div className='flex items-center ml-[20px]'>
      KNOCK <span className='bg-red-500 w-[20px] h-[20px] ml-[5px] border border-black'></span>
    </div>
    <div className='flex items-center ml-[20px]'>
      DEAD <span className='bg-[#282828] w-[20px] h-[20px] ml-[5px] border border-black'></span>
    </div>
  </div>

  </div>
</div>

    </div>
  );
};

export default LiveStats;
