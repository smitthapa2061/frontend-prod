import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  health: number;
  healthMax: number;
  liveState: number;
}

interface Team {
  _id: string;
  teamTag: string;
  teamId?: string;
  slot?: number;
  placePoints: number;
  players: Player[];
  teamLogo: string;
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

const Dom: React.FC<DomProps> = React.memo(({ tournament, round, match, matchData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [displayedPlayer, setDisplayedPlayer] = useState<(Player & { teamTag: string; teamLogo: string; milestone: string }) | null>(null);

  // Refs to prevent loops
  const prevDataRef = useRef<any[]>([]);
  const prevKillsMap = useRef<{ [key: string]: number }>({});
  const displayTimerRef = useRef<number | null>(null);

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

  // Handle socket updates with loop prevention
  const handleSocketUpdate = useCallback((data: any) => {
    // Handle different event types
    let updatedMatchData: MatchData | null = localMatchData;

    if (data._id?.toString() === matchDataId && data.teams) {
      // Full match data update (liveMatchUpdate, matchDataUpdated)
      updatedMatchData = data;
    } else if (data.matchDataId === matchDataId && data.teamId && data.players) {
      // Player stats update
      if (localMatchData) {
        updatedMatchData = {
          ...localMatchData,
          teams: localMatchData.teams.map(team =>
            team._id === data.teamId || team.teamId === data.teamId
              ? {
                  ...team,
                  players: team.players.map(player =>
                    data.players.find((p: any) => p._id === player._id)
                      ? { ...player, ...data.players.find((p: any) => p._id === player._id) }
                      : player
                  )
                }
              : team
          )
        };
      }
    } else if (data.matchDataId === matchDataId && data.teamId && data.changes?.players) {
      // Bulk team update
      if (localMatchData) {
        updatedMatchData = {
          ...localMatchData,
          teams: localMatchData.teams.map(team =>
            team._id === data.teamId || team.teamId === data.teamId
              ? {
                  ...team,
                  players: team.players.map(player => {
                    const update = data.changes.players.find((p: any) => p._id?.toString() === player._id?.toString());
                    return update ? { ...player, ...update } : player;
                  })
                }
              : team
          )
        };
      }
    }

    if (updatedMatchData) {
      // Process data like the reference example - only compare kill numbers
      const combinedData = updatedMatchData.teams.flatMap(team =>
        team.players.map(player => ({
          _id: player._id,
          killNum: player.killNum || 0
        }))
      ).sort((a, b) => a._id.localeCompare(b._id));

      const prevDataSorted = prevDataRef.current.sort((a: any, b: any) => a._id.localeCompare(b._id));

      if (JSON.stringify(combinedData) !== JSON.stringify(prevDataSorted)) {
        console.log('Dom: Kill data changed, updating localMatchData');
        prevDataRef.current = combinedData;
        setLocalMatchData(updatedMatchData);
      } else {
        console.log('Dom: Kill data unchanged, skipping update');
      }
    }
  }, [matchDataId, localMatchData]);

  // Update local state when props change - only reset on new match
  useEffect(() => {
    if (matchData) {
      const newMatchDataId = matchData._id?.toString();
      if (newMatchDataId !== matchDataId) {
        // New match - reset everything
        setLocalMatchData(matchData);
        setMatchDataId(newMatchDataId);
        setIsVisible(false);
        setDisplayedPlayer(null);
        prevDataRef.current = [];
        prevKillsMap.current = {};
        if (displayTimerRef.current) {
          clearTimeout(displayTimerRef.current);
          displayTimerRef.current = null;
        }
      } else if (!localMatchData) {
        // Initial load
        setLocalMatchData(matchData);
      }
      // Don't update localMatchData from props if it's the same match - let socket handle updates
    }
  }, [matchData, matchDataId, localMatchData]);

  // Socket setup
  useEffect(() => {
    if (!matchDataId) return;

    const socketManager = SocketManager.getInstance();
    const freshSocket = socketManager.connect();

    // Listen to events that can update match data
    freshSocket.off('liveMatchUpdate');
    freshSocket.off('matchDataUpdated');
    freshSocket.off('playerStatsUpdated');
    freshSocket.off('teamStatsUpdated');
    freshSocket.off('bulkTeamUpdate');

    freshSocket.on('liveMatchUpdate', handleSocketUpdate);
    freshSocket.on('matchDataUpdated', handleSocketUpdate);
    freshSocket.on('playerStatsUpdated', handleSocketUpdate);
    freshSocket.on('teamStatsUpdated', handleSocketUpdate);
    freshSocket.on('bulkTeamUpdate', handleSocketUpdate);

    return () => {
      freshSocket.off('liveMatchUpdate');
      freshSocket.off('matchDataUpdated');
      freshSocket.off('playerStatsUpdated');
      freshSocket.off('teamStatsUpdated');
      freshSocket.off('bulkTeamUpdate');
      socketManager.disconnect();
    };
  }, [matchDataId, handleSocketUpdate]);

  // Milestone detection with loop prevention using useMemo
  const milestoneAchiever = useMemo(() => {
    if (!localMatchData || isVisible || displayTimerRef.current) return null;

    let achiever: (Player & { teamTag: string; teamLogo: string; milestone: string }) | null = null;
    let highestMilestoneLevel = 0;

    // Find the player with the highest new milestone
    for (const team of localMatchData.teams) {
      for (const player of team.players) {
        const playerName = player.playerName;
        const currentKills = player.killNum || 0;
        const previousKills = prevKillsMap.current[playerName] || 0;

        if (currentKills >= 8 && previousKills < 8) {
          achiever = {
            ...player,
            teamTag: team.teamTag,
            teamLogo: team.teamLogo,
            milestone: 'UNSTOPPABLE'
          };
          highestMilestoneLevel = 3;
          break;
        } else if (currentKills >= 5 && previousKills < 5) {
          achiever = {
            ...player,
            teamTag: team.teamTag,
            teamLogo: team.teamLogo,
            milestone: 'RAMPAGE'
          };
          highestMilestoneLevel = 2;
        } else if (currentKills >= 3 && previousKills < 3 && highestMilestoneLevel < 2) {
          achiever = {
            ...player,
            teamTag: team.teamTag,
            teamLogo: team.teamLogo,
            milestone: 'DOMINATION'
          };
          highestMilestoneLevel = 1;
        }
      }
      if (achiever) break;
    }

    return achiever;
  }, [localMatchData, isVisible]);

  // Handle milestone display
  useEffect(() => {
    if (milestoneAchiever) {
      console.log('Dom: Milestone achieved -', milestoneAchiever.playerName, 'with', milestoneAchiever.killNum, 'kills,', milestoneAchiever.milestone);

      // Update kills map
      const newKillsMap = { ...prevKillsMap.current };
      for (const team of localMatchData!.teams) {
        for (const player of team.players) {
          newKillsMap[player.playerName] = player.killNum || 0;
        }
      }
      prevKillsMap.current = newKillsMap;

      setDisplayedPlayer(milestoneAchiever);
      setIsVisible(true);

      // Hide after 5 seconds
      displayTimerRef.current = window.setTimeout(() => {
        console.log('Dom: Hiding milestone display after 5 seconds');
        setIsVisible(false);
        setDisplayedPlayer(null);
        displayTimerRef.current = null;
      }, 5000);
    }
  }, [milestoneAchiever, localMatchData]);

  if (!localMatchData) {
    return (
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="1600" y="350" fontFamily="Arial" fontSize="24" fill="white">No match data</text>
      </svg>
    );
  }

  if (!isVisible || !displayedPlayer) {
    return null;
  }

  return (
    <div className="w-[1920px] h-[1080px] flex justify-start items-center relative  ">
      <AnimatePresence>
        {isVisible && displayedPlayer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="w-[300px] h-[300px] bg-[#0000009d] absolute top-[340px] left-0"
          >
            {/* Team Logo */}
            <div className="w-[120px] h-[120px]">
              <div
                style={{
                  background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
                }}
                className='w-[70%] h-[70%] bg-white relative left-[240px] top-[-30px]'
              >
                <img
                  src={displayedPlayer.teamLogo || "https://res.cloudinary.com/dqckienxj/image/upload/v1759393783/default1_ypnvsb.png"}
                  alt={displayedPlayer.teamTag}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Player Image */}
            <div className="w-[300px] h-[290px] relative top-[-110px]">
              <img
                src={displayedPlayer.picUrl || 'https://res.cloudinary.com/dqckienxj/image/upload/v1735718663/defult_chach_apsjhc_jydubc.png'}
                alt={displayedPlayer.playerName}
                className="w-full h-full"
              />
            </div>

            {/* Player Info */}
            <div className="flex-1 text-center">
              {/* Kill Streak Message */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
                }}
                className="text-4xl font-bold text-yellow-400 p-[10px] w-[300px] tracking-wider font-[Righteous] relative top-[-120px]"
              >
                {displayedPlayer.milestone}
              </div>

              {/* Player Name */}
              <div className="text-2xl font-bold text-black bg-white w-[300px] h-[40px] top-[-135px] relative">
                {displayedPlayer.playerName}
              </div>

              {/* Kill Count */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
                }}
                className="text-4xl font-bold text-white relative top-[-140px]"
              >
                {displayedPlayer.killNum} KILLS
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default Dom;

