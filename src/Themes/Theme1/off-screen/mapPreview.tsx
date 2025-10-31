import React from 'react';

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

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
}

interface MatchData {
  _id: string;
  matchId: string;
  userId: string;
  teams: any[];
}

interface MapPreviewProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
}

const MapPreview: React.FC<MapPreviewProps> = ({ tournament, round, match, matchData }) => {
  const teams = matchData?.teams || [];

  return (
  <div className='bg-green-500 w-[1920px] h-[1080px]'>

    <div className='w-[100%] h-[100%] flex'>
        <div className='w-[25%] h-[100%] flex flex-col items-center justify-center p-4'>
          {teams[0] && (
            <>
              {teams[0].logo && <img src={teams[0].logo} alt={teams[0].teamFullName} className='w-20 h-20 mb-4 object-contain' />}
              <h3 className='text-white text-xl font-bold mb-2'>{teams[0].teamFullName} ({teams[0].teamTag})</h3>
              <ul className='text-white text-sm'>
                {teams[0].players?.map((player: any) => (
                  <li key={player._id || player.playerName} className='mb-1'>{player.playerName}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className=' w-[50%] h-[100%] border-white border-[10px] border-solid'>

        </div>
        <div className='w-[25%] h-[100%] flex flex-col items-center justify-center p-4'>
          {teams[1] && (
            <>
              {teams[1].logo && <img src={teams[1].logo} alt={teams[1].teamFullName} className='w-20 h-20 mb-4 object-contain' />}
              <h3 className='text-white text-xl font-bold mb-2'>{teams[1].teamFullName} ({teams[1].teamTag})</h3>
              <ul className='text-white text-sm'>
                {teams[1].players?.map((player: any) => (
                  <li key={player._id || player.playerName} className='mb-1'>{player.playerName}</li>
                ))}
              </ul>
            </>
          )}
        </div>
    </div>
  </div>
  );
};

export default MapPreview;