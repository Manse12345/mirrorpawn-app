import { useEffect, useState } from "react";
import { Trophy, RefreshCw, Share2 } from "lucide-react";
import { loadPublicLeaderboard } from "./supabase-store.js";

// ============================================================
//  MIRROR PAWN — Offentlig leaderboard-side (/leaderboard)
//
//  Selvstændig, login-fri side. Importerer BEVIDST intet fra App.jsx og kalder
//  aldrig signIn/getSession/onAuthChange/loadConfig/loadSales/loadInventory/
//  loadCash eller nogen anden funktion, der rører resten af systemet — kun
//  loadPublicLeaderboard() (get_public_leaderboard()-RPC'en), som i databasen kun
//  har lov til at returnere konkurrence-navn/-periode og kunde-id + beløb.
//  main.jsx afgør FØR noget andet kører, om denne side skal vises i stedet for
//  <App/>, så en besøger her aldrig får adgang til resten af appen.
//  Data hentes KUN ved indlæsning og når nogen trykker "Opdater" — ingen automatisk
//  baggrunds-polling, for at spare på database-forbruget.
// ============================================================

const INK = "#141414", GOLD = "#F5B301", PANEL = "#1c1c1c", SUB = "#9ca3af";
// timeZone eksplicit sat til dansk tid — ellers viser den besøgendes egen enheds/
// browsers tidszone (kan være forkert, fx UTC), ikke Europe/Copenhagen.
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Copenhagen" }) : "");
const fmtAmt = (n) => (Math.round(n) || 0).toLocaleString("da-DK");

// Nutid, opdateret hvert sekund — driver den live nedtælling.
function useNow(intervalMs) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatCountdown(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  const parts = [];
  if (days > 0) parts.push(`${days} dag${days === 1 ? "" : "e"}`);
  if (days > 0 || hours > 0) parts.push(`${hours} time${hours === 1 ? "" : "r"}`);
  parts.push(`${mins} min`);
  return parts.join(" ");
}

// Leaderboardet opdateres BEVIDST ikke automatisk i baggrunden (kun useNow ovenfor,
// som blot er et lokalt ur til nedtællingen — ingen netværkskald) for at spare på
// database-forbruget. Friske tal hentes udelukkende når nogen trykker "Opdater".
const PUBLIC_URL = typeof window !== "undefined" ? `${window.location.origin}/leaderboard` : "https://mirrorpawn-app.vercel.app/leaderboard";

export default function PublicLeaderboard() {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const now = useNow(1000);

  const fetchLeaderboard = (isInitial) => {
    if (isInitial) setState((s) => ({ ...s, loading: true, error: "" }));
    else setRefreshing(true);
    return loadPublicLeaderboard()
      .then((data) => setState({ loading: false, error: "", data }))
      .catch(() => setState((s) => ({ ...s, loading: false, error: "Kunne ikke hente leaderboardet lige nu. Prøv igen om lidt." })))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => { fetchLeaderboard(true); }, []);

  const handleShare = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(PUBLIC_URL);
      } else {
        const ta = document.createElement("textarea");
        ta.value = PUBLIC_URL;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const active = !state.loading && !state.error && state.data && state.data.active;
  const entries = active ? (state.data.entries || []) : [];
  const prizePool = active ? +state.data.prize_pool || 0 : 0;
  const startMs = active && state.data.start_at ? new Date(state.data.start_at).getTime() : null;
  const endMs = active && state.data.end_at ? new Date(state.data.end_at).getTime() : null;

  let countdown = null;
  if (active) {
    if (startMs && now < startMs) countdown = { text: `Starter om: ${formatCountdown(startMs - now)}`, ended: false, notStarted: true };
    else if (endMs && now >= endMs) countdown = { text: "Konkurrencen er slut", ended: true };
    else if (endMs) countdown = { text: `Slutter om: ${formatCountdown(endMs - now)}`, ended: false };
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: INK, color: "white" }}>
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Trophy size={26} color={GOLD} />
          <div className="text-2xl font-black">Leaderboard</div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <button onClick={() => fetchLeaderboard(false)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold"
            style={{ background: PANEL, color: GOLD, border: "1px solid #333", opacity: refreshing ? .6 : 1 }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Opdaterer…" : "Opdater"}
          </button>
          <button onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold"
            style={{ background: copied ? GOLD : PANEL, color: copied ? INK : GOLD, border: `1px solid ${copied ? GOLD : "#333"}` }}>
            <Share2 size={14} /> {copied ? "Link kopieret!" : "Del"}
          </button>
        </div>

        {state.loading && (
          <div className="text-center text-sm" style={{ color: SUB }}>Henter…</div>
        )}
        {!state.loading && state.error && (
          <div className="text-center text-sm font-bold" style={{ color: "#e57373" }}>{state.error}</div>
        )}
        {!state.loading && !state.error && !active && (
          <div className="text-center text-sm" style={{ color: SUB }}>
            Der er ingen aktiv konkurrence lige nu — kom tilbage senere.
          </div>
        )}

        {active && (
          <>
            {prizePool > 0 && (
              <div className="text-center mb-6 rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #ffe08a 100%)` }}>
                <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: INK, opacity: .75 }}>🏆 Præmiepulje</div>
                <div className="text-4xl sm:text-5xl font-black leading-tight" style={{ color: INK }}>{fmtAmt(prizePool)} kr.</div>
                <div className="text-xs font-bold mt-1.5" style={{ color: INK, opacity: .8 }}>Vinderen tager det hele</div>
              </div>
            )}

            <div className="text-center mb-3">
              <div className="text-xl font-black" style={{ color: GOLD }}>{state.data.name}</div>
              {(state.data.start_at || state.data.end_at) && (
                <div className="text-xs mt-1" style={{ color: SUB }}>
                  {fmtDate(state.data.start_at)}{state.data.start_at && state.data.end_at ? " – " : ""}{fmtDate(state.data.end_at)}
                </div>
              )}
            </div>

            {countdown && (
              <div className="text-center mb-6">
                <span className="inline-block px-4 py-2 rounded-full text-sm font-bold"
                  style={{
                    background: countdown.ended ? "#2a2a2a" : PANEL,
                    color: countdown.ended ? SUB : (countdown.notStarted ? "white" : GOLD),
                    border: `1px solid ${countdown.ended ? "#3a3a3a" : GOLD}`,
                  }}>
                  {countdown.text}
                </span>
              </div>
            )}

            <div className="space-y-2">
              {entries.length === 0 && (
                <div className="text-center text-sm" style={{ color: SUB }}>Ingen handler endnu i denne periode.</div>
              )}
              {entries.map((row, i) => (
                <div key={row.cust_id} className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: PANEL, border: i === 0 ? `1px solid ${GOLD}` : "1px solid #333" }}>
                  <div className="flex items-center gap-3">
                    <span className="font-black w-6 text-center" style={{ color: i === 0 ? GOLD : SUB }}>{i + 1}</span>
                    <span className="font-bold">{row.cust_id}</span>
                  </div>
                  <span className="font-black" style={{ color: GOLD }}>{fmtAmt(row.total)} kr.</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
