import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  day?: string;
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
  damage?: string | number;
  survivalTime?: number;
  assists?: number;
  health?: number;
  healthMax?: number;
  liveState?: number; // 0,1,2,3 = alive, 4 = knocked, 5 = dead
  knockouts:number
}

interface Team {
  _id: string;
  teamId?: string;
  teamName?: string;
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

interface WwcdSummaryProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
}

const WwcdSummary: React.FC<WwcdSummaryProps> = ({ tournament, round, match, matchData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [matchDataId, setMatchDataId] = useState<string | null>(matchData?._id?.toString() || null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (matchData) {
      setLocalMatchData(matchData);
      setMatchDataId(matchData._id?.toString());
      setLastUpdateTime(Date.now());
    }
  }, [matchData]);

  useEffect(() => {
    if (!match?._id || !matchDataId) return;

    const socketManager = SocketManager.getInstance();
    const socket = socketManager.connect();
    setSocketStatus(socket?.connected ? 'connected' : 'disconnected');

    const handlers = {
      handleLiveUpdate: (data: any) => {
        if (data.matchId?.toString() === match._id?.toString()) {
          setLocalMatchData(data);
          setLastUpdateTime(Date.now());
        }
      },
      handleMatchDataUpdate: (data: any) => {
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev) => {
            if (!prev) return prev;
            const updatedTeams = prev.teams.map((team: any) => {
              if (team._id === data.teamId || team.teamId === data.teamId) {
                const changes = data.changes || {};
                const nextTeam: any = { ...team, ...changes };
                if (Array.isArray(changes.players)) {
                  const updatesById = new Map(
                    changes.players.map((p: any) => [p._id?.toString?.() || p._id, p])
                  );
                  nextTeam.players = (team.players || []).map((p: Player) => {
                    const key = (p as any)._id?.toString?.() || (p as any)._id;
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
        }
      },
      handlePlayerUpdate: (data: any) => {
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  return {
                    ...team,
                    players: (team.players || []).map((player: Player) =>
                      (player as any)._id === data.playerId ? { ...player, ...data.updates } : player
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
        if (data.matchDataId === matchDataId) {
          setLocalMatchData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              teams: prev.teams.map((team: any) => {
                if (team._id === data.teamId || team.teamId === data.teamId) {
                  return { ...team, placePoints: data.changes?.placePoints ?? team.placePoints };
                }
                return team;
              }),
            };
          });
          setLastUpdateTime(Date.now());
        }
      },
      handleConnect: () => setSocketStatus('connected'),
      handleDisconnect: () => setSocketStatus('disconnected'),
    };

    socket.on('liveMatchUpdate', handlers.handleLiveUpdate);
    socket.on('matchDataUpdated', handlers.handleMatchDataUpdate);
    socket.on('playerStatsUpdated', handlers.handlePlayerUpdate);
    socket.on('teamPointsUpdated', handlers.handleTeamPointsUpdate);
    socket.on('connect', handlers.handleConnect);
    socket.on('disconnect', handlers.handleDisconnect);

    return () => {
      socket.offAny();
      socket.off('liveMatchUpdate', handlers.handleLiveUpdate);
      socket.off('matchDataUpdated', handlers.handleMatchDataUpdate);
      socket.off('playerStatsUpdated', handlers.handlePlayerUpdate);
      socket.off('teamPointsUpdated', handlers.handleTeamPointsUpdate);
      socket.off('connect', handlers.handleConnect);
      socket.off('disconnect', handlers.handleDisconnect);
      socketManager.disconnect();
    };
  }, [match?._id, matchDataId]);

  const teamsWithTotals = useMemo(() => {
    if (!localMatchData) return [] as Array<Team & { totalKills: number; total: number; totalDamage: number; totalAssists: number }>;
    return localMatchData.teams
      .map((team) => {
        const totalKills = team.players.reduce((sum, p) => sum + (Number(p.killNum) || 0), 0);
        const totalDamage = team.players.reduce((sum, p) => sum + (Number(p.damage) || 0), 0);
        const totalAssists = team.players.reduce((sum, p) => sum + (Number(p.assists) || 0), 0);
        const totakKnockouts = team.players.reduce((sum, p) => sum + (Number(p.knockouts) || 0), 0);
        return {
          ...team,
          totalKills,
          totalDamage,
          totalAssists,
          totakKnockouts,
          total: totalKills + (Number(team.placePoints) || 0),
        };
      })
      .filter((team) => Number(team.placePoints) === 10)
      .sort((a, b) => {
        if (b.placePoints !== a.placePoints) return (b.placePoints || 0) - (a.placePoints || 0);
        return (b.total || 0) - (a.total || 0);
      });
  }, [localMatchData, lastUpdateTime]);

  if (!localMatchData) {
    return (
      <div className="w-[1920px] h-[1080px] bg-black flex items-center justify-center">
        <div className="text-white text-2xl font-[Righteous]">No match data available</div>
      </div>
    );
  }

  return (
    <div className="w-[1920px] h-[1080px] relative overflow-hidden ">
      {/* Header */}
      <motion.div
        className="absolute z-10 text-center left-[600px] top-[0px] text-[5rem] font-bebas font-[300]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-white font-bold whitespace-pre text-[8rem]">BOOYAH SUMMARY</h1>
        {round && match && (
          <motion.p
            className="text-gray-300 text-[2rem] font-[Righteous] whitespace-pre p-[10px] mt-[-30px] w-[670px]"
            style={{ background: `linear-gradient(45deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})` }}
            animate={{ backgroundColor: ['rgba(255,0,0,0.25)', 'rgba(255,0,0,0.45)', 'rgba(255,0,0,0.25)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {`${round.roundName} - DAY${(round as any).day ? ` ${(round as any).day}` : ''} - ${match.matchName ? match.matchName : `Match ${match.matchNo || match._matchNo}`}`}
          </motion.p>
        )}
      </motion.div>

      {/* Teams */}
      <div className="absolute inset-x-0 top-[150px] px-10 w-full">
        {teamsWithTotals.length === 0 ? (
          <div className="text-center text-white font-[Righteous] text-3xl w-full h-full">
            No team with placement points 10
          </div>
        ) : (
          teamsWithTotals.map((team) => {
            const { totalKills, totalDamage, totalAssists } = team as any;
            return (
              <motion.div
                key={(team as any)._id || (team as any).teamId}
                className="flex justify-center items-center w-full h-[800px] mt-[130px] relative"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex w-full h-full ">
                  {team.players.slice(0, 4).map((player) => (
                    <div key={player._id} className="flex h-full w-[10000px]  relative">
                      <img
                        src={player.picUrl || "/def_char.png"}
                        alt={player.playerName}
                        className="object-cover h-[510px] absolute top-[180px] scale-150"
                      />
                    </div>
                  ))}

                  {/* Bottom gradient */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-[350px] w-[2120px]  left-[-200px]"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.99), rgba(0,0,0,0))', pointerEvents: 'none' }}
                  />

                  {/* Team info */}
                  <div className="w-[400px] h-[100px] absolute top-[620px] left-[560px] flex">
                    <div className="w-[350px] h-full bg-white">
                      <img src={team.teamLogo} alt="" className="w-full h-full" />
                    </div>
                    <div
                      style={{ background: `linear-gradient(45deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})` }}
                      className="w-[1000px] h-full text-[4rem] font-bebas text-white p-[10px] flex justify-center items-center"
                    >
                      {team.teamTag}
                    </div>
                    
<div className=' w-full bg-white h-full absolute top-[0px] left-[450px]'>
<div className='w-[150px] h-full text-[2rem] absolute  flex justify-center items-center'  style={{ background: `linear-gradient(45deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})` }}>

<span className='text-[4rem] absolute top-[10px]  font-bebas text-white flex justify-center items-center'> KILLS</span>

</div>
 <span className='text-[5rem] absolute top-[-5pxpx]  font-bebas text-black flex justify-center items-center left-[200px]'> {totalKills}</span>


</div>



        
        
                  </div>

                  {/* Team summary box */}
       
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WwcdSummary;
