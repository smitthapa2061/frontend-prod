import React, { useEffect, useState, useRef } from 'react';
import api from '../login/api.tsx';
import Polling from "./isPolling.tsx"
import { FaDiscord, FaWhatsapp } from 'react-icons/fa';

interface Tournament {
  _id: string;
  tournamentName: string;
}

interface Round {
  _id: string;
  roundName: string;
}

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
}

const DisplayHud: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [expandedTournaments, setExpandedTournaments] = useState<string[]>([]);
  const [roundsMap, setRoundsMap] = useState<Record<string, Round[]>>({});
  const [matchesMap, setMatchesMap] = useState<Record<string, Match[]>>({});
  const [expandedRounds, setExpandedRounds] = useState<Record<string, string | null>>({});
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string | null>>({});
  const [selectedScheduleMatches, setSelectedScheduleMatches] = useState<Record<string, string[]>>({});
  const [user, setUser] = useState<any>(null);
  const [pollingKey, setPollingKey] = useState(0); // Force re-render polling component
  // Theme selection per tournament
  const availableThemes = ['Theme1', 'Theme2-(freefire)'];
  const [selectedThemeMap, setSelectedThemeMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('selectedThemeMap');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const getSelectedTheme = (tournamentId: string) => selectedThemeMap[tournamentId] || 'Theme1';

  // --- Auth check ---
  const checkAuth = async () => {
    try {
      const { data } = await api.get("/users/me");
      setUser(data);
      return data;
    } catch {
      return null;
    }
  };

  // Fetch tournaments (user-specific)
  useEffect(() => {
    checkAuth();
    api.get('/tournaments')
      .then(res => setTournaments(res.data))
      .catch(() => setTournaments([]));
  }, []);

  // Fetch all selected matches for current user
  useEffect(() => {
    const fetchSelectedMatches = async () => {
      try {
        const res = await api.get('/matchSelection/selected');
        console.log('DisplayHud: Fetched selected matches:', res.data);
        const selectedMap: Record<string, string> = {};
        res.data.forEach((sel: any) => {
          const roundId = typeof sel.roundId === 'object' ? sel.roundId._id : sel.roundId;
          const key = `${sel.tournamentId}_${roundId}`;
          selectedMap[key] = sel.matchId;
          console.log(`DisplayHud: Setting selected match for ${key}: ${sel.matchId} (roundId: ${roundId})`);
        });
        setSelectedMatches(selectedMap);
        console.log('DisplayHud: Final selected matches map:', selectedMap);
      } catch (err) {
        console.error('Error fetching selected matches:', err);
      }
    };
    fetchSelectedMatches();
  }, []);

  // Persist selected theme per tournament
  useEffect(() => {
    try {
      localStorage.setItem('selectedThemeMap', JSON.stringify(selectedThemeMap));
    } catch {}
  }, [selectedThemeMap]);

  // Helper to open the match data viewer for a given graphic
  const openMatchDataViewer = (
    tournamentId: string,
    roundId: string,
    matchId: string,
    theme: string,
    view: string
  ) => {
    if (!matchId) return;
    // Use public route for OBS/browser sources
    const url = `/public/tournament/${tournamentId}/round/${roundId}/match/${matchId}?theme=${encodeURIComponent(theme)}&view=${encodeURIComponent(view)}&followSelected=true`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper to open the schedule viewer with selected matches
  const openScheduleViewer = (
    tournamentId: string,
    roundId: string,
    selectedMatchIds: string[],
    theme: string
  ) => {
    if (selectedMatchIds.length === 0) return;
    // For schedule view, we can pass the first match as the main match, but the component will use all matches
    const scheduleMatchesParam = selectedMatchIds.join(',');
    const url = `/public/tournament/${tournamentId}/round/${roundId}/match/${selectedMatchIds[0]}?theme=${encodeURIComponent(theme)}&view=Schedule&followSelected=true&scheduleMatches=${encodeURIComponent(scheduleMatchesParam)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleTournament = (tournamentId: string) => {
    if (expandedTournaments.includes(tournamentId)) {
      setExpandedTournaments(prev => prev.filter(id => id !== tournamentId));
      setExpandedRounds(prev => ({ ...prev, [tournamentId]: null }));
    } else {
      setExpandedTournaments(prev => [...prev, tournamentId]);
      if (!roundsMap[tournamentId]) {
        api.get(`/tournaments/${tournamentId}/rounds`)
          .then(res => setRoundsMap(prev => ({ ...prev, [tournamentId]: res.data })))
          .catch(() => setRoundsMap(prev => ({ ...prev, [tournamentId]: [] })));
      }
    }
  };

  const toggleRound = (tournamentId: string, roundId: string) => {
    const currentExpandedRound = expandedRounds[tournamentId];
    if (currentExpandedRound === roundId) {
      setExpandedRounds(prev => ({ ...prev, [tournamentId]: null }));
    } else {
      setExpandedRounds(prev => ({ ...prev, [tournamentId]: roundId }));

      const key = `${tournamentId}_${roundId}`;
      if (!matchesMap[key]) {
        api.get(`/tournaments/${tournamentId}/rounds/${roundId}/matches`)
          .then(res => setMatchesMap(prev => ({ ...prev, [key]: res.data })))
          .catch(() => setMatchesMap(prev => ({ ...prev, [key]: [] })));
      }
    }
  };

  // Match-specific selection (user-based)
  const onMatchCheckboxChange = async (
    tournamentId: string,
    roundId: string,
    matchId: string,
    checked: boolean
  ) => {
    const key = `${tournamentId}_${roundId}`;
    try {
      const res = await api.post('/matchSelection/select', {
        tournamentId,
        roundId,
        matchId
      });

      // Backend returns deselected if user unselected
      if (res.data.deselected) {
        setSelectedMatches(prev => ({ ...prev, [key]: null }));
      } else {
        setSelectedMatches(prev => ({ ...prev, [key]: matchId }));
      }

      // Force refresh the polling component when match changes
      setPollingKey(prev => prev + 1);
    } catch (err) {
      console.error('Error selecting/deselecting match:', err);
    }
  };

  // Schedule match selection (multiple matches for Schedule view)
  const onScheduleMatchCheckboxChange = (
    tournamentId: string,
    roundId: string,
    matchId: string,
    checked: boolean
  ) => {
    const key = `${tournamentId}_${roundId}`;
    setSelectedScheduleMatches(prev => {
      const current = prev[key] || [];
      if (checked) {
        return { ...prev, [key]: [...current, matchId] };
      } else {
        return { ...prev, [key]: current.filter(id => id !== matchId) };
      }
    });
  };

  return (
    <div style={{ background: '#f9f9f9', color: '#333', minHeight: '100vh' }}>
      <div className="bg-gray-800 text-white p-4 w-full h-[100px] flex flex-col items-center">
        <div className="flex justify-between items-center space-x-5 mb-4 relative top-[10px] w-full">
              <div className="absolute w-[60px] ml-[10px] mt-[5px]"><img src="https://res.cloudinary.com/dqckienxj/image/upload/v1760081339/scoresync_logo.jpg_hsz7qz.png" alt="logo" className="w-full h-full "/></div>
          <div></div>
          <div className="flex space-x-5 justify-center">
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="bg-white text-black font-medium text-[1rem] rounded-xl px-6 py-2 border-2 border-transparent"
            >
              TOURNAMENTS
            </button>
            <button
              onClick={() => window.open('/teams', '_blank', 'noopener,noreferrer')}
              className="bg-white text-black font-medium text-[1rem] rounded-xl px-6 py-2 border-2 border-transparent cursor-pointer hover:bg-gray-200 transition"
            >
              ADD TEAMS
            </button>
            <button
              onClick={() => window.open('/displayhud', '_blank', 'noopener,noreferrer')}
              className="bg-white text-black font-medium text-[1rem] rounded-xl px-6 py-2 border-2 border-transparent cursor-pointer hover:bg-gray-200 transition"
            >
              DISPLAY HUD
            </button>
          </div>
          <div className="text-right">
            {user && <span className="font-bold font-mono font-300 text-[1rem] text-right">ADMIN:{user.username}</span>}
            <div className="font-mono flex items-center ">HelpDesk<FaDiscord className="cursor-pointer  hover:text-red-700 text-[2rem] text-white" onClick={() => window.open('https://discord.com/channels/623776491682922526/1426117227257663558', '_blank')} /></div>
           
          </div>
        </div>
      </div>

      <Polling key={pollingKey} />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        {tournaments.map(t => (
          <div key={t._id} style={{ marginBottom: '1rem', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', padding: '1rem' }}>
            <div
              onClick={() => toggleTournament(t._id)}
              style={{ fontWeight: '600', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
            >
              <span>{t.tournamentName}</span>
            </div>

            {expandedTournaments.includes(t._id) && (
              <div style={{ padding: '0.5rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                  <span style={{ fontWeight: 600 }}>Theme:</span>
                  <select
                    value={getSelectedTheme(t._id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedThemeMap(prev => ({ ...prev, [t._id]: value }));
                    }}
                    style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
                  >
                    {availableThemes.map(th => (
                      <option key={th} value={th}>{th}</option>
                    ))}
                  </select>
                </div>
                {roundsMap[t._id]?.length ? roundsMap[t._id].map(r => {
                  const isRoundExpanded = expandedRounds[t._id] === r._id;
                  const key = `${t._id}_${r._id}`;
                  const selectedMatchId = selectedMatches[key];

                  return (
                    <div key={r._id} style={{ marginBottom: '1rem' }}>
                      <div
                        onClick={() => toggleRound(t._id, r._id)}
                        style={{ padding: '0.6rem 0.8rem', background: '#fff', borderRadius: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', userSelect: 'none', fontWeight: isRoundExpanded ? '700' : '500' }}
                      >
                        <span>{r.roundName}</span>
                        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>Round Name</span>
                      </div>

                      {isRoundExpanded && matchesMap[key]?.length > 0 && (
                        <div style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                          {/* Regular match selection */}
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Select Match for Live Views:</div>
                            {matchesMap[key].map((m, index) => (
                              <label key={m._id} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.8rem', background: '#f1f1f1', borderRadius: '4px', marginBottom: '0.3rem', fontSize: '0.95rem', cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedMatchId === m._id}
                                  onChange={e => onMatchCheckboxChange(t._id, r._id, m._id, e.target.checked)}
                                  style={{ marginRight: '0.8rem', cursor: 'pointer' }}
                                />
                                {m.matchName || `Match ${index + 1}`}
                              </label>
                            ))}
                          </div>

                          {/* Schedule match selection */}
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Select Matches for Schedule View:</div>
                            {matchesMap[key].map((m, index) => (
                              <label key={`schedule-${m._id}`} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.8rem', background: '#e8f4fd', borderRadius: '4px', marginBottom: '0.3rem', fontSize: '0.95rem', cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                  type="checkbox"
                                  checked={(selectedScheduleMatches[key] || []).includes(m._id)}
                                  onChange={e => onScheduleMatchCheckboxChange(t._id, r._id, m._id, e.target.checked)}
                                  style={{ marginRight: '0.8rem', cursor: 'pointer' }}
                                />
                                {m.matchName || `Match ${index + 1}`}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {isRoundExpanded && matchesMap[key]?.length === 0 && (
                        <div style={{ marginTop: '0.5rem', paddingLeft: '1rem', color: '#999' }}>No matches available</div>
                      )}

                      {isRoundExpanded && (
                        <div style={{ marginTop: '0.8rem' }}>
                          <div style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                            Selected match: {selectedMatchId ? (matchesMap[key]?.find((m2: any) => m2._id === selectedMatchId)?.matchName || `Match ${(matchesMap[key]?.find((m2: any) => m2._id === selectedMatchId)?.matchNo || matchesMap[key]?.find((m2: any) => m2._id === selectedMatchId)?._matchNo) || 'N/A'}`) : 'None'}
                          </div>
                          <div style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                            Selected schedule matches: {(selectedScheduleMatches[key] || []).length > 0 ? (selectedScheduleMatches[key] || []).map(matchId => matchesMap[key]?.find((m2: any) => m2._id === matchId)?.matchName || `Match ${(matchesMap[key]?.find((m2: any) => m2._id === matchId)?.matchNo || matchesMap[key]?.find((m2: any) => m2._id === matchId)?._matchNo) || 'N/A'}`).join(', ') : 'None'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {['MatchSummary','Lower','Upper','Dom','LiveStats','LiveFrags','Alerts','MatchData','MatchFragrs','CommingUpNext','OverAllData','OverallFrags','WwcdStats','WwcdSummary','playerH2H','TeamH2H','Champions','1stRunnerUp','2ndRunnerUp','EventMvp','ZoneClose'].map((viewName) => (
                              <button
                                key={viewName}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!selectedMatchId}
                                onClick={() =>
                                  selectedMatchId && openMatchDataViewer(t._id, r._id, selectedMatchId as string, getSelectedTheme(t._id), viewName)
                                }
                              >
                                {viewName}
                              </button>
                            ))}
                            <button
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={(selectedScheduleMatches[key] || []).length === 0}
                              onClick={() =>
                                openScheduleViewer(t._id, r._id, selectedScheduleMatches[key] || [], getSelectedTheme(t._id))
                              }
                            >
                              Schedule ({(selectedScheduleMatches[key] || []).length})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }) : <div style={{ padding: '0.5rem', fontSize: '0.9rem', color: '#777' }}>No rounds available</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DisplayHud;
