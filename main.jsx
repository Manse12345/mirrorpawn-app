import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import PublicLeaderboard from "./PublicLeaderboard.jsx";

// /leaderboard er en offentlig, login-fri side — afgøres FØR resten af appen
// (session, login, data-indlæsning) overhovedet initialiseres, så en besøger her
// aldrig får <App/> og dermed aldrig adgang til noget bag login.
const isPublicLeaderboard = window.location.pathname.replace(/\/+$/, "") === "/leaderboard";

createRoot(document.getElementById("root")).render(
  isPublicLeaderboard ? <PublicLeaderboard /> : <App />
);
