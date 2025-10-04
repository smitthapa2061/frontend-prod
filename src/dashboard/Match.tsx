import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../login/api.tsx'; // <-- your axios instance

interface Match {
  _id: string;
  matchNo: number;
  time: string;
  map: string;
  groups?: {
    _id: string;
    groupName: string;
    slots?: {
      _id: string;
      slot: number;
      team: {
        _id: string;
        teamFullName: string;
      };
    }[];
  }[];
}

interface GroupData {
  _id: string;
  groupName: string;
  slots?: {
    _id: string;
    slot: number;
    team: {
      _id: string;
      teamFullName: string;
    };
  }[];
}

const Match: React.FC = () => {
  const { tournamentId, roundId } = useParams<{ tournamentId: string; roundId: string }>();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMatchNo, setNewMatchNo] = useState<number>(1);
  const [newTime, setNewTime] = useState<string>('00:00');
  const [newMap, setNewMap] = useState<string>('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const [editMatchId, setEditMatchId] = useState<string | null>(null);
  const [editMatchNo, setEditMatchNo] = useState<number>(1);
  const [editTime, setEditTime] = useState<string>('00:00');
  const [editMap, setEditMap] = useState<string>('');

  // ---- Cache refs ----
  const matchesCache = useRef<Record<string, Match[]>>({});
  const groupsCache = useRef<Record<string, GroupData[]>>({});

  const to24HourFormat = (time: string) => {
    if (!time) return '00:00';
    if (!time.includes('AM') && !time.includes('PM')) return time;
    const [t, modifier] = time.split(' ');
    let [hours, minutes] = t.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const fetchData = async () => {
    if (!tournamentId || !roundId) return;
    const cacheKey = `${tournamentId}-${roundId}`;
    setLoading(true);

    // Check cache first
    if (matchesCache.current[cacheKey]) {
      setMatches(matchesCache.current[cacheKey]);
      if (groupsCache.current[tournamentId]) {
        setGroups(groupsCache.current[tournamentId]);
      }
      setLoading(false);
      return;
    }

    try {
      const matchesPromise = api.get(`/tournaments/${tournamentId}/rounds/${roundId}/matches`);
      const groupsPromise = groupsCache.current[tournamentId]
        ? Promise.resolve({ data: groupsCache.current[tournamentId] })
        : api.get(`/tournaments/${tournamentId}/groups`);

      const [matchesRes, groupsRes] = await Promise.all([matchesPromise, groupsPromise]);

      setMatches(matchesRes.data);
      setGroups(groupsRes.data);

      // Save to cache
      matchesCache.current[cacheKey] = matchesRes.data;
      groupsCache.current[tournamentId] = groupsRes.data;

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tournamentId, roundId]);

  // ----- Add Match -----
  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMap.trim()) return alert('Please enter the map name.');
    if (!newTime) return alert('Please enter a valid time.');
    if (selectedGroupIds.length === 0) return alert('Select at least one group.');

    try {
      const res = await api.post(`/tournaments/${tournamentId}/rounds/${roundId}/matches`, {
        matchNo: newMatchNo,
        time: newTime,
        map: newMap.trim(),
        groupIds: selectedGroupIds,
      });

      const addedMatch = {
        ...res.data.match,
        groups: groups.filter((g) => selectedGroupIds.includes(g._id)),
      };

      setMatches((prev) => {
        const updated = [...prev, addedMatch];
        matchesCache.current[`${tournamentId}-${roundId}`] = updated;
        return updated;
      });

      setNewMatchNo(newMatchNo + 1);
      setNewTime('00:00');
      setNewMap('');
      setSelectedGroupIds([]);
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Error adding match');
    }
  };

  // ----- Edit Match -----
  const startEdit = (match: Match) => {
    setEditMatchId(match._id);
    setEditMatchNo(match.matchNo);
    setEditTime(to24HourFormat(match.time));
    setEditMap(match.map);
  };

  const handleUpdateMatch = async (matchId: string) => {
    if (!editMap.trim()) return alert('Please enter the map name.');
    if (!editTime) return alert('Please enter a valid time.');

    try {
      const res = await api.put(`/tournaments/${tournamentId}/rounds/${roundId}/matches/${matchId}`, {
        matchNo: editMatchNo,
        time: editTime,
        map: editMap.trim(),
      });

      setMatches((prev) => {
        const updated = prev.map((m) => (m._id === matchId ? res.data : m));
        matchesCache.current[`${tournamentId}-${roundId}`] = updated;
        return updated;
      });

      setEditMatchId(null);
    } catch (err: any) {
      alert(err.message || 'Error updating match');
    }
  };

  // ----- Delete Match -----
  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('Are you sure you want to delete this match?')) return;

    try {
      await api.delete(`/tournaments/${tournamentId}/rounds/${roundId}/matches/${matchId}`);

      setMatches((prev) => {
        const updated = prev.filter((m) => m._id !== matchId);
        matchesCache.current[`${tournamentId}-${roundId}`] = updated;
        return updated;
      });
    } catch (err: any) {
      alert(err.message || 'Error deleting match');
    }
  };

  if (loading) return <p>Loading matches...</p>;
  if (error) return <p className="text-red-600 font-semibold">Error: {error}</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Matches for Round</h2>

      <div className="mb-6 text-center">
        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          aria-expanded={showAddForm}
          aria-controls="add-match-form"
        >
          {showAddForm ? 'Close Form' : 'Add Match'}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddMatch}
          id="add-match-form"
          className="mb-8 p-6 border rounded-lg bg-gray-50 shadow-sm max-w-md mx-auto"
        >
          <h3 className="text-xl font-semibold mb-4 text-center">Add New Match</h3>

          <label htmlFor="newMatchNo" className="block mb-2 font-medium">
            Match Number
          </label>
          <input
            id="newMatchNo"
            type="number"
            min={1}
            value={newMatchNo}
            onChange={(e) => setNewMatchNo(parseInt(e.target.value) || 1)}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            required
          />

          <label htmlFor="newTime" className="block mb-2 font-medium">
            Match Time (24-hour format)
          </label>
          <input
            id="newTime"
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            required
          />

          <label htmlFor="newMap" className="block mb-2 font-medium">
            Map Name
          </label>
          <select
            id="newMap"
            value={newMap}
            onChange={(e) => setNewMap(e.target.value)}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            required
          >
            <option value="">Select a map</option>
            <option value="Erangel">Erangel</option>
            <option value="Miramar">Miramar</option>
            <option value="Sanhok">Sanhok</option>
            <option value="Rondo">Rondo</option>
          </select>

          <div className="mb-4">
            <p className="font-medium mb-2">Select Groups:</p>
            {groups.map((group) => (
              <label key={group._id} className="flex items-center mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  value={group._id}
                  checked={selectedGroupIds.includes(group._id)}
                  onChange={() => {
                    if (selectedGroupIds.includes(group._id)) {
                      setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group._id));
                    } else {
                      setSelectedGroupIds([...selectedGroupIds, group._id]);
                    }
                  }}
                  className="mr-2"
                />
                {group.groupName}
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            Add Match
          </button>
        </form>
      )}

      {matches.length === 0 ? (
        <p className="text-center text-gray-600">No matches found.</p>
      ) : (
        <ul className="space-y-4 max-w-3xl mx-auto">
          {matches.map((match) => (
            <li
              key={match._id}
              className="flex flex-col md:flex-row justify-between items-center border rounded-lg p-4 bg-gray-50 shadow-sm cursor-pointer"
              onClick={() => {
                if (editMatchId !== match._id) {
                  navigate(`/tournaments/${tournamentId}/rounds/${roundId}/matches/${match._id}`);
                }
              }}
              title={`View details for Match ${match.matchNo}`}
            >
              {editMatchId === match._id ? (
                <div className="flex flex-col md:flex-row md:space-x-4 items-center w-full md:w-auto">
                  <input
                    type="number"
                    min={1}
                    value={editMatchNo}
                    onChange={(e) => setEditMatchNo(parseInt(e.target.value) || 1)}
                    className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-2 md:mb-0 w-full md:w-24"
                  />
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-2 md:mb-0 w-full md:w-28"
                  />
                  <select
                    value={editMap}
                    onChange={(e) => setEditMap(e.target.value)}
                    className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 w-full md:w-48"
                  >
                    <option value="">Select a map</option>
                    <option value="Erangel">Erangel</option>
                    <option value="Miramar">Miramar</option>
                    <option value="Sanhok">Sanhok</option>
                     <option value="Rondo">Rondo</option>
                  </select>
                  <div className="flex space-x-2 mt-2 md:mt-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateMatch(match._id);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditMatchId(null);
                      }}
                      className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Match {match.matchNo}</h3>
                    <p className="text-gray-700">Map: {match.map}</p>
                    <p className="text-gray-700">Time: {match.time}</p>
                    {match.groups && match.groups.length > 0 && (
                      <p className="text-gray-600 mt-1">
                        Groups: {match.groups.map((g) => g.groupName).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-4 md:mt-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(match);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMatch(match._id);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Match;
