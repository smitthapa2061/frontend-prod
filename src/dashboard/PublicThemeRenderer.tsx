import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../login/api.tsx';

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
import ZoneClose from '../Themes/Theme1/on-screen/zoneClose.tsx'
import Intro from '../Themes/Theme1/on-screen/intro.tsx'
import MapPreview from '../Themes/Theme1/off-screen/mapPreview.tsx'

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
import ZoneClose2 from '../Themes/Theme2/on-screen/zoneClose.tsx'


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
   matchId: string;
   userId: string;
   teams: any[];
}

interface OverallData {
  tournamentId: string;
  roundId: string;
  userId: string;
  teams: any[];
  createdAt: string;
}

interface MatchData {
   _id: string;
   matchId: string;
   userId: string;
   teams: any[];
}

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
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
  const selectedScheduleMatchIds = searchParams.get('scheduleMatches')?.split(',') || [];

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
  const ZoneCloseComp = isTheme1 ? ZoneClose : ZoneClose2;
  const IntroComp = Intro; // Intro is only in Theme1 for now
  const MapPreviewComp = MapPreview; // MapPreview is only in Theme1 for now

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [overallData, setOverallData] = useState<OverallData | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchDatas, setMatchDatas] = useState<MatchData[]>([]);
  const [selectedScheduleMatches, setSelectedScheduleMatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!tournamentId || !roundId) return;

      try {
        setLoading(true);

        // Determine what data is needed based on the view
        const needsOverallData = ['OverAllData', 'LiveStats', '1stRunnerUp', '2ndRunnerUp', 'EventMvp'].includes(view);
        const needsMatches = ['OverAllData', 'Schedule'].includes(view);
        const needsMatchDatas = ['OverAllData', 'Schedule'].includes(view);
        const needsMatchData = ['Upper', 'Dom', 'Alerts', 'LiveStats', 'LiveFrags', 'MatchData', 'MatchFragrs', 'WwcdSummary', 'WwcdStats', 'playerH2H', 'intro', 'mapPreview'].includes(view);

        // Always fetch basic data
        const basePromises: Promise<any>[] = [
          api.get(`public/tournaments/${tournamentId}`),
          api.get(`public/tournaments/${tournamentId}/rounds/${roundId}`),
        ];

        if (followSelected) {
          basePromises.push(api.get(`public/tournaments/${tournamentId}/rounds/${roundId}/selected-match`).catch(() => null));
        }

        if (needsMatches) {
          basePromises.push(api.get(`public/rounds/${roundId}/matches`));
        }

        const baseResults = await Promise.all(basePromises);
        const tournamentData = baseResults[0].data;
        setTournament(tournamentData);

        const roundData = baseResults[1].data;
        setRound(roundData);

        let selectedMatchResponse = null;
        let matchesResponse = null;

        if (followSelected) {
          selectedMatchResponse = baseResults[2];
        }

        if (needsMatches) {
          matchesResponse = baseResults[followSelected ? 3 : 2];
        }

        // Resolve effective matchId
        let effectiveMatchId = matchId;
        if (followSelected && selectedMatchResponse?.data?.matchId) {
          effectiveMatchId = selectedMatchResponse.data.matchId;
        }

        // Fetch match-specific data
        const matchPromises: Promise<any>[] = [api.get(`public/matches/${effectiveMatchId}`)];
        if (needsMatchData) {
          matchPromises.push(api.get(`public/matches/${effectiveMatchId}/matchdata`).catch(() => null));
        }

        const matchResults = await Promise.all(matchPromises);
        const matchDataFetched = matchResults[0].data;
        setMatch(matchDataFetched);

        if (needsMatchData && matchResults[1]) {
          setMatchData(matchResults[1].data);
        }

        // Fetch additional data in parallel
        const additionalPromises: Promise<any>[] = [];

        if (needsOverallData) {
          additionalPromises.push(api.get(`public/tournaments/${tournamentId}/rounds/${roundId}/overall`).catch(() => null));
        }

        if (needsMatchDatas && matchesResponse) {
          const matchesData = matchesResponse.data;
          setMatches(matchesData);
          additionalPromises.push(
            ...matchesData.map((match: Match) =>
              api.get(`public/matches/${match._id}/matchdata`).catch(() => null)
            )
          );
        }

        if (additionalPromises.length > 0) {
          const additionalResults = await Promise.all(additionalPromises);

          if (needsOverallData) {
            const overallResponse = additionalResults.shift();
            if (overallResponse) {
              setOverallData(overallResponse.data);
            }
          }

          if (needsMatchDatas) {
            const validMatchDatas = additionalResults.filter(result => result !== null).map(result => result.data);
            setMatchDatas(validMatchDatas);
          }
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
  }, [tournamentId, roundId, matchId, followSelected, view]);

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
        return <LiveStatsComp tournament={tournament} round={round} match={match} matchData={matchData} overallData={overallData} />;
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
          return <OverallDataComp tournament={tournament} round={round} match={match} matchData={matchData} overallData={overallData} matches={matches} matchDatas={matchDatas} />
        case 'OverallFrags':
        return <OverallFragsComp tournament={tournament} round={round} />
        case 'Schedule':
        return <ScheduleComp tournament={tournament} round={round} matches={matches} matchDatas={matchDatas} selectedScheduleMatches={selectedScheduleMatchIds} />
        case 'CommingUpNext':
        return <CommingUpNextComp tournament={tournament} round={round} match={match} />
        case 'Champions':
          return <ChampionsComp tournament={tournament} round={round}  />
        case '1stRunnerUp':
          return <FirstRunnerUpComp tournament={tournament} round={round} overallData={overallData} />
        case '2ndRunnerUp':
          return <SecondRunnerUpComp tournament={tournament} round={round} overallData={overallData} />
        case 'EventMvp':
          return <EventMvpComp tournament={tournament} round={round} overallData={overallData} />
        case 'MatchSummary':
          return <MatchSummaryComp tournament={tournament} round={round} match={match} />
        case 'playerH2H':
          return <PlayerH2HComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'TeamH2H':
          return <TeamH2HComp tournament={tournament} round={round} match={match} />
        case 'ZoneClose':
          return <ZoneCloseComp tournament={tournament} round={round} match={match} />
        case 'intro':
          return <IntroComp tournament={tournament} round={round} match={match} matchData={matchData} />
        case 'mapPreview':
          return <MapPreviewComp tournament={tournament} round={round} match={match} matchData={matchData} />
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
      height: '1400px',
 
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

