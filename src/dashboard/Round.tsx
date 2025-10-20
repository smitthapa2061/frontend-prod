import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaTrash, FaEdit } from 'react-icons/fa';
import Group from './GroupsData.tsx';
import api from '../login/api.tsx';
import { socket } from './socket.tsx';

interface Round {
  _id: string;
  roundName: string;
  roundNumber: number;
  tournamentId?: string;
  day?: string;
  apiEnable?: boolean;
}

const Round: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = tournamentId ? `rounds-${tournamentId}` : 'rounds-user';

  // Modal & form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [roundName, setRoundName] = useState('');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [day, setDay] = useState('');
  const [apiEnable, setApiEnable] = useState(false);

  // Edit states
  const [editRoundId, setEditRoundId] = useState<string | null>(null);
  const [editRoundName, setEditRoundName] = useState('');
  const [editRoundNumber, setEditRoundNumber] = useState<number>(1);
  const [editDay, setEditDay] = useState('');
  const [editApiEnable, setEditApiEnable] = useState(false);

  useEffect(() => {
    fetchRounds();

    // Listen for real-time round updates
    socket.on('roundUpdated', () => {
      // Clear cache and refetch
      sessionStorage.removeItem(cacheKey);
      fetchRounds();
    });
    return () => {
      socket.off('roundUpdated', fetchRounds);
    };
  }, [tournamentId, cacheKey]);

  const fetchRounds = async () => {
    setLoading(true);
    try {
      // Always fetch fresh data, don't use cache for now to ensure apiEnable updates are visible
      let url = tournamentId
        ? `/tournaments/${tournamentId}/rounds`
        : '/user/rounds';

      const { data } = await api.get(url);
      console.log('Fetched rounds:', data); // Debug log
      setRounds(data);
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rounds');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setRoundName('');
    setRoundNumber(rounds.length + 1);
    setDay('');
    setApiEnable(false);
  };

  const closeAddModal = () => setShowAddModal(false);

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundName) return;

    try {
      const url = tournamentId
        ? `/tournaments/${tournamentId}/rounds`
        : '/tournaments/undefined/rounds';
      const { data: newRound } = await api.post(url, {
        roundName,
        roundNumber,
        day,
        apiEnable,
      });

      // Clear cache and refetch to get updated apiEnable states
      sessionStorage.removeItem(cacheKey);
      await fetchRounds();

      closeAddModal();
    } catch (err: any) {
      alert(err.message || 'Error creating round');
    }
  };

  const handleDelete = async (roundId: string) => {
    if (!window.confirm('Are you sure you want to delete this round?')) return;
    try {
      const url = tournamentId
        ? `/tournaments/${tournamentId}/rounds/${roundId}`
        : `/rounds/${roundId}`;
      await api.delete(url);

      const updatedRounds = rounds.filter(r => r._id !== roundId);
      setRounds(updatedRounds);
      sessionStorage.setItem(cacheKey, JSON.stringify(updatedRounds));
    } catch (err: any) {
      alert(err.message || 'Error deleting round');
    }
  };

  const handleEditClick = (round: Round) => {
    setEditRoundId(round._id);
    setEditRoundName(round.roundName);
    setEditRoundNumber(round.roundNumber);
    setEditDay(round.day || '');
    setEditApiEnable(round.apiEnable || false);
  };

  const handleUpdate = async (roundId: string) => {
    try {
      const url = tournamentId
        ? `/tournaments/${tournamentId}/rounds/${roundId}`
        : `/rounds/${roundId}`;
      const { data: updatedRound } = await api.put(url, {
        roundName: editRoundName,
        roundNumber: editRoundNumber,
        day: editDay,
        apiEnable: editApiEnable,
      });

      // Clear cache and refetch to get updated apiEnable states
      sessionStorage.removeItem(cacheKey);
      await fetchRounds();

      setEditRoundId(null);
    } catch (err: any) {
      alert(err.message || 'Error updating round');
    }
  };

  if (loading) return <p>Loading rounds...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-6"
        onClick={openAddModal}
      >
        Add Round
      </button>

      <Group />

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <form
            onSubmit={handleAddRound}
            className="bg-white p-6 rounded shadow w-96"
          >
            <h3 className="text-lg font-semibold mb-2">Add New Round</h3>
            <input
              type="text"
              placeholder="Round Name"
              value={roundName}
              onChange={e => setRoundName(e.target.value)}
              className="p-2 border rounded w-full mb-2"
              required
            />
            <input
              type="text"
              placeholder="Day"
              value={day}
              onChange={e => setDay(e.target.value)}
              className="p-2 border rounded w-full mb-2"
            />
            <label className="block mb-2 font-bold text-red-500">
              <input
                type="checkbox"
                checked={apiEnable}
                onChange={e => setApiEnable(e.target.checked)}
                className="mr-2 scale-125"
              />
              ENABLE API FOR THIS ROUND
            </label>
            <div className="flex justify-between mt-4">
              <button
                type="button"
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={closeAddModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <ul className="space-y-3">
        {rounds.map(round => (
          <li
            key={round._id}
            className="p-4 border rounded bg-gray-50 flex justify-between items-center"
          >
            {editRoundId === round._id ? (
              <div className="flex-1 flex flex-col space-y-2">
                <input
                  type="text"
                  value={editRoundName}
                  onChange={e => setEditRoundName(e.target.value)}
                  className="p-2 border rounded w-full"
                />
                <input
                  type="text"
                  value={editDay}
                  onChange={e => setEditDay(e.target.value)}
                  className="p-2 border rounded w-full"
                />
                <label className="block mb-2 font-bold text-red-500">
                  <input
                    type="checkbox"
                    checked={editApiEnable}
                    onChange={e => setEditApiEnable(e.target.checked)}
                    className="mr-2 scale-125"
                  />
                  ENABLE API FOR THIS ROUND
                </label>
                <div className="flex space-x-2 mt-2">
                  <button
                    className="bg-green-600 text-white px-4 py-2 rounded"
                    onClick={() => handleUpdate(round._id)}
                  >
                    Save
                  </button>
                  <button
                    className="bg-gray-400 text-white px-4 py-2 rounded"
                    onClick={() => setEditRoundId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {tournamentId ? (
                      <Link
                        to={`/tournaments/${tournamentId}/rounds/${round._id}/matches`}
                        className="text-blue-600 hover:underline"
                      >
                        Round {round.roundNumber}: {round.roundName}
                      </Link>
                    ) : (
                      <span>Round {round.roundNumber}: {round.roundName}</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">Day: {round.day}</p>
                  <p className="text-sm text-green-600">
                    API Enabled: {round.apiEnable ? 'Yes' : 'No'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <FaEdit
                    className="cursor-pointer text-blue-600 hover:text-blue-800"
                    title="Edit Round"
                    size={30}
                    onClick={() => handleEditClick(round)}
                  />
                  <FaTrash
                    className="cursor-pointer text-red-600 hover:text-red-800"
                    title="Delete Round"
                    size={30}
                    onClick={() => handleDelete(round._id)}
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Round;
