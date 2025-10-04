import React, { useState, useEffect } from "react";
import { FaTrash, FaEdit } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "../login/api.tsx"; // Axios instance with withCredentials

interface Team {
  _id: string;
  teamFullName: string;
}

interface Slot {
  _id: string;
  slot: number;
  team: Team;
}

interface Group {
  _id: string;
  groupName: string;
  slots?: Slot[];
}

interface SelectedTeam {
  teamId: string;
  slot: number | null;
}

interface GroupProps {
  onSelectionChange?: (groupIds: string[]) => void;
}

const Group: React.FC<GroupProps> = ({ onSelectionChange }) => {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const [showForm, setShowForm] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<SelectedTeam[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const CACHE_KEY = `groups_cache_${tournamentId}`;

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const res = await api.get("/teams");
      setTeams(res.data);
    } catch (err: any) {
      console.error("Failed to fetch teams:", err);
      if (err.response?.status === 401) alert("Unauthorized. Please login.");
    }
  };

  // Fetch groups with cache
  const fetchGroups = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          setGroups(JSON.parse(cached));
          return;
        }
      }

      const res = await api.get(`/tournaments/${tournamentId}/groups`);
      setGroups(res.data);

      // Save to cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
    } catch (err: any) {
      console.error("Failed to fetch groups:", err);
      if (err.response?.status === 401) alert("Unauthorized. Please login.");
    }
  };

  const handleGroupClick = async () => {
    setShowForm(!showForm);
    if (!showForm) {
      await fetchTeams();
      clearForm();
    }
  };

  const clearForm = () => {
    setGroupName("");
    setSelectedTeams([]);
    setEditingGroupId(null);
    setSearchTerm("");
  };

  const handleCheckboxChange = (teamId: string) => {
    setSelectedTeams((prev) => {
      const exists = prev.find((t) => t.teamId === teamId);
      if (exists) return prev.filter((t) => t.teamId !== teamId);

      const nextSlot = prev.length > 0 ? Math.max(...prev.map((t) => t.slot || 0)) + 1 : 1;
      return [...prev, { teamId, slot: nextSlot }];
    });
  };

  const handleSlotChange = (teamId: string, slotValue: string) => {
    const slotNum = slotValue === "" ? null : parseInt(slotValue, 10);
    setSelectedTeams((prev) =>
      prev.map((t) => (t.teamId === teamId ? { ...t, slot: slotNum } : t))
    );
  };

  const openFormForEditGroup = (group: Group) => {
    setGroupName(group.groupName);
    if (group.slots && group.slots.length > 0) {
      const preSelected = group.slots.map((slot) => ({
        teamId: slot.team._id,
        slot: slot.slot,
      }));
      setSelectedTeams(preSelected);
    } else {
      setSelectedTeams([]);
    }
    setEditingGroupId(group._id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!groupName.trim()) return alert("Group name is required.");
    if (selectedTeams.length === 0) return alert("Select at least one team.");

    for (const t of selectedTeams) {
      if (t.slot === null || isNaN(t.slot)) {
        return alert("Please assign a valid slot number for all selected teams.");
      }
    }

    try {
      const payload = {
        groupName,
        slots: selectedTeams.map(({ teamId, slot }) => ({ team: teamId, slot })),
      };

      if (editingGroupId) {
        await api.put(`/tournaments/${tournamentId}/groups/${editingGroupId}`, payload);
      } else {
        await api.post(`/tournaments/${tournamentId}/groups`, payload);
      }

      clearForm();
      setShowForm(false);

      // Force refresh from API to update cache
      fetchGroups(true);
    } catch (err: any) {
      console.error("Failed to submit group:", err);
      alert(err.response?.data?.message || "Failed to submit group. Please try again.");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;

    try {
      await api.delete(`/tournaments/${tournamentId}/groups/${groupId}`);
      fetchGroups(true); // refresh after deletion
    } catch (err: any) {
      console.error("Failed to delete group:", err);
      alert(err.response?.data?.message || "Failed to delete group. Try again.");
    }
  };

  // Notify parent of selected group IDs
  useEffect(() => {
    if (onSelectionChange) {
      const selectedGroupIds = groups.map((g) => g._id);
      onSelectionChange(selectedGroupIds);
    }
  }, [groups, selectedTeams]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredTeams = teams.filter((team) =>
    team.teamFullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative ml-[120px] top-[-63px]">
      <button
        onClick={handleGroupClick}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        ADD GROUP
      </button>

      {showForm && (
        <div className="absolute z-50 mt-2 left-0 w-[520px] p-4 border rounded bg-white shadow-lg max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-2">
            {editingGroupId ? "Edit Group" : "Create New Group"}
          </h3>

          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group Name"
            className="w-full mb-2 p-2 border rounded"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team..."
            className="w-full mb-2 p-2 border rounded"
          />

          <div className="h-[25rem] overflow-y-auto border p-2 rounded mb-2">
            {filteredTeams.map((team) => {
              const selectedTeam = selectedTeams.find((t) => t.teamId === team._id);
              return (
                <div key={team._id} className="mb-2 flex items-center space-x-2">
                  <label className="inline-flex items-center flex-grow cursor-pointer">
                    <input
                      type="checkbox"
                      value={team._id}
                      checked={!!selectedTeam}
                      onChange={() => handleCheckboxChange(team._id)}
                      className="mr-2"
                    />
                    {team.teamFullName}
                  </label>

                  {selectedTeam && (
                    <input
                      type="number"
                      min={1}
                      placeholder="Slot"
                      value={selectedTeam.slot ?? ""}
                      onChange={(e) => handleSlotChange(team._id, e.target.value)}
                      className="w-20 p-1 border rounded"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {selectedTeams.length > 0 && (
            <div className="border p-3 rounded bg-gray-50 mb-4">
              <h4 className="font-semibold mb-2">Selected Teams:</h4>
              <ul className="list-disc list-inside">
                {selectedTeams
                  .sort((a, b) => (a.slot || 0) - (b.slot || 0))
                  .map((t) => {
                    const team = teams.find((team) => team._id === t.teamId);
                    return (
                      <li key={t.teamId}>
                        Slot {t.slot}: {team?.teamFullName || "Unknown Team"}
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {editingGroupId ? "Update Group" : "Submit Group"}
          </button>

          <h4 className="text-md font-semibold mb-2">Existing Groups</h4>
          <div className="space-y-2">
            {groups.map((group) => (
              <details key={group._id} className="border rounded bg-gray-50">
                <summary className="cursor-pointer font-medium flex justify-between items-center px-2 py-1">
                  <span>{group.groupName}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openFormForEditGroup(group);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit Group"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <FaEdit />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group._id);
                      }}
                      className="text-red-600 hover:text-red-800"
                      title="Delete Group"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </summary>

                <ul className="list-disc list-inside px-6 py-2 bg-white">
                  {group.slots && group.slots.length > 0 ? (
                    group.slots
                      .sort((a, b) => a.slot - b.slot)
                      .map((slot) => (
                        <li key={slot._id}>
                          {slot.team ? slot.team.teamFullName : "Unknown Team"} (Slot{" "}
                          {slot.slot})
                        </li>
                      ))
                  ) : (
                    <li>No teams assigned</li>
                  )}
                </ul>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Group;
