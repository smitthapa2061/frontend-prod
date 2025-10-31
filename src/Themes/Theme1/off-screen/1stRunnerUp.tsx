import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../login/api.tsx';

interface Tournament {
  _id: string;
  tournamentName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface Round {
  _id: string;
  roundName: string;
}

interface Player {
  _id: string;
  playerName: string;
  killNum?: number;
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

interface RunnerUpProps {
  tournament: Tournament;
  round?: Round | null;
  overallData?: any;
}

const FirstRunnerUp: React.FC<RunnerUpProps> = ({ tournament, round, overallData: propOverallData }) => {
  const [overallData, setOverallData] = useState<OverallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propOverallData) {
      setOverallData(propOverallData);
      setLoading(false);
    } else {
      const fetchOverall = async () => {
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

          // Try to get overall data, but don't fail if it doesn't exist
          try {
            const overallUrl = `/public/tournaments/${tournament._id}/rounds/${round._id}/overall`;
            const overallResponse = await api.get(overallUrl);
            Object.assign(data, overallResponse.data);
          } catch (overallError) {
            console.log('Overall data not available, using empty data structure');
          }

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
    }
  }, [tournament._id, round?._id, propOverallData]);

  const second = useMemo(() => {
    if (!overallData) return null;

    const enriched = overallData.teams.map(team => {
      const totalKills = team.players.reduce((sum, p) => sum + Number(p.killNum || 0), 0);
      const total = Number(team.placePoints || 0) + totalKills;
      return { ...team, total, totalKills } as Team & { total: number; totalKills: number };
    });

    enriched.sort((a, b) => b.total - a.total);

    return enriched[1] || null;
  }, [overallData]);

  if (loading) {
    return (
      <div className="w-[1920px] h-[1080px] flex items-center justify-center">
        <div className="text-white text-2xl font-[Righteous]">Loading...</div>
      </div>
    );
  }

  if (error || !overallData || !second) {
    return (
      <div className="w-[1920px] h-[1080px] flex items-center justify-center">
        <div className="text-white text-2xl font-[Righteous]">{error || 'Not enough data'}</div>
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
        className="text-[2rem] font-[Righteous] pl:[40px] pl-[40px] flex items-center h-[70px] mt-[10px] ml-[50px]">
        <span className='text-yellow-300 pr-[10px]'> 1ST RUNNER-UP</span> OF {tournament.tournamentName} -  {round?.roundName}
        </div>
      </div>

      <div 
      
      className='absolute top-[750px] left-[70px] flex justify-center w-full h-full z-10'>
<div
 style={{

    background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`,
    
    
    }}
className='bg-white w-[700px] h-[120px] skew-x-[20deg]'>
<div className='bg-white w-[25%] h-full'>
</div>

</div>
<div className='font-bebas font-[300] text-[3rem] absolute top-[-10px] left-[640px]' >
    
    <img src={second.teamLogo} alt="" className='w-[20%]'/>
    
    </div>
<div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[840px] text-white ' > 
   {second.teamName}
    </div>
</div>
 {/* Players Grid */}
 <div className="">
          
 <div 
   
 className="grid grid-cols-4 w-full h-full">
 <div  style={{

background: `linear-gradient(135deg, ${tournament.primaryColor || '#000'}, ${tournament.secondaryColor || '#333'})`,


}} className="w-full h-[20%] absolute top-[900px] z-10" >


<div className='absolute top-[30px] left-[70px]'>
<div className='bg-white w-[400px] h-[100px] skew-x-[20deg]'>
<div className='bg-black w-[40%] h-full'>
</div>

</div>
<div className='font-bebas font-[300] text-[3rem] absolute top-[20px] left-[30px]' >WWCD</div>
<div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[200px] text-black ' > 
    <div className='flex items-center'>
    
    <img src="/chicken.png" alt="" className='w-[70px] h-[70px] mr-[10px] mb-[10px]'/> x {second.wwcd || 0}</div>
    </div>
</div>
<div className='absolute top-[30px] left-[530px]'>
<div className='bg-white w-[400px] h-[100px] skew-x-[20deg]'>
<div className='bg-black w-[40%] h-full'>
</div>

</div>
<div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[20px]' >PLACE</div>
<div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[200px] text-black ' >{second.placePoints || 0} PTS </div>
</div>
<div className='absolute top-[30px] left-[1000px]'>
<div className='bg-white w-[400px] h-[100px] skew-x-[20deg]'>
<div className='bg-black w-[40%] h-full'>
</div>

</div>



<div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[30px]' >KILLS</div>
<div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[200px] text-black ' >{(second as any).totalKills || 0} PTS </div>
</div>
<div className='absolute top-[30px] left-[1450px]  '>
<div className='bg-white w-[400px] h-[100px] skew-x-[20deg] '>
<div className='bg-black w-[40%] h-full'>
</div>

</div>
<div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[30px]' >TOTAL</div>
<div className='font-bebas font-[300] text-[4rem] absolute top-[10px] left-[200px] text-black ' >{(second as any).total || 0} PTS </div>

</div>
</div>
  {second.players.slice(0,4).map((p) => (
    <div key={p._id} className="flex flex-col items-center m-[-150px] relative top-[420px]">
    <div 
  
    className='w-full relative  top-[200px] '></div>
      <img
        src={
          p.picUrl ||
          'https://res.cloudinary.com/dqckienxj/image/upload/v1735718663/defult_chach_apsjhc_jydubc.png'
        }
        alt={p.playerName}
        className="w-full h-full object-cover m-0 p-0"
      />
    </div>
  ))}
</div>

            </div>
     
    </div>
  );
};

export default FirstRunnerUp;
