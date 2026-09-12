import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
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
// ============================================================

const INK = "#141414", GOLD = "#F5B301", PANEL = "#1c1c1c", SUB = "#9ca3af";
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short" }) : "");
const fmtAmt = (n) => (Math.round(n) || 0).toLocaleString("da-DK");

export default function PublicLeaderboard() {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let cancelled = false;
    loadPublicLeaderboard()
      .then((data) => { if (!cancelled) setState({ loading: false, error: "", data }); })
      .catch(() => { if (!cancelled) setState({ loading: false, error: "Kunne ikke hente leaderboardet lige nu. Prøv igen om lidt.", data: null }); });
    return () => { cancelled = true; };
  }, []);

  const active = !state.loading && !state.error && state.data && state.data.active;
  const entries = active ? (state.data.entries || []) : [];

  return (
    <div className="min-h-screen font-sans" style={{ background: INK, color: "white" }}>
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Trophy size={26} color={GOLD} />
          <div className="text-2xl font-black">Leaderboard</div>
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
            <div className="text-center mb-6">
              <div className="text-xl font-black" style={{ color: GOLD }}>{state.data.name}</div>
              {(state.data.start_at || state.data.end_at) && (
                <div className="text-xs mt-1" style={{ color: SUB }}>
                  {fmtDate(state.data.start_at)}{state.data.start_at && state.data.end_at ? " – " : ""}{fmtDate(state.data.end_at)}
                </div>
              )}
            </div>
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
