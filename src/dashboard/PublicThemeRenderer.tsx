import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

// Import theme components
import Lower from '../Themes/Theme1/on-screen/Lower.tsx';
import Upper from '../Themes/Theme1/on-screen/Upper.tsx';
import Dom from '../Themes/Theme1/on-screen/Dom.tsx';
import Alerts from '../Themes/Theme1/on-screen/Alerts.tsx';
import LiveStats from '../Themes/Theme1/on-screen/LiveStats.tsx';
import LiveFrags from '../Themes/Theme1/on-screen/LiveFrags.tsx';
import MatchData from '../Themes/Theme1/off-screen/MatchData.tsx';
import MatchFragrs from '../Themes/Theme1/off-screen/MatchFragrs.tsx';
import WwcdSummary from '../Themes/Theme1/off-screen/WwcdSummary.tsx';
import WwcdStats from '../Themes/Theme1/off-screen/WwcdStats.tsx'
import OverallData from   '../Themes/Theme1/off-screen/OverAllData.tsx'
import OverallFrags from '../Themes/Theme1/off-screen/OverallFrags.tsx'
import Schedule from '../Themes/Theme1/off-screen/Schedule.tsx'
import CommingUpNext from '../Themes/Theme1/off-screen/CommingUpNext.tsx'
import Champions from '../Themes/Theme1/off-screen/Champions.tsx'
import FirstRunnerUp from '../Themes/Theme1/off-screen/1stRunnerUp.tsx'
import SecondRunnerUp from '../Themes/Theme1/off-screen/2ndRunnerUp.tsx'
import EventMvp from '../Themes/Theme1/off-screen/EventMvp.tsx'
import MatchSummary from '../Themes/Theme1/off-screen/MatchSummary.tsx'
import PlayerH2H from '../Themes/Theme1/off-screen/playerh2h.tsx'
import TeamH2H from '../Themes/Theme1/off-screen/teamh2h.tsx'


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
  day: string;
}

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
}

interface MatchData {
  _id: string;
  teams: any[];
}

const PublicThemeRenderer: React.FC = () => {
  const { tournamentId, roundId, matchId } = useParams<{
    tournamentId: string;
    roundId: string;
    matchId: string;
  }>();
  const [searchParams] = useSearchParams();
  const theme = searchParams.get('theme') || 'Theme1';
  const view = searchParams.get('view') || 'Lower';
  const followSelected = (searchParams.get('followSelected') || 'false').toLowerCase() === 'true';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!tournamentId || !roundId) return;

      try {
        setLoading(true);

        // Use direct fetch to bypass authentication for public access
        const tournamentResponse = await fetch(`https://backend-prod-530t.onrender.com/api/public/tournaments/${tournamentId}`);
        if (!tournamentResponse.ok) {
          throw new Error('Failed to fetch tournament data');
        }
        const tournamentData = await tournamentResponse.json();
        setTournament(tournamentData);

        // Fetch round data
        const roundResponse = await fetch(`https://backend-prod-530t.onrender.com/api/public/tournaments/${tournamentId}/rounds/${roundId}`);
        if (!roundResponse.ok) {
          throw new Error('Failed to fetch round data');
        }
        const roundData = await roundResponse.json();
        setRound(roundData);

        // Optionally resolve selected matchId on refresh if followSelected is true
        let effectiveMatchId = matchId;
        if (followSelected) {
          try {
            const selRes = await fetch(`https://backend-prod-530t.onrender.com/api/public/tournaments/${tournamentId}/rounds/${roundId}/selected-match`);
            if (selRes.ok) {
              const selJson = await selRes.json();
              if (selJson?.matchId) effectiveMatchId = selJson.matchId;
            }
          } catch {}
        }

        // Fetch match data
        const matchResponse = await fetch(`https://backend-prod-530t.onrender.com/api/public/matches/${effectiveMatchId}`);
        if (!matchResponse.ok) {
          throw new Error('Failed to fetch match data');
        }
        const matchDataFetched = await matchResponse.json();
        setMatch(matchDataFetched);

        // Fetch matchData
        const matchDataResponse = await fetch(`https://backend-prod-530t.onrender.com/api/public/matches/${effectiveMatchId}/matchdata`);
        if (matchDataResponse.ok) {
          const matchDataJson = await matchDataResponse.json();
          setMatchData(matchDataJson);
        }

        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tournamentId, roundId, matchId]);

  const renderView = () => {
    if (loading) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
       
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          Loading...
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
         
          color: '#ff0000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          {error}
        </div>
      );
    }

    if (!tournament) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
  
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          No tournament data found
        </div>
      );
    }

    // Pass tournament data to the appropriate component
    switch (view) {
      case 'Lower':
        return <Lower tournament={tournament} round={round} match={match} />;
      case 'Upper':
        return <Upper tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'Dom':
        return <Dom tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'Alerts':
        return <Alerts tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'LiveStats':
        return <LiveStats tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'LiveFrags':
        return <LiveFrags tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'MatchData':
        return <MatchData tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'MatchFragrs':
        return <MatchFragrs tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'WwcdSummary':
        return <WwcdSummary tournament={tournament} round={round} match={match} matchData={matchData} />;
        case 'WwcdStats':
          return <WwcdStats tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'OverAllData':
          return <OverallData tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'OverallFrags':
        return <OverallFrags tournament={tournament} round={round} />
        case 'Schedule':
        return <Schedule tournament={tournament} round={round} />
        case 'CommingUpNext':
        return <CommingUpNext tournament={tournament} round={round} match={match} />
        case 'Champions':
          return <Champions tournament={tournament} round={round}  />
        case '1stRunnerUp':
          return <FirstRunnerUp tournament={tournament} round={round} />
        case '2ndRunnerUp':
          return <SecondRunnerUp tournament={tournament} round={round} />
        case 'EventMvp':
          return <EventMvp tournament={tournament} round={round} />
        case 'MatchSummary':
          return <MatchSummary tournament={tournament} round={round} match={match} />
        case 'playerH2H':
          return <PlayerH2H tournament={tournament} round={round} match={match} />
        case 'TeamH2H':
          return <TeamH2H tournament={tournament} round={round} match={match} />
      default:
        return (
          <div style={{
            width: '100%',
            height: '100%',

            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            View "{view}" not implemented yet.
          </div>
        );
    }
  };

  return (
    <div style={{
      width: '1920px',
      height: '1080px',
 
      top: 0,
      left: 0,
      margin: 0,
      padding: 0,
      overflow: 'hidden',
  
    }}>
      {renderView()}
    </div>
  );
};

export default PublicThemeRenderer;
