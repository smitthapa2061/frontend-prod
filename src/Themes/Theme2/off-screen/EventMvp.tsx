import React, { useEffect, useMemo, useState } from 'react';

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
  day?: string;
}

interface Player {
  _id: string;
  playerName: string;
  killNum?: number;
  damage?: number | string;
  assists?: number;
  knockouts?: number;
  picUrl?: string;
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
}

interface OverallData {
  tournamentId: string;
  roundId: string;
  userId: string;
  teams: Team[];
  createdAt: string;
}

interface EventMvpProps {
  tournament: Tournament;
  round?: Round | null;
}

const EventMvp: React.FC<EventMvpProps> = ({ tournament, round }) => {
  const [overallData, setOverallData] = useState<OverallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverall = async () => {
      if (!round) return;
      try {
        setLoading(true);
        const url = `https://backend-prod-530t.onrender.com/api/public/tournaments/${tournament._id}/rounds/${round._id}/overall`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: OverallData = await res.json();
        setOverallData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch overall data:', err);
        setError('Failed to load overall data');
        setOverallData(null);
      } finally {
        setLoading(false);
      }
    };

    if (tournament._id && round?._id) fetchOverall();
  }, [tournament._id, round?._id]);

  const mvp = useMemo(() => {
    if (!overallData) return null;
    const allPlayers = overallData.teams.flatMap(team =>
      team.players.map(p => ({
        ...p,
        killNum: Number(p.killNum || 0),
        numericDamage: Number((p as any).damage ?? 0) || 0,
        assists: Number((p as any).assists ?? 0) || 0,
        knockouts: Number((p as any).knockouts ?? 0) || 0,
        teamTag: team.teamTag,
        teamName: team.teamName,
        teamLogo: team.teamLogo,
      }))
    );

    if (allPlayers.length === 0) return null;

    allPlayers.sort((a: any, b: any) => {
      if (b.killNum !== a.killNum) return b.killNum - a.killNum; // primary: kills
      if (b.numericDamage !== a.numericDamage) return b.numericDamage - a.numericDamage; // tie: damage
      if (b.assists !== a.assists) return b.assists - a.assists; // tie: assists
      return 0;
    });

    return allPlayers[0];
  }, [overallData]);

  if (loading) {
    return (
      <div className="w-[1920px] h-[1080px] flex items-center justify-center">
        <div className="text-white text-2xl font-[Righteous]">Loading...</div>
      </div>
    );
  }

  if (error || !overallData || !mvp) {
    return (
      <div className="w-[1920px] h-[1080px] flex items-center justify-center">
        <div className="text-white text-2xl font-[Righteous]">{error || 'No overall data available'}</div>
      </div>
    );
  }

  return (
    <div className="w-[1920px] h-[1080px] relative  text-white ">
      {/* Header */}
      <div className="absolute top-[80px] left-[80px] flex">
        <div 
          style={{
            backgroundImage: `linear-gradient(to left, transparent, ${tournament.primaryColor})`,
            clipPath: "polygon(30px 0%, 100% 0%, 100% 100%, 30px 100%, 0% 50%)",
          }}
          className="text-[2rem] font-[Righteous] pl-[40px] flex items-center h-[70px] mt-[10px] ml-[50px]">
          <span className='text-yellow-300 pr-[10px]'> EVENT MVP</span> OF {tournament.tournamentName} -  {round?.roundName}
        </div>
      </div>

      {/* Center banner with MVP name and team logo */}
      <div className='absolute top-[750px] left-[70px] flex justify-center w-full h-full z-10'>
        <div
          style={{
            background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`,
          }}
          className='bg-white w-[700px] h-[120px] skew-x-[20deg]'>
          <div className='bg-white w-[25%] h-full'></div>
        </div>

        <div className='font-bebas font-[300] text-[3rem] absolute top-[-10px] left-[640px]'>
          <img src={mvp.teamLogo} alt={mvp.teamTag} className='w-[20%] object-contain'/>
        </div>
        <div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[840px] text-white'>
          {mvp.playerName}
        </div>
      </div>

      {/* MVP Player Image in Center */}
      <div className="flex justify-center items-center relative top-[120px]">
        <img
          src={mvp.picUrl || 'https://res.cloudinary.com/dqckienxj/image/upload/v1735718663/defult_chach_apsjhc_jydubc.png'}
          alt={mvp.playerName}
          className="h-[900px] object-contain"
        />
      </div>

      {/* Bottom stat bars - 4 boxes */}
      <div className="w-full h-full">
        <div
          style={{
            background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`,
          }}
          className="w-full h-[40%] absolute top-[900px] z-10">

          <div className='absolute top-[30px] left-[70px]'>
            <div className='bg-white w-[400px] h-[100px] skew-x-[20deg]'>
              <div className='bg-black w-[40%] h-full'></div>
            </div>
            <div className='font-bebas font-[300] text-[3rem] absolute top-[20px] left-[30px]'>KILLS</div>
            <div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[200px] text-black'>{mvp.killNum || 0}</div>
          </div>

          <div className='absolute top-[30px] left-[530px]'>
            <div className='bg-white w-[400px] h-[100px] skew-x-[20deg]'>
              <div className='bg-black w-[40%] h-full'></div>
            </div>
            <div className='font-bebas font-[300] text-[3rem] absolute top-[20px] left-[20px]'>DAMAGE</div>
            <div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[200px] text-black'>{(mvp as any).numericDamage || 0}</div>
          </div>

          <div className='absolute top-[30px] left-[1000px]'>
            <div className='bg-white w-[400px] h-[100px] skew-x-[20deg]'>
              <div className='bg-black w-[40%] h-full'></div>
            </div>
            <div className='font-bebas font-[300] text-[2.5rem] absolute top-[25px] left-[10px]'>KNOCKOUTS</div>
            <div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[200px] text-black'>{(mvp as any).knockouts || 0}</div>
          </div>

          <div className='absolute top-[30px] left-[1450px]'>
            <div className='bg-white w-[400px] h-[100px] skew-x-[20deg]'>
              <div className='bg-black w-[40%] h-full'></div>
            </div>
            <div className='font-bebas font-[300] text-[3rem] absolute top-[20px] left-[20px]'>ASSISTS</div>
            <div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[200px] text-black'>{mvp.assists || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventMvp;
