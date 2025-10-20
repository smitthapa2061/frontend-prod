import React, { useState, useEffect } from "react";
import api from "../login/api.tsx";
import SocketManager from "./socketManager.tsx";

interface Selection {
  _id: string;
  matchId: string;
  roundId: {
    _id: string;
    apiEnable: boolean;
    roundName: string;
  };
  tournamentId: string;
  createdAt: string;
  isSelected: boolean;
  isPollingActive: boolean;
}

const PollingManager: React.FC = () => {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [buttonState, setButtonState] = useState(false); // Track ON/OFF visually

  // --- Socket setup ---
  useEffect(() => {
    const socketManager = SocketManager.getInstance();
    const socket = socketManager.connect();

    console.log("Socket connected");

    socket.on("pollingStatusUpdated", (updated: Selection) => {
      console.log("Socket: pollingStatusUpdated received:", updated);
      setSelections((prev) => {
        const newSelections = prev.map((s) =>
          s._id === updated._id
            ? { ...s, isPollingActive: updated.isPollingActive }
            : s
        );

        // Update button state if the updated selection is the active match
        if (updated._id === activeMatchId) {
          const activeSelection = newSelections.find(s => s._id === activeMatchId);
          const hasApiEnabled = typeof activeSelection?.roundId === 'object' ? activeSelection.roundId.apiEnable : false;
          const newButtonState = updated.isPollingActive && hasApiEnabled;
          setButtonState(newButtonState);
          console.log("Button state updated to:", newButtonState, "for match:", updated._id, "api enabled:", hasApiEnabled, "polling active:", updated.isPollingActive);
        }

        return newSelections;
      });
    });

    socket.on("matchSelected", ({ selected }: { selected: Selection }) => {
      console.log("Socket: matchSelected event received:", selected);
      setSelections((prev) => {
        // First, set all selections to not selected
        const updatedPrev = prev.map(s => ({ ...s, isSelected: false }));

        const index = updatedPrev.findIndex((s) => s._id === selected._id);
        if (index !== -1) {
          updatedPrev[index] = { ...selected, isSelected: true };
          return updatedPrev;
        } else {
          return [...updatedPrev, { ...selected, isSelected: true }];
        }
      });

      // Set active match to the newly selected match
      console.log("Setting active match to:", selected._id, "polling active:", selected.isPollingActive);
      setActiveMatchId(selected._id);
      // Set button state based on polling status and API enable
      const hasApiEnabled = typeof selected.roundId === 'object' ? selected.roundId.apiEnable : false;
      setButtonState(selected.isPollingActive && hasApiEnabled);
      console.log("Button state set to:", selected.isPollingActive && hasApiEnabled, "for new match:", selected._id);
    });

    socket.on("matchDeselected", ({ matchId, tournamentId, roundId, userId }: { matchId: string, tournamentId: string, roundId: string, userId: string }) => {
      console.log("Socket: matchDeselected received:", { matchId, tournamentId, roundId, userId });
      setSelections((prev) =>
        prev.map((s) =>
          s._id === matchId ? { ...s, isSelected: false, isPollingActive: false } : s
        )
      );

      if (activeMatchId === matchId) {
        console.log("Clearing active match due to deselection");
        setActiveMatchId(null);
      }
    });

    socket.on("matchDeleted", ({ matchId, userId }: { matchId: string, userId: string }) => {
      console.log("Socket: matchDeleted received:", { matchId, userId });
      setSelections((prev) => prev.filter((s) => s._id !== matchId));

      if (activeMatchId === matchId) {
        console.log("Clearing active match due to deletion");
        setActiveMatchId(null);
      }
    });

    return () => {
      console.log("Socket disconnected");
      socketManager.disconnect();
    };
  }, []);

  // --- Fetch initial selections ---
  useEffect(() => {
    api
      .get<Selection[]>("/matchSelection/selected")
      .then((res) => {
        const uniqueSelections = Array.from(
          new Map(res.data.map((item) => [item._id, item])).values()
        );
        setSelections(uniqueSelections);
        if (uniqueSelections.length > 0) {
          // Prioritize API-enabled rounds for initial selection
          const apiEnabledSelections = uniqueSelections.filter(s =>
            typeof s.roundId === 'object' ? s.roundId.apiEnable : false
          );
          const firstSelected = apiEnabledSelections.length > 0
            ? (apiEnabledSelections.find(s => s.isSelected) || apiEnabledSelections[0])
            : (uniqueSelections.find(s => s.isSelected) || uniqueSelections[0]);

          setActiveMatchId(firstSelected._id);
          // Set initial button state based on polling status and API enable
          const hasApiEnabled = typeof firstSelected.roundId === 'object' ? firstSelected.roundId.apiEnable : false;
          setButtonState(firstSelected.isPollingActive && hasApiEnabled);
          console.log("Initial active match:", firstSelected._id, "round:", typeof firstSelected.roundId === 'object' ? firstSelected.roundId.roundName : 'unknown', "api enabled:", hasApiEnabled);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // --- Reset button state when active match changes ---
  useEffect(() => {
    console.log("Active match changed to:", activeMatchId, "setting button to: false");
    setButtonState(false);
  }, [activeMatchId]);

  // --- Force re-render when buttonState changes ---
  useEffect(() => {
    console.log("Button state is now:", buttonState);
  }, [buttonState]);

  // --- Toggle polling for current active match ---
  const handleTogglePollingForActive = async () => {
    if (!activeMatchId) return;

    const match = selections.find((s) => s._id === activeMatchId);
    if (!match) return;

    // Check if API is enabled for this round
    const hasApiEnabled = typeof match.roundId === 'object' ? match.roundId.apiEnable : false;
    const roundId = typeof match.roundId === 'object' ? match.roundId._id : match.roundId;
    if (!hasApiEnabled) {
      console.log("Cannot toggle polling: API not enabled for round", roundId, "match", match.matchId);
      return;
    }

    const currentMatch = selections.find((s) => s._id === activeMatchId);
    const newState = !currentMatch?.isPollingActive; // use actual polling state from DB
    setButtonState(newState);

    setUpdating(true);
    try {
      const roundId = typeof match.roundId === 'object' ? match.roundId._id : match.roundId;
      await api.patch(
        `/matchSelection/${match.tournamentId}/${roundId}/${match.matchId}/polling`,
        { isPollingActive: newState }
      );

      // Update selections to match DB
      setSelections((prev) =>
        prev.map((s) =>
          s._id === activeMatchId ? { ...s, isPollingActive: newState } : s
        )
      );
    } catch (err) {
      console.error("Failed to update polling:", err);
      setButtonState(!newState); // rollback button visually
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p>Loading selections...</p>;
  if (!activeMatchId) return null;

  return (
    <div className="p-4">
      <button
        onClick={handleTogglePollingForActive}
        disabled={updating}
        style={{
          padding: "10px 20px",
          backgroundColor: buttonState ? "green" : "red",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        {updating
          ? "Updating..."
          : buttonState
          ? "Fetch DATA : ON"
          : "Fetch DATA : OFF"}
      </button>
    </div>
  );
};

export default PollingManager;