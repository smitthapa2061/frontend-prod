import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { FaTrash, FaEdit, FaDiscord, FaWhatsapp } from 'react-icons/fa';
import api from '../login/api.tsx';

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

const API_URL = 'https://backend-prod-bs4c.onrender.com/api';

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [selectedPlayersPerTeam, setSelectedPlayersPerTeam] = useState<Record<string, Set<string>>>({});
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({ teamFullName: '', teamTag: '', logo: '' });

  const [playersForm, setPlayersForm] = useState<Player[]>([
    { playerName: '', playerId: '', photo: '' },
  ]);

  const [deletingPlayerIds, setDeletingPlayerIds] = useState<Set<string>>(new Set());
  const [deletingTeamIds, setDeletingTeamIds] = useState<Set<string>>(new Set());

  const filteredTeams = teams.filter(team =>
    team.teamFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.teamTag.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  useEffect(() => {
    checkAuth();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header/Navigation Bar - Matching Dashboard */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="https://res.cloudinary.com/dqckienxj/image/upload/v1760081339/scoresync_logo.jpg_hsz7qz.png"
                alt="ScoreSync Logo"
                className="w-12 h-12 rounded-lg shadow-lg"
              />
              <h1 className="text-xl font-bold text-white">ScoreSync</h1>
            </div>

            {/* Navigation Buttons */}
            <nav className="flex items-center gap-3">
              <button
                onClick={goToTournaments}
                className="bg-slate-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Tournaments
              </button>
              <button
                onClick={goToAddTeams}
                className="bg-purple-600 text-white font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Teams
              </button>
              <button
                onClick={goToDisplayHUD}
                className="bg-slate-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Display HUD
              </button>
            </nav>

            {/* User Info */}
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-sm text-gray-300 font-medium">
                  Admin: <span className="text-white">{user.username}</span>
                </span>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>Help Desk</span>
                <FaDiscord
                  className="cursor-pointer text-2xl text-gray-300 hover:text-purple-400 transition-colors"
                  onClick={() => window.open('https://discord.com/channels/623776491682922526/1426117227257663558', '_blank')}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Team Management</h2>
          <p className="text-gray-400">Create and manage your teams and players</p>
        </div>

        {/* Add Team Button */}
        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="bg-purple-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors mb-6 shadow-lg"
        >
          {showForm ? 'Close Form' : editingTeamId ? 'Edit Team' : '+ Add Team'}
        </button>

        {showForm && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 mb-8 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingTeamId ? 'Edit Team' : 'Create New Team'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="teamFullName"
                placeholder="Team Full Name"
                value={form.teamFullName}
                onChange={handleTeamInputChange}
                required
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                autoFocus
              />
              <input
                type="text"
                name="teamTag"
                placeholder="Team Tag"
                value={form.teamTag}
                onChange={handleTeamInputChange}
                required
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <input
                type="text"
                name="logo"
                placeholder="Team Logo URL"
                value={form.logo}
                onChange={handleTeamInputChange}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              {form.logo && (
                <img
                  src={form.logo}
                  alt="Logo Preview"
                  className="w-24 h-24 object-contain my-2 rounded-lg border border-slate-600"
                  loading="lazy"
                />
              )}

              <h4 className="font-semibold text-white mt-4">Players</h4>
              {playersForm.map((player, index) => (
                <div key={player._id || index} className="flex gap-2 mb-2 items-center">
                  <input
                    type="text"
                    name="playerName"
                    placeholder="Player Name"
                    value={player.playerName}
                    onChange={(e) => handlePlayerChange(index, e)}
                    required
                    className="px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all flex-grow"
                  />
                  <input
                    type="text"
                    name="playerId"
                    placeholder="Player ID (optional)"
                    value={player.playerId}
                    onChange={(e) => handlePlayerChange(index, e)}
                    className="px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all w-36"
                  />
                  <input
                    type="text"
                    name="photo"
                    placeholder="Photo URL (optional)"
                    value={player.photo}
                    onChange={(e) => handlePlayerChange(index, e)}
                    className="px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all w-40"
                  />
                  {playersForm.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePlayerInput(index)}
                      className="p-2.5 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-white"
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
                className="bg-green-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-colors mb-4"
              >
                + Add Another Player
              </button>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-purple-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-purple-700 transition-colors">
                  {editingTeamId ? 'Update Team' : 'Create Team'}
                </button>
                {editingTeamId && (
                  <button type="button" onClick={resetForm} className="bg-slate-700 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-slate-600 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}


        {/* Teams List */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white mb-4">Teams</h3>
          <input
            type="text"
            placeholder="Search teams by name or tag"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all mb-6"
          />
        </div>

        {filteredTeams.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No teams found</h3>
            <p className="text-gray-500 mb-6">Create your first team to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredTeams.map((team) => (
              <div
                key={team._id}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow flex flex-col"
              >
                {team.logo && (
                  <img
                    src={team.logo}
                    alt={`${team.teamFullName} logo`}
                    className="w-20 h-20 object-contain mb-3 mx-auto rounded-lg"
                    loading="lazy"
                  />
                )}
                <h4 className="font-bold text-white text-center text-lg mb-1">
                  {team.teamFullName}
                </h4>
                <p className="text-purple-400 text-center text-sm mb-4">({team.teamTag})</p>

                <div className="w-full mt-2 flex-grow">
                  <h5 className="font-semibold text-gray-300 text-sm mb-2">Players</h5>
                  {team.players.length === 0 ? (
                    <p className="text-gray-500 text-sm">No players</p>
                  ) : (
                    <ul className="text-sm space-y-2">
                      {team.players.map((player) => (
                        <li key={player._id || player.playerName} className="flex justify-between items-center">
                          <div className="flex items-center gap-2 flex-grow">
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
                              className="rounded border-slate-600"
                            />
                            {player.photo && (
                              <img
                                src={player.photo}
                                alt={player.playerName}
                                className="w-6 h-6 rounded-full object-cover"
                                loading="lazy"
                              />
                            )}
                            <span className="text-gray-300">
                              <strong className="text-white">{player.playerName}</strong>
                              {player.playerId && <span className="text-gray-500 text-xs"> ({player.playerId})</span>}
                            </span>
                          </div>
                          {player._id && (
                            <button
                              onClick={() => deletePlayer(team._id, player._id!)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete Player"
                              disabled={deletingPlayerIds.has(player._id!)}
                            >
                              <FaTrash size={14} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedPlayersPerTeam[team._id]?.size > 0 && (
                    <button
                      onClick={() => deleteSelectedPlayers(team._id)}
                      className="bg-red-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors mt-3 w-full text-sm"
                    >
                      Delete Selected ({selectedPlayersPerTeam[team._id].size})
                    </button>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700/50 flex gap-2">
                  <button
                    onClick={() => startEditTeam(team)}
                    className="flex-1 bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-white font-medium text-sm"
                    aria-label={`Edit team ${team.teamFullName}`}
                  >
                    <FaEdit className="inline mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => deleteTeam(team._id)}
                    className="flex-1 bg-red-600 px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-white font-medium text-sm"
                    aria-label={`Delete team ${team.teamFullName}`}
                    disabled={deletingTeamIds.has(team._id)}
                  >
                    <FaTrash className="inline mr-1" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Teams;
