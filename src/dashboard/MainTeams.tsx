import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { FaTrash, FaEdit } from 'react-icons/fa';

interface Player {
  _id?: string;
  playerName: string;
  playerId?: string;
  photo?: string;
}

interface Team {
  _id: string;
  teamFullName: string;
  teamTag: string;
  logo?: string;
  players: Player[];
}

const API_URL = 'https://backend-prod-530t.onrender.com/api';

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
const [selectedPlayersPerTeam, setSelectedPlayersPerTeam] = useState<Record<string, Set<string>>>({});


  const [form, setForm] = useState({ teamFullName: '', teamTag: '', logo: '' });

  const [playersForm, setPlayersForm] = useState<Player[]>([
    { playerName: '', playerId: '', photo: '' },
  ]);

  const [deletingPlayerIds, setDeletingPlayerIds] = useState<Set<string>>(new Set());
  const [deletingTeamIds, setDeletingTeamIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await axios.get<Team[]>(`${API_URL}/teams`);
      setTeams(res.data);
    } catch (err) {
      console.error('Fetch teams failed:', err);
    }
  };

  // Navigation button handlers
  const goToTournaments = () => {
    window.location.href = '/dashboard'; // adjust route as needed
  };
  const goToAddTeams = () => {
    setShowForm(true);
  };
  const goToDisplayHUD = () => {
    window.location.href = '/displayhud'; // adjust route as needed
  };

  // Team form handlers
  const handleTeamInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlayerChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPlayersForm((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [name]: value };
      return copy;
    });
  };

  const addPlayerInput = () => {
    setPlayersForm((prev) => [...prev, { playerName: '', playerId: '', photo: '' }]);
  };

  const removePlayerInput = (index: number) => {
    setPlayersForm((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (playersForm.some((p) => p.playerName.trim() === '')) {
      alert('Please fill in all player names');
      return;
    }

    try {
      const payload = { ...form, players: playersForm };
      if (editingTeamId) {
        const res = await axios.put(`${API_URL}/teams/${editingTeamId}`, payload);
        setTeams((prev) =>
          prev.map((team) => (team._id === editingTeamId ? res.data : team))
        );
      } else {
        const res = await axios.post(`${API_URL}/teams`, payload);
        setTeams((prev) => [...prev, res.data]);
      }
      resetForm();
    } catch (err) {
      alert('Failed to save team');
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingTeamId(null);
    setForm({ teamFullName: '', teamTag: '', logo: '' });
    setPlayersForm([{ playerName: '', playerId: '', photo: '' }]);
    setShowForm(false);
  };

  const startEditTeam = (team: Team) => {
    setEditingTeamId(team._id);
    setForm({
      teamFullName: team.teamFullName,
      teamTag: team.teamTag,
      logo: team.logo || '',
    });
    setPlayersForm(team.players.length ? team.players : [{ playerName: '', playerId: '', photo: '' }]);
    setShowForm(true);
  };

  const deleteTeam = async (id: string) => {
    if (!window.confirm('Delete this team?')) return;
    if (deletingTeamIds.has(id)) return;

    setDeletingTeamIds((prev) => new Set(prev).add(id));
    setTeams((prev) => prev.filter((team) => team._id !== id));

    try {
      await axios.delete(`${API_URL}/teams/${id}`);
    } catch (err) {
      alert('Failed to delete team');
      console.error(err);
      fetchTeams();
    } finally {
      setDeletingTeamIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
    }
  };

  const deletePlayer = async (teamId: string, playerId: string) => {
    if (!window.confirm('Delete this player?')) return;
    if (deletingPlayerIds.has(playerId)) return;

    setDeletingPlayerIds((prev) => new Set(prev).add(playerId));
    try {
      await axios.delete(`${API_URL}/teams/${teamId}/players/${playerId}`);

      setTeams((prev) =>
        prev.map((team) =>
          team._id === teamId
            ? { ...team, players: team.players.filter((p) => p._id !== playerId) }
            : team
        )
      );

      if (editingTeamId === teamId) {
        setPlayersForm((prev) => prev.filter((p) => p._id !== playerId));
      }
    } catch (err) {
      alert('Failed to delete player');
      console.error(err);
    } finally {
      setDeletingPlayerIds((prev) => {
        const copy = new Set(prev);
        copy.delete(playerId);
        return copy;
      });
    }
  };

const deleteSelectedPlayers = async (teamId: string) => {
  const selectedSet = selectedPlayersPerTeam[teamId];
  if (!selectedSet || selectedSet.size === 0) return;
  if (!window.confirm('Delete selected players?')) return;

  const playerIdsArray = Array.from(selectedSet);

  try {
    await axios.delete(`${API_URL}/teams/${teamId}/players`, {
      data: { playerIds: playerIdsArray },
    });

    setTeams((prev) =>
      prev.map((team) =>
        team._id === teamId
          ? { ...team, players: team.players.filter((p) => !selectedSet.has(p._id!)) }
          : team
      )
    );

    if (editingTeamId === teamId) {
      setPlayersForm((prev) => prev.filter((p) => !playerIdsArray.includes(p._id!)));
    }

    // Clear selection for this team only
    setSelectedPlayersPerTeam((prev) => ({ ...prev, [teamId]: new Set() }));
  } catch (err) {
    alert('Failed to delete selected players');
    console.error(err);
  }
};


  return (
    <>
      {/* Fixed Navigation Bar */}
      <nav
        className="fixed top-0 left-0 right-0 bg-gray-800 text-white p-4 flex justify-center space-x-6 z-50"
        style={{ margin: 0 }}
      >
        <button
          onClick={goToTournaments}
          className="bg-white text-black font-medium rounded-xl px-6 py-2 hover:bg-gray-200 transition"
        >
          TOURNAMENT
        </button>
        <button
          onClick={goToAddTeams}
          className="bg-white text-black font-medium rounded-xl px-6 py-2 hover:bg-gray-200 transition"
        >
          ADD TEAMS
        </button>
        <button
          onClick={goToDisplayHUD}
          className="bg-white text-black font-medium rounded-xl px-6 py-2 hover:bg-gray-200 transition"
        >
          DISPLAY HUD
        </button>
      </nav>

      {/* Padding below fixed nav to prevent overlap */}
      <div className="pt-[64px] max-w-6xl mx-auto p-4">
        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="mt-[40px] bg-blue-600 text-white px-4 py-2 rounded "
        >
          {showForm ? 'Close Form' : editingTeamId ? 'Edit Team' : 'Add Team'}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="border p-4 rounded mb-6 space-y-4">
            <input
              type="text"
              name="teamFullName"
              placeholder="Team Full Name"
              value={form.teamFullName}
              onChange={handleTeamInputChange}
              required
              className="border p-2 rounded w-full"
              autoFocus
            />
            <input
              type="text"
              name="teamTag"
              placeholder="Team Tag"
              value={form.teamTag}
              onChange={handleTeamInputChange}
              required
              className="border p-2 rounded w-full"
            />
            <input
              type="text"
              name="logo"
              placeholder="Team Logo URL"
              value={form.logo}
              onChange={handleTeamInputChange}
              className="border p-2 rounded w-full"
            />
            {form.logo && (
              <img
                src={form.logo}
                alt="Logo Preview"
                className="w-24 h-24 object-contain my-2"
                loading="lazy"
              />
            )}

            <h4 className="font-semibold">Players</h4>
            {playersForm.map((player, index) => (
              <div key={player._id || index} className="flex space-x-2 mb-2 items-center">
                <input
                  type="text"
                  name="playerName"
                  placeholder="Player Name"
                  value={player.playerName}
                  onChange={(e) => handlePlayerChange(index, e)}
                  required
                  className="border p-2 rounded flex-grow"
                />
                <input
                  type="text"
                  name="playerId"
                  placeholder="Player ID (optional)"
                  value={player.playerId}
                  onChange={(e) => handlePlayerChange(index, e)}
                  className="border p-2 rounded w-36"
                />
                <input
                  type="text"
                  name="photo"
                  placeholder="Photo URL (optional)"
                  value={player.photo}
                  onChange={(e) => handlePlayerChange(index, e)}
                  className="border p-2 rounded w-40"
                />
                {playersForm.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePlayerInput(index)}
                    className="bg-red-600 text-white px-2 py-1 rounded"
                    title="Remove player"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPlayerInput}
              className="bg-green-600 text-white px-4 py-1 rounded mb-4"
            >
              Add Another Player
            </button>

            <div className="flex space-x-4">
              <button type="submit" className="bg-blue-700 text-white px-6 py-2 rounded">
                {editingTeamId ? 'Update Team' : 'Create Team'}
              </button>
              {editingTeamId && (
                <button type="button" onClick={resetForm} className="border px-6 py-2 rounded">
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <h3 className="mb-4">Teams</h3>
        {teams.length === 0 && <p>No teams available</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {teams.map((team) => (
            <div
              key={team._id}
              className="border p-4 rounded shadow flex flex-col items-center"
            >
              {team.logo && (
                <img
                  src={team.logo}
                  alt={`${team.teamFullName} logo`}
                  className="w-20 h-20 object-contain mb-2"
                  loading="lazy"
                />
              )}
              <h4 className="font-semibold text-center">
                {team.teamFullName} ({team.teamTag})
              </h4>

              <div className="w-full mt-2">
                <h5 className="font-semibold mb-1">Players</h5>
                {team.players.length === 0 ? (
                  <p>No players</p>
                ) : (
                 <ul className="text-sm space-y-1">
  {team.players.map((player) => (
   <li key={player._id || player.playerName} className="flex justify-between items-center">
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      checked={selectedPlayersPerTeam[team._id]?.has(player._id!) || false}
      onChange={() => {
        setSelectedPlayersPerTeam((prev) => {
          const teamSet = new Set(prev[team._id] || []);
          if (teamSet.has(player._id!)) teamSet.delete(player._id!);
          else teamSet.add(player._id!);
          return { ...prev, [team._id]: teamSet };
        });
      }}
    />
    
   

    <span>
      <strong>{player.playerName}</strong>
      {player.playerId && ` (${player.playerId})`}
    </span>
  </div>
   {player.photo && (
      <img
        src={player.photo}
        alt={player.playerName}
        className="w-6 h-6 rounded-full object-cover"
        loading="lazy"
      />
    )}

  {player._id && (
    <button
      onClick={() => deletePlayer(team._id, player._id!)}
      className="text-red-600 hover:text-red-800"
      title="Delete Player"
      disabled={deletingPlayerIds.has(player._id!)}
    >
      <FaTrash size={16} />
    </button>
  )}
  
</li>

  ))}
</ul>

                )}
    {selectedPlayersPerTeam[team._id]?.size > 0 && (
  <button
    onClick={() => deleteSelectedPlayers(team._id)}
    className="bg-red-600 text-white px-4 py-1 rounded mt-2"
  >
    Delete Selected Players ({selectedPlayersPerTeam[team._id].size})
  </button>
)}
              </div>

              <div className="mt-auto pt-[80px] flex space-x-2">
                <button
                  onClick={() => startEditTeam(team)}
                  className="bg-yellow-400 px-3 py-1 rounded"
                  aria-label={`Edit team ${team.teamFullName}`}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => deleteTeam(team._id)}
                  className="bg-red-600 px-3 py-1 rounded text-white"
                  aria-label={`Delete team ${team.teamFullName}`}
                  disabled={deletingTeamIds.has(team._id)}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Teams;
