import React, { useState, useEffect } from "react";
import api from "../login/api.tsx";
import { io, Socket } from "socket.io-client";

interface Selection {
  _id: string;
  matchId: string;
  roundId: string;
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
    const socket: Socket = io("https://backend-prod-530t.onrender.com");

    socket.on("pollingStatusUpdated", (updated: Selection) => {
      setSelections((prev) =>
        prev.map((s) =>
          s._id === updated._id
            ? { ...s, isPollingActive: updated.isPollingActive }
            : s
        )
      );
    });

    socket.on("matchSelected", ({ selected }: { selected: Selection }) => {
      setSelections((prev) => {
        const index = prev.findIndex((s) => s._id === selected._id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], isSelected: true };
          return updated;
        } else {
          return [...prev, { ...selected, isSelected: true }];
        }
      });

      // Reset active match to the newly selected match
      setActiveMatchId(selected._id);
    });

    socket.on("matchDeselected", ({ matchId }: { matchId: string }) => {
      setSelections((prev) =>
        prev.map((s) =>
          s._id === matchId ? { ...s, isSelected: false } : s
        )
      );

      if (activeMatchId === matchId) setActiveMatchId(null);
    });

    socket.on("matchDeleted", ({ matchId }: { matchId: string }) => {
      setSelections((prev) => prev.filter((s) => s._id !== matchId));

      if (activeMatchId === matchId) setActiveMatchId(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [activeMatchId]);

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
          setActiveMatchId(uniqueSelections[0]._id); // default to first selected
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // --- Reset button state when active match changes ---
  useEffect(() => {
    setButtonState(false); // Always start OFF on match change
  }, [activeMatchId]);

  // --- Toggle polling for current active match ---
  const handleTogglePollingForActive = async () => {
    if (!activeMatchId) return;

    const match = selections.find((s) => s._id === activeMatchId);
    if (!match) return;

    const newState = !buttonState; // use buttonState to track visual toggle
    setButtonState(newState);

    setUpdating(true);
    try {
      await api.patch(
        `/matchSelection/${match.tournamentId}/${match.roundId}/${match.matchId}/polling`,
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
