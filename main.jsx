import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import PublicLeaderboard from "./PublicLeaderboard.jsx";
import PublicPriceList from "./PublicPriceList.jsx";

// /leaderboard og /priser er offentlige, login-fri sider — afgøres FØR resten af
// appen (session, login, data-indlæsning) overhovedet initialiseres, så en besøger
// her aldrig får <App/> og dermed aldrig adgang til noget bag login.
const path = window.location.pathname.replace(/\/+$/, "");
const isPublicLeaderboard = path === "/leaderboard";
const isPublicPriceList = path === "/priser";

createRoot(document.getElementById("root")).render(
  isPublicLeaderboard ? <PublicLeaderboard /> : isPublicPriceList ? <PublicPriceList /> : <App />
);
