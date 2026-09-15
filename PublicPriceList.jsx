import { useEffect, useMemo, useState } from "react";
import { Package, RefreshCw, Search } from "lucide-react";
import { loadPublicPriceList } from "./supabase-store.js";

// ============================================================
//  MIRROR PAWN — Offentlig prisliste-side (/priser)
//
//  Selvstændig, login-fri side, efter SAMME mønster som PublicLeaderboard.jsx.
//  Importerer BEVIDST intet fra App.jsx og kalder aldrig signIn/getSession/
//  onAuthChange/loadConfig/loadSales/loadInventory/loadCash eller nogen anden
//  funktion, der rører resten af systemet — kun loadPublicPriceList()
//  (get_public_pricelist()-RPC'en), som i databasen kun har lov til at returnere
//  navn, købspris, salgspris og en "på lager"-boolean for varer markeret
//  "vis offentligt". main.jsx afgør FØR noget andet kører, om denne side skal
//  vises i stedet for <App/>, så en besøger her aldrig får adgang til resten
//  af appen.
//  Data hentes KUN ved indlæsning og når nogen trykker "Opdater" — ingen
//  automatisk baggrunds-polling, for at spare på database-forbruget.
// ============================================================

const INK = "#141414", GOLD = "#F5B301", PANEL = "#1c1c1c", SUB = "#9ca3af";
const fmtAmt = (n) => (Math.round(n) || 0).toLocaleString("da-DK");

export default function PublicPriceList() {
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");

  const fetchList = (isInitial) => {
    if (isInitial) setState((s) => ({ ...s, loading: true, error: "" }));
    else setRefreshing(true);
    return loadPublicPriceList()
      .then((items) => setState({ loading: false, error: "", items: items || [] }))
      .catch(() => setState((s) => ({ ...s, loading: false, error: "Kunne ikke hente prislisten lige nu. Prøv igen om lidt." })))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => { fetchList(true); }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const items = state.items || [];
    return term ? items.filter((it) => (it.name || "").toLowerCase().includes(term)) : items;
  }, [state.items, q]);

  return (
    <div className="min-h-screen font-sans" style={{ background: INK, color: "white" }}>
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center rounded-lg font-black" style={{ background: GOLD, color: INK, width: 34, height: 34, fontSize: 18 }}>◆</span>
          <div className="text-2xl font-black">Mirror Pawn</div>
        </div>
        <div className="text-center text-xs uppercase tracking-widest font-bold mb-6" style={{ color: GOLD }}>Prisliste</div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <button onClick={() => fetchList(false)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold"
            style={{ background: PANEL, color: GOLD, border: "1px solid #333", opacity: refreshing ? .6 : 1 }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Opdaterer…" : "Opdater"}
          </button>
        </div>

        {state.loading && (
          <div className="text-center text-sm" style={{ color: SUB }}>Henter…</div>
        )}
        {!state.loading && state.error && (
          <div className="text-center text-sm font-bold" style={{ color: "#e57373" }}>{state.error}</div>
        )}

        {!state.loading && !state.error && (
          <>
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-3" style={{ color: SUB }} />
              <input placeholder="Søg vare…" value={q} onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm"
                style={{ borderColor: "#333", background: PANEL, color: "white" }} />
            </div>

            {state.items.length === 0 && (
              <div className="text-center text-sm" style={{ color: SUB }}>
                Ingen varer er sat til at vise på prislisten lige nu — kom tilbage senere.
              </div>
            )}
            {state.items.length > 0 && shown.length === 0 && (
              <div className="text-center text-sm" style={{ color: SUB }}>Ingen varer matcher "{q}".</div>
            )}

            <div className="space-y-2">
              {shown.map((it, i) => (
                <div key={it.name + i} className="rounded-xl px-4 py-3" style={{ background: PANEL, border: "1px solid #333" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold min-w-0 truncate flex items-center gap-2">
                      <Package size={14} style={{ color: SUB }} className="shrink-0" />
                      <span className="truncate">{it.name}</span>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"
                      style={it.in_stock
                        ? { background: "rgba(74,222,128,.15)", color: "#4ade80" }
                        : { background: "rgba(248,113,113,.12)", color: "#f87171" }}>
                      {it.in_stock ? "På lager" : "Udsolgt"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-sm">
                    <span style={{ color: SUB }}>Køb: <span className="font-bold text-white">{fmtAmt(it.price)} kr.</span></span>
                    <span style={{ color: SUB }}>Salg: <span className="font-bold" style={{ color: GOLD }}>{fmtAmt(it.sell)} kr.</span></span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
