import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface DomProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
}

const Dom: React.FC<DomProps> = ({ tournament, round, match, matchData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [socketStatus, setSocketStatus] = useState<string>('disconnected');
  const [updateCount, setUpdateCount] = useState<number>(0);

  // Track all milestone achievements
  const [milestoneAchievements, setMilestoneAchievements] = useState<Map<string, { player: Player & { teamTag: string; teamLogo: string }; milestone: string; timestamp: number }>>(new Map());

  // Track visibility for animation
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (matchData) {
      console.log('Dom: Received new matchData prop, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      setLastUpdateTime(Date.now());
    }
  }, [matchData]);

  useEffect(() => {
    if (!match?._id || !matchDataId) return;

    console.log('Setting up real-time listeners for Dom - match:', match._id, 'matchData:', matchDataId);

    // Get a fresh socket connection from the manager
    const socketManager = SocketManager.getInstance();
    const freshSocket = socketManager.connect();

    console.log('Socket connected:', freshSocket?.connected);
    console.log('Socket ID:', freshSocket?.id);

    // Update initial status
    setSocketStatus(freshSocket?.connected ? 'connected' : 'disconnected');

    // Test socket connection
    freshSocket.emit('test', 'Dom component connected');

    // Log all incoming events for debugging
    const debugHandler = (eventName: string, data: any) => {
      console.log(`Dom: Received ${eventName}:`, data);
    };

    freshSocket.onAny(debugHandler);

    // Create unique event handler names to avoid conflicts with dashboard
    const domHandlers = {
      handleLiveUpdate: (data: any) => {
        console.log('Dom: Received liveMatchUpdate for match:', data.matchId);

        // The data is the entire MatchData object, so we need to check if it matches our current match
        if (data.matchId?.toString() === match._id?.toString()) {
          console.log('Dom: Updating localMatchData with live API data');
          setLocalMatchData(data);
          setLastUpdateTime(Date.now());
          setUpdateCount(prev => prev + 1);
        }
      },

      handleMatchDataUpdate: (data: any) => {
        console.log('Dom: Received matchDataUpdated:', data);
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
        console.log('Dom: Received playerStatsUpdated:', data);
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
        console.log('Dom: Received team points update:', data);
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
        console.log('Dom: Received teamStatsUpdated:', data);
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
        console.log('Dom: Received bulk team update:', data);
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
        console.log('Dom: Socket connected');
        setSocketStatus('connected');
      },

      handleDisconnect: () => {
        console.log('Dom: Socket disconnected');
        setSocketStatus('disconnected');
      }
    };

    // Listen to all relevant socket events with unique handlers
    freshSocket.on('liveMatchUpdate', domHandlers.handleLiveUpdate);
    freshSocket.on('matchDataUpdated', domHandlers.handleMatchDataUpdate);
    freshSocket.on('playerStatsUpdated', domHandlers.handlePlayerUpdate);
    freshSocket.on('teamPointsUpdated', domHandlers.handleTeamPointsUpdate);
    freshSocket.on('teamStatsUpdated', domHandlers.handleTeamStatsUpdate);
    freshSocket.on('bulkTeamUpdate', domHandlers.handleBulkTeamUpdate);
    freshSocket.on('connect', domHandlers.handleConnect);
    freshSocket.on('disconnect', domHandlers.handleDisconnect);

    return () => {
      console.log('Dom: Cleaning up socket listeners');
      // Clean up debug handler
      freshSocket.offAny();

      // Clean up with the exact same handler references
      freshSocket.off('liveMatchUpdate', domHandlers.handleLiveUpdate);
      freshSocket.off('matchDataUpdated', domHandlers.handleMatchDataUpdate);
      freshSocket.off('playerStatsUpdated', domHandlers.handlePlayerUpdate);
      freshSocket.off('teamPointsUpdated', domHandlers.handleTeamPointsUpdate);
      freshSocket.off('teamStatsUpdated', domHandlers.handleTeamStatsUpdate);
      freshSocket.off('bulkTeamUpdate', domHandlers.handleBulkTeamUpdate);
      freshSocket.off('connect', domHandlers.handleConnect);
      freshSocket.off('disconnect', domHandlers.handleDisconnect);
      // Notify socket manager that this component is done with the socket
      socketManager.disconnect();
    };
  }, [match?._id, matchDataId]);

  // Get kill streak message
  const getKillStreakMessage = (kills: number) => {
    if (kills >= 8) return 'UNSTOPPABLE';
    if (kills >= 5) return 'RAMPAGE';
    if (kills >= 3) return 'DOMINATION';
    return '';
  };

  // Get milestone level for comparison
  const getMilestoneLevel = (milestone: string) => {
    switch (milestone) {
      case 'DOMINATION': return 1;
      case 'RAMPAGE': return 2;
      case 'UNSTOPPABLE': return 3;
      default: return 0;
    }
  };

  // Add effect to handle prop changes and force re-render
  useEffect(() => {
    if (matchData && matchData._id?.toString() !== matchDataId) {
      console.log('MatchData prop changed, updating local state');
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
    }
  }, [matchData, matchDataId]);

  // Check for new milestone achievements
  useEffect(() => {
    if (!localMatchData) return;

    const newAchievements = new Map(milestoneAchievements);

    for (const team of localMatchData.teams) {
      for (const player of team.players) {
        const kills = player.killNum || 0;
        const currentMilestone = getKillStreakMessage(kills);

        if (currentMilestone) {
          const playerKey = player._id;
          const existingAchievement = newAchievements.get(playerKey);

          // Check if this is a new milestone or higher milestone for the same player
          const shouldUpdate =
            !existingAchievement || // New player
            getMilestoneLevel(currentMilestone) > getMilestoneLevel(existingAchievement.milestone); // Higher milestone

          if (shouldUpdate) {
            console.log('Dom: New milestone achieved -', currentMilestone, 'by', player.playerName, 'with', kills, 'kills');
            newAchievements.set(playerKey, {
              player: { ...player, teamTag: team.teamTag, teamLogo: team.teamLogo },
              milestone: currentMilestone,
              timestamp: Date.now()
            });
          }
        }
      }
    }

    setMilestoneAchievements(newAchievements);
  }, [localMatchData, lastUpdateTime]);

  // Get the most recent milestone achiever
  const displayedPlayer = useMemo(() => {
    if (milestoneAchievements.size === 0) return null;

    let mostRecent: { player: Player & { teamTag: string; teamLogo: string }; milestone: string; timestamp: number } | null = null;

    for (const achievement of milestoneAchievements.values()) {
      if (!mostRecent || achievement.timestamp > mostRecent.timestamp) {
        mostRecent = achievement;
      }
    }

    return mostRecent ? { ...mostRecent.player, milestone: mostRecent.milestone } : null;
  }, [milestoneAchievements]);

  // Show/hide animation with timeout
  useEffect(() => {
    if (displayedPlayer) {
      setIsVisible(true);

      // Hide after 5 seconds
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [displayedPlayer]);

  if (!localMatchData) {
    return (
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="1600" y="350" fontFamily="Arial" fontSize="24" fill="white">No match data</text>
      </svg>
    );
  }

  // Dom component UI
  return (
    <div className="w-[1920px] h-[1080px] flex justify-start items-center relative ">

 

      <AnimatePresence>
        {isVisible && displayedPlayer && (
          <motion.div
            className="w-[300px] h-[300px] bg-[#0000009d]  "
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{
              duration: 0.5,
              ease: "easeOut"
            }}
          >


            {/* Team Logo */}
            <motion.div
              className="w-[120px] h-[120px] "
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
<div 
style={{
    background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
}}
className='w-[70%] h-[70%] bg-white relative left-[240px] top-[-30px]'>

<img
                src={displayedPlayer.teamLogo}
                alt={displayedPlayer.teamTag}
                className="w-full h-full object-contain"
              />
</div>

             
            </motion.div>

    {/* Player Image */}
    <motion.div
              className="w-[300px] h-[290px] relative top-[-110px]"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <img
                src={displayedPlayer.picUrl || 'https://res.cloudinary.com/dqckienxj/image/upload/v1735718663/defult_chach_apsjhc_jydubc.png'}
                alt={displayedPlayer.playerName}
                className="w-full h-full  "
              />
            </motion.div>

           

            {/* Player Info */}
            <motion.div
              className="flex-1 text-center"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Kill Streak Message */}
              <motion.div
              style={{
                background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
              }}
                className="text-4xl font-bold text-yellow-400 p-[10px] w-[300px] tracking-wider font-[Righteous] relative top-[-120px] "
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6, type: "spring", stiffness: 200 }}
              >
                {displayedPlayer.milestone}
              </motion.div>

              {/* Player Name */}

              <motion.div
                className="text-2xl font-bold text-black bg-white w-[300px] h-[40px] top-[-135px] relative "
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                {displayedPlayer.playerName}
              </motion.div>

           
              {/* Kill Count */}
              <motion.div
               style={{
                background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
              }}
                className="text-4xl font-bold text-white relative top-[-140px]"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                {displayedPlayer.killNum} KILLS
              </motion.div>
            </motion.div>

        
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dom;