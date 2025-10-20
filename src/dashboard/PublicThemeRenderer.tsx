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

// Theme2 imports
import Lower2 from '../Themes/Theme2/on-screen/Lower.tsx';
import Upper2 from '../Themes/Theme2/on-screen/Upper.tsx';
import Dom2 from '../Themes/Theme2/on-screen/Dom.tsx';
import Alerts2 from '../Themes/Theme2/on-screen/Alerts.tsx';
import LiveStats2 from '../Themes/Theme2/on-screen/LiveStats.tsx';
import LiveFrags2 from '../Themes/Theme2/on-screen/LiveFrags.tsx';
import MatchData2 from '../Themes/Theme2/off-screen/MatchData.tsx';
import MatchFragrs2 from '../Themes/Theme2/off-screen/MatchFragrs.tsx';
import WwcdSummary2 from '../Themes/Theme2/off-screen/WwcdSummary.tsx';
import WwcdStats2 from '../Themes/Theme2/off-screen/WwcdStats.tsx'
import OverallData2 from   '../Themes/Theme2/off-screen/OverAllData.tsx'
import OverallFrags2 from '../Themes/Theme2/off-screen/OverallFrags.tsx'
import Schedule2 from '../Themes/Theme2/off-screen/Schedule.tsx'
import CommingUpNext2 from '../Themes/Theme2/off-screen/CommingUpNext.tsx'
import Champions2 from '../Themes/Theme2/off-screen/Champions.tsx'
import FirstRunnerUp2 from '../Themes/Theme2/off-screen/1stRunnerUp.tsx'
import SecondRunnerUp2 from '../Themes/Theme2/off-screen/2ndRunnerUp.tsx'
import EventMvp2 from '../Themes/Theme2/off-screen/EventMvp.tsx'
import MatchSummary2 from '../Themes/Theme2/off-screen/MatchSummary.tsx'
import PlayerH2H2 from '../Themes/Theme2/off-screen/playerh2h.tsx'
import TeamH2H2 from '../Themes/Theme2/off-screen/teamh2h.tsx'


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

  const isTheme1 = theme === 'Theme1';
  const LowerComp = isTheme1 ? Lower : Lower2;
  const UpperComp = isTheme1 ? Upper : Upper2;
  const DomComp = isTheme1 ? Dom : Dom2;
  const AlertsComp = isTheme1 ? Alerts : Alerts2;
  const LiveStatsComp = isTheme1 ? LiveStats : LiveStats2;
  const LiveFragsComp = isTheme1 ? LiveFrags : LiveFrags2;
  const MatchDataComp = isTheme1 ? MatchData : MatchData2;
  const MatchFragrsComp = isTheme1 ? MatchFragrs : MatchFragrs2;
  const WwcdSummaryComp = isTheme1 ? WwcdSummary : WwcdSummary2;
  const WwcdStatsComp = isTheme1 ? WwcdStats : WwcdStats2;
  const OverallDataComp = isTheme1 ? OverallData : OverallData2;
  const OverallFragsComp = isTheme1 ? OverallFrags : OverallFrags2;
  const ScheduleComp = isTheme1 ? Schedule : Schedule2;
  const CommingUpNextComp = isTheme1 ? CommingUpNext : CommingUpNext2;
  const ChampionsComp = isTheme1 ? Champions : Champions2;
  const FirstRunnerUpComp = isTheme1 ? FirstRunnerUp : FirstRunnerUp2;
  const SecondRunnerUpComp = isTheme1 ? SecondRunnerUp : SecondRunnerUp2;
  const EventMvpComp = isTheme1 ? EventMvp : EventMvp2;
  const MatchSummaryComp = isTheme1 ? MatchSummary : MatchSummary2;
  const PlayerH2HComp = isTheme1 ? PlayerH2H : PlayerH2H2;
  const TeamH2HComp = isTheme1 ? TeamH2H : TeamH2H2;

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
        const tournamentResponse = await fetch(`http://localhost:3000/api/public/tournaments/${tournamentId}`);
        if (!tournamentResponse.ok) {
          throw new Error('Failed to fetch tournament data');
        }
        const tournamentData = await tournamentResponse.json();
        setTournament(tournamentData);

        // Fetch round data
        const roundResponse = await fetch(`http://localhost:3000/api/public/tournaments/${tournamentId}/rounds/${roundId}`);
        if (!roundResponse.ok) {
          throw new Error('Failed to fetch round data');
        }
        const roundData = await roundResponse.json();
        setRound(roundData);

        // Optionally resolve selected matchId on refresh if followSelected is true
        let effectiveMatchId = matchId;
        if (followSelected) {
          try {
            const selRes = await fetch(`http://localhost:3000/api/public/tournaments/${tournamentId}/rounds/${roundId}/selected-match`);
            if (selRes.ok) {
              const selJson = await selRes.json();
              if (selJson?.matchId) effectiveMatchId = selJson.matchId;
            }
          } catch {}
        }

        // Fetch match data
        const matchResponse = await fetch(`http://localhost:3000/api/public/matches/${effectiveMatchId}`);
        if (!matchResponse.ok) {
          throw new Error('Failed to fetch match data');
        }
        const matchDataFetched = await matchResponse.json();
        setMatch(matchDataFetched);

        // Fetch matchData
        const matchDataResponse = await fetch(`http://localhost:3000/api/public/matches/${effectiveMatchId}/matchdata`);
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
        return <LowerComp tournament={tournament} round={round} match={match} />;
      case 'Upper':
        return <UpperComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'Dom':
        return <DomComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'Alerts':
        return <AlertsComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'LiveStats':
        return <LiveStatsComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'LiveFrags':
        return <LiveFragsComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'MatchData':
        return <MatchDataComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'MatchFragrs':
        return <MatchFragrsComp tournament={tournament} round={round} match={match} matchData={matchData} />;
      case 'WwcdSummary':
        return <WwcdSummaryComp tournament={tournament} round={round} match={match} matchData={matchData} />;
        case 'WwcdStats':
          return <WwcdStatsComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'OverAllData':
          return <OverallDataComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'OverallFrags':
        return <OverallFragsComp tournament={tournament} round={round} />
        case 'Schedule':
        return <ScheduleComp tournament={tournament} round={round} />
        case 'CommingUpNext':
        return <CommingUpNextComp tournament={tournament} round={round} match={match} />
        case 'Champions':
          return <ChampionsComp tournament={tournament} round={round}  />
        case '1stRunnerUp':
          return <FirstRunnerUpComp tournament={tournament} round={round} />
        case '2ndRunnerUp':
          return <SecondRunnerUpComp tournament={tournament} round={round} />
        case 'EventMvp':
          return <EventMvpComp tournament={tournament} round={round} />
        case 'MatchSummary':
          return <MatchSummaryComp tournament={tournament} round={round} match={match} />
        case 'playerH2H':
          return <PlayerH2HComp tournament={tournament} round={round} match={match} />
        case 'TeamH2H':
          return <TeamH2HComp tournament={tournament} round={round} match={match} />
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
