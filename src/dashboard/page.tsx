import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import api from "../login/api.tsx"; // Axios instance with withCredentials
import { socket } from "./socket.tsx"; // socket instance
import { setCache, getCache } from "./cache.tsx"; // ✅ caching utils

interface TournamentFormState {
  tournamentName: string;
  torLogo: string;
  day: string;
  primaryColor: string;
  secondaryColor: string;
  overlayBg: string;
}

interface Tournament {
  _id: string;
  tournamentName: string;
  torLogo: string;
  day: string;
  primaryColor: string;
  secondaryColor: string;
  overlayBg: string;
}

const GLOBAL_CACHE_KEY = "auth_user";
const CACHE_KEY_BASE = "tournaments";

const Dashboard: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TournamentFormState>({
    tournamentName: "",
    torLogo: "",
    day: "",
    primaryColor: "",
    secondaryColor: "",
    overlayBg: "",
  });

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editForm, setEditForm] = useState<Partial<Tournament>>({});
  const navigate = useNavigate();

  // --- Auth check (cached) ---
  const checkAuth = async () => {
    const cachedUser = getCache(GLOBAL_CACHE_KEY, 1000 * 60 * 5);
    if (cachedUser) return cachedUser;

    try {
      const { data } = await api.get("/users/me");
      setCache(GLOBAL_CACHE_KEY, data);
      return data;
    } catch {
      return null;
    }
  };

  // --- Fetch tournaments with caching (per user) ---
  const fetchTournaments = async () => {
    const user = await checkAuth();
    if (!user) {
      navigate("/");
      return;
    }

    const key = `${CACHE_KEY_BASE}_${user._id}`;

    // Try cache first (10 minutes TTL)
    const cached = getCache(key, 1000 * 60 * 10);
    if (cached) {
      setTournaments(cached);
      return;
    }

    // Fetch from API if cache missing or expired
    try {
      const { data } = await api.get<Tournament[]>("/tournaments");
      setTournaments(data);
      setCache(key, data);
    } catch (err: any) {
      console.error("Error fetching tournaments:", err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    fetchTournaments();

    const handleNewTournament = (tournament: Tournament) => {
      setTournaments((prev) => {
        // avoid duplicates
        if (prev.find((t) => t._id === tournament._id)) return prev;
        const updated = [...prev, tournament];
        const cachedUser = getCache(GLOBAL_CACHE_KEY, 1000 * 60 * 5);
        const key = cachedUser ? `${CACHE_KEY_BASE}_${cachedUser._id}` : CACHE_KEY_BASE;
        setCache(key, updated);
        return updated;
      });
    };

    socket.on("newTournament", handleNewTournament);

    return () => {
      socket.off("newTournament", handleNewTournament);
    };
  }, []);

  // --- Create handlers ---
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/tournaments", form);
      const updated = [...tournaments, data];
      setTournaments(updated);
      const cachedUser = getCache(GLOBAL_CACHE_KEY, 1000 * 60 * 5);
      const key = cachedUser ? `${CACHE_KEY_BASE}_${cachedUser._id}` : CACHE_KEY_BASE;
      setCache(key, updated);
      setForm({
        tournamentName: "",
        torLogo: "",
        day: "",
        primaryColor: "",
        secondaryColor: "",
        overlayBg: "",
      });
      setShowForm(false);
      alert("Tournament created successfully!");
    } catch (err: any) {
      console.error("Error creating tournament:", err.response?.data?.message || err.message);
      alert("Error creating tournament");
    }
  };

  // --- Edit handlers ---
  const handleEdit = (id: string) => {
    const tournament = tournaments.find((t) => t._id === id);
    if (tournament) {
      setEditingTournament(tournament);
      setEditForm(tournament);
    }
  };

  const handleEditChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;

    try {
      const { data: updatedTournament } = await api.put<Tournament>(
        `/tournaments/${editingTournament._id}`,
        editForm
      );

      const updated = tournaments.map((t) =>
        t._id === updatedTournament._id ? updatedTournament : t
      );
      setTournaments(updated);
      const cachedUser = getCache(GLOBAL_CACHE_KEY, 1000 * 60 * 5);
      const key = cachedUser ? `${CACHE_KEY_BASE}_${cachedUser._id}` : CACHE_KEY_BASE;
      setCache(key, updated);
      setEditingTournament(null);
      alert("Tournament updated successfully");
    } catch (err: any) {
      console.error("Edit error:", err.response?.data?.message || err.message);
      alert("Failed to update tournament");
    }
  };

  // --- Delete handler ---
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this tournament?")) return;

    try {
      await api.delete(`/tournaments/${id}`);
      const updated = tournaments.filter((t) => t._id !== id);
      setTournaments(updated);
      const cachedUser = getCache(GLOBAL_CACHE_KEY, 1000 * 60 * 5);
      const key = cachedUser ? `${CACHE_KEY_BASE}_${cachedUser._id}` : CACHE_KEY_BASE;
      setCache(key, updated);
      alert("Tournament deleted successfully");
    } catch (err: any) {
      console.error("Delete error:", err.response?.data?.message || err.message);
      alert("Failed to delete tournament");
    }
  };

  return (
    <div>
      {/* Nav */}
      <div className="bg-gray-800 text-white p-4 flex justify-center space-x-5">
        <button className="bg-white text-black px-6 py-2 rounded-xl">TOURNAMENTS</button>
        <button
          onClick={() => window.open("/teams", "_blank")}
          className="bg-white text-black px-6 py-2 rounded-xl hover:bg-gray-200"
        >
          ADD TEAMS
        </button>
        <button
          onClick={() => window.open("/displayhud", "_blank")}
          className="bg-white text-black px-6 py-2 rounded-xl hover:bg-gray-200"
        >
          DISPLAY HUD
        </button>
      </div>

      {/* Tournament Manager */}
      <div className="w-full h-full">
        <button
          className="bg-[#232323] text-white px-6 py-2 rounded-xl mt-4 ml-4"
          onClick={() => setShowForm(!showForm)}
        >
          ADD TOURNAMENT
        </button>

        {/* --- Create Form --- */}
       {showForm && (
  <form
    onSubmit={handleSubmit}
    className="max-w-md mx-auto p-4 mt-4 bg-white rounded shadow"
  >
    {[
      { name: "tournamentName", placeholder: "Tournament Name" },
      { name: "torLogo", placeholder: "Tournament Logo URL" },
      { name: "info", placeholder: "Additional Info" },
      { name: "primaryColor", placeholder: "Primary Color" },
      { name: "secondaryColor", placeholder: "Secondary Color" },
      { name: "overlayBg", placeholder: "Overlay Background" },
    ].map((field) => (
      <input
        key={field.name}
        type="text"
        name={field.name}
        placeholder={field.placeholder}
        value={(form as any)[field.name]}
        onChange={handleChange}
        className="w-full mb-3 p-2 border rounded"
      />
    ))}
    <button
      type="submit"
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      Submit
    </button>
  </form>
)}

        {/* --- Edit Form --- */}
        {editingTournament && (
          <form
            onSubmit={handleEditSubmit}
            className="p-4 border rounded mb-4 max-w-md mx-auto box-border"
          >
            <h3 className="text-xl font-bold mb-4">Edit Tournament</h3>
            {["tournamentName", "torLogo", "Additional info", "primaryColor", "secondaryColor", "overlayBg"].map(
              (field) => (
                <input
                  key={field}
                  type="text"
                  name={field}
                  value={(editForm as any)[field] || ""}
                  onChange={handleEditChange}
                  placeholder={field.replace(/([A-Z])/g, " $1").trim()}
                  className="mb-2 p-2 border rounded w-full"
                />
              )
            )}
            <div className="flex gap-2">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingTournament(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* --- Tournament List --- */}
        <ul className="space-y-4 w-full mt-[20px]">
          {tournaments.map((t) => (
            <li
              key={t._id}
              className="p-4 border rounded shadow-md relative w-full box-border"
              style={{ backgroundColor: t.overlayBg }}
            >
              <div className="absolute top-2 right-2 flex space-x-3">
                <FaEdit
                  className="cursor-pointer text-blue-600 hover:text-blue-800"
                  title="Edit"
                  onClick={() => handleEdit(t._id)}
                  size={28}
                />
                <FaTrash
                  className="cursor-pointer text-red-600 hover:text-red-800"
                  title="Delete"
                  onClick={() => handleDelete(t._id)}
                  size={28}
                />
              </div>
              <Link to={`/tournaments/${t._id}/rounds`}>
                <h3
                  className="text-lg font-semibold mb-2 underline hover:text-blue-700"
                  style={{ color: t.primaryColor }}
                >
                  {t.tournamentName}
                </h3>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
