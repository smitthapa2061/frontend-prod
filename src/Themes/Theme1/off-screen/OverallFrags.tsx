import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import api from '../../../login/api.tsx';

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
  day?: string;
}

interface Player {
  _id: string;
  uId: string;
  playerName: string;
  killNum: number;
  bHasDied: boolean;
  picUrl?: string;
  damage?: string;
  survivalTime?: number;
  assists?: number;

  // Aggregated stats
  health: number;
  healthMax: number;
  liveState: number;
}

interface Team {
  teamId: string;
  teamName: string;
  teamTag: string;
  teamLogo: string;
  slot: number;
  placePoints: number;
  wwcd?: number;
  players: Player[];
  matchesPlayed?: number;
}

interface OverallData {
  tournamentId: string;
  roundId: string;
  userId: string;
  teams: Team[];
  createdAt: string;
}

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
}

interface MatchData {
  _id: string;
  teams: Team[];
}

interface OverallFragsProps {
  tournament: Tournament;
  round?: Round | null;
}

const OverallFrags: React.FC<OverallFragsProps> = ({ tournament, round }) => {
  const [overallData, setOverallData] = useState<OverallData | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!round) return;

      try {
        setLoading(true);

        // Initialize empty overall data structure
        const data: OverallData = {
          tournamentId: tournament._id,
          roundId: round._id,
          userId: '',
          teams: [],
          createdAt: new Date().toISOString()
        };

        const matchesUrl = `/public/rounds/${round._id}/matches`;
        const matchesResponse = await api.get(matchesUrl);
        const matchesList: Match[] = matchesResponse.data;
        setMatches(matchesList);

        const matchDataPromises = matchesList.map(match => {
          const url = `/public/matches/${match._id}/matchdata`;
          return api.get(url)
            .then(res => res.data)
            .catch(() => null);
        });

        // Try to get overall data, but don't fail if it doesn't exist
        try {
          const overallUrl = `/public/tournaments/${tournament._id}/rounds/${round._id}/overall`;
          const overallResponse = await api.get(overallUrl);
          Object.assign(data, overallResponse.data);
        } catch (overallError) {
          console.log('Overall data not available, using calculated data from matches');
        }
        const matchDatas: (MatchData | null)[] = await Promise.all(matchDataPromises);

        const teamMatchesCount = new Map<string, number>();
        matchDatas.forEach(matchData => {
          matchData?.teams.forEach(team => {
            const count = teamMatchesCount.get(team.teamId) || 0;
            teamMatchesCount.set(team.teamId, count + 1);
          });
        });

        // Update teams with matchesPlayed
        const updatedTeams = data.teams.map(team => ({
          ...team,
          matchesPlayed: teamMatchesCount.get(team.teamId) || 0,
        }));

        setOverallData({ ...data, teams: updatedTeams });
      } catch (err) {
        console.error('Error fetching overall data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (tournament._id && round?._id) {
      fetchData();
    }
  }, [tournament._id, round?._id]);

  // Typed text helper using Framer Motion
  const renderTyped = (text: string, className?: string, delayBase: number = 0) => {
    const letters = Array.from(text || '');
    return (
      <motion.span
        className={className}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.03, delayChildren: delayBase } }
        }}
      >
        {letters.map((char, i) => (
          <motion.span
            key={i}
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="inline-block"
          >
            {char}
          </motion.span>
        ))}
      </motion.span>
    );
  };

  // Variants for staggered card reveal
  const cardVariants = {
    hidden: { opacity: 0, y: 120 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as any } }
  };

  // Get top 5 players by kills, then damage, then assists from overall data
  const topPlayers = useMemo(() => {
    if (!overallData) return [];

    // First, aggregate players by uId across all teams to handle duplicates
    const playerMap = new Map<string, any>();

    overallData.teams.forEach(team => {
      team.players.forEach(player => {
        const key = player.uId || player._id; // Use uId if available, fallback to _id
        if (!playerMap.has(key)) {
          playerMap.set(key, {
            ...player,
            killNum: Number(player.killNum || 0),
            numericDamage: Number((player as any).damage ?? 0) || 0,
            assists: Number((player as any).assists ?? 0) || 0,
            teamTag: team.teamTag,
            teamLogo: team.teamLogo,
            teamPoints: team.placePoints,
            teamTotalKills: 0, // Will calculate after aggregation
            matchesPlayed: team.matchesPlayed || 0,
            kdRatio: '0.00'
          });
        } else {
          // Sum stats for same uId
          const existing = playerMap.get(key);
          existing.killNum += Number(player.killNum || 0);
          existing.numericDamage += Number((player as any).damage ?? 0) || 0;
          existing.assists += Number((player as any).assists ?? 0) || 0;
          // Update display fields if present
          if (player.playerName) existing.playerName = player.playerName;
          if (player.picUrl) existing.picUrl = player.picUrl;
          // Keep the team with highest placePoints
          if (team.placePoints > existing.teamPoints) {
            existing.teamTag = team.teamTag;
            existing.teamLogo = team.teamLogo;
            existing.teamPoints = team.placePoints;
          }
          existing.matchesPlayed = Math.max(existing.matchesPlayed, team.matchesPlayed || 0);
        }
      });
    });

    // Calculate teamTotalKills and kdRatio for each player
    const allPlayers = Array.from(playerMap.values()).map(player => {
      // For simplicity, teamTotalKills is the sum of kills in the player's team
      const playerTeam = overallData.teams.find(t => t.teamTag === player.teamTag);
      const teamTotalKills = playerTeam ? playerTeam.players.reduce((sum, p) => sum + (p.killNum || 0), 0) : 0;
      player.teamTotalKills = teamTotalKills;
      player.kdRatio = player.matchesPlayed ? (player.killNum / player.matchesPlayed).toFixed(2) : '0.00';
      return player;
    });

    const sorted = allPlayers.sort((a: any, b: any) => {
      if (b.killNum !== a.killNum) return b.killNum - a.killNum; // priority 1: kills
      if (b.numericDamage !== a.numericDamage) return b.numericDamage - a.numericDamage; // priority 2: damage
      if (b.assists !== a.assists) return b.assists - a.assists; // priority 3: assists
      return 0;
    });

    return sorted.slice(0, 5);
  }, [overallData]);

  if (loading) {
    return (
      <div className="w-[1920px] h-[1080px]  flex items-center justify-center">
        <div className="text-white text-2xl font-[Righteous]">Loading...</div>
      </div>
    );
  }

  if (error || !overallData) {
    return (
      <div className="w-[1920px] h-[1080px]  flex items-center justify-center">
        <div className="text-white text-2xl font-[Righteous]">{error || 'No overall data available'}</div>
      </div>
    );
  }

  return (
    <div className="w-[1920px] h-[1080px] relative overflow-hidden">
      {/* Background Pattern */}
      <motion.div
        className="absolute inset-0 opacity-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      {/* Header */}
      <motion.div className="relative z-10 text-center left-[600px] top-[100px] text-[5rem] font-bebas font-[300]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between mb-[60px]">
          <div className="flex items-center space-x-4 ">

            <div>
              <h1 className="text-white font-bold whitespace-pre text-[8rem] ">
                OVERALL TOP FRAGGERS
              </h1>
              {round && (
                <motion.p
                  className="text-gray-300 text-[2rem] font-[Righteous] whitespace-pre p-[10px]"
                  initial={{ backgroundColor: 'rgba(255,0,0,0.2)' }}
                  animate={{ backgroundColor: ['rgba(255,0,0,0.25)','rgba(255,0,0,0.45)','rgba(255,0,0,0.25)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    background: `linear-gradient(45deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
                  }}
                >
                  {renderTyped(
                    `${round.roundName} - DAY${(round as any).day ? ` ${round.day}` : ''} - ${tournament.tournamentName}`,
                    undefined,
                    0.35
                  )}
                </motion.p>
              )}

            </div>
          </div>


        </div>


      </motion.div>

      {/* Content Area */}
      <div className="relative z-10 ">
        <div className="">
          <motion.div className="grid grid-cols-5 gap-[0px]"

            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.18, delayChildren: 0.50 } }
            }}
          >
            {topPlayers.map((player, index) => {
              // For overall, assume all players are "alive" or use aggregated health
              const healthPercentage = 100; // Since it's overall, no live health

              const contribution = player.teamTotalKills > 0
                ? Math.min(100, Math.round((player.killNum / player.teamTotalKills) * 100))
                : 0;

              return (
                <motion.div
                  style={{
                    background: `linear-gradient(45deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`
                  }}
                  key={player._id}
                  className="flex flex-col bg-gray-900 w-[300px] h-[500px] relative top-[150px] left-[40px]"

                  variants={cardVariants}
                >
                  {/* Rank */}
                  <div className="text-yellow-400 text-2xl font-bold font-[Righteous] ml-[20px] ">#{index + 1}</div>
                  <div className='w-[249px] h-[1px] bg-white relative left-[50px] top-[-15px]'></div>
                  <div className='w-[60px] absolute left-[235px] top-[30px]'><img src={player.teamLogo} alt="" className='absolute' /></div>
                  <div className='w-[250px] absolute left-[20px] opacity-40'><img src={player.teamLogo} alt="" className='absolute' /></div>
                  {/* Player Avatar */}
                  <div className="w-[300px] h-[300px] ml-[0px] absolute z-0">
                    <img
                      src={player.picUrl || 'https://res.cloudinary.com/dqckienxj/image/upload/v1735718663/defult_chach_apsjhc_jydubc.png'}
                      alt={player.playerName}
                      className="w-full h-full "
                    />
                  </div>

                  {/* Player Info */}
                  <div className="text-center z-10 relative top-[220px]">
                    <div className="text-black pt-[0px] text-[1.8rem] font-bold font-[Righteous] bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] w-[300px] h-[50px]">{player.playerName}</div>
                    <div className="text-gray-300 text-[15px] font-[Righteous] absolute w-[100%] h-[55%] border-b-2 bg-[#00000099]">esports athlete for {player.teamTag}</div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 text-[2rem] w-full text-center absolute top-[330px] font-bebas font-[500] bg-[#00000099]">
                    <div>
                      <div className="text-yellow-400 text-[3rem] ">{player.killNum}</div>
                      <div className="text-white mt-[-20px]">KILLS</div>
                    </div>
                    <div>
                      <div className="text-yellow-400 text-[3rem] ">{player.numericDamage}</div>
                      <div className="text-white mt-[-20px]">DAMAGE</div>
                    </div>
                    <div>
                      <div className="text-yellow-400 text-[3rem] ">{player.assists}</div>
                      <div className="text-white mt-[-20px]">ASSISTS</div>
                    </div>
                  </div>

                  {/* K/D Ratio */}
                  <div className="w-full absolute top-[450px]">
                    <div className="flex text-xs text-gray-300 font-[Righteous] mb-1 items-center justify-center">
                      <span className='text-[1rem] '>K/D Ratio</span>
                      <span className=' text-center text-[1rem] ml-[10px]'>{player.kdRatio}</span>
                    </div>
                    <div className="w-[90%] bg-gray-700 rounded-full h-2 relative left-[10px] ">
                      <div className="h-2 rounded-full bg-yellow-400 transition-all duration-500" style={{ width: `${Math.min(100, parseFloat(player.kdRatio) * 10)}%` }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default OverallFrags;