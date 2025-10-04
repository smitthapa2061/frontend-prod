import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./dashboard/page.tsx";
import Round from "./dashboard/Round.tsx";
import Match from "./dashboard/Match.tsx";
import Teams from "./dashboard/MainTeams.tsx";
import MatchDataViewer from "./dashboard/matchDataController.tsx";
import DisplayHud from "./dashboard/DisplayHud.tsx";
import PublicThemeRenderer from "./dashboard/PublicThemeRenderer.tsx";
import Login from "./login/page.tsx";
import ProtectedRoute from "./login/ProtectedRoute.tsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournaments/:tournamentId/rounds"
          element={
            <ProtectedRoute>
              <Round />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournaments/:tournamentId/rounds/:roundId/matches"
          element={
            <ProtectedRoute>
              <Match />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournaments/:tournamentId/rounds/:roundId/matches/:matchId"
          element={
            <ProtectedRoute>
              <MatchDataViewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <Teams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/displayhud"
          element={
            <ProtectedRoute>
              <DisplayHud />
            </ProtectedRoute>
          }
        />
        <Route
          path="/public/tournament/:tournamentId/round/:roundId/match/:matchId"
          element={<PublicThemeRenderer />}
        />
      </Routes>
    </Router>
  );
}

export default App;
