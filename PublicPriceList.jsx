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
//  navn, købspris, salgspris, en "på lager"-boolean, en valgfri billede-URL og
//  kategori-navn for varer markeret "vis offentligt". main.jsx afgør FØR noget
//  andet kører, om denne side skal vises i stedet for <App/>, så en besøger her
//  aldrig får adgang til resten af appen.
//  Data hentes KUN ved indlæsning og når nogen trykker "Opdater" — ingen
//  automatisk baggrunds-polling, for at spare på database-forbruget.
// ============================================================

// ── Redigér HER: butiksfacade-tekst under logoet ────────────────────────────
// Ret frit i disse tre linjer — ingen kode-viden nødvendig, bare gem og upload
// filen igen. Et tomt felt ("") vises bare ikke på siden.
const STOREFRONT_TAGLINE = "Vi køber og sælger — kom forbi Mirror Park";
const STOREFRONT_HOURS = ""; // fx: "Åbent: Man–Søn 10:00–22:00"
const STOREFRONT_DISCORD_URL = ""; // fx: "https://discord.gg/dit-invite"
// ─────────────────────────────────────────────────────────────────────────

const INK = "#141414", GOLD = "#F5B301", PANEL = "#1c1c1c", SUB = "#9ca3af";
const fmtAmt = (n) => (Math.round(n) || 0).toLocaleString("da-DK");

// Ét vare-kort: billede (eller ikon-fallback, hvis billede_url mangler ELLER fejler
// med at loade), lagerstatus-badge, og priser — salgsprisen (hvad kunden betaler)
// fremhævet, købsprisen (hvad vi giver kunden) afdæmpet.
function PriceCard({ it }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = !!it.image_url && !imgError;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: PANEL, border: "1px solid #333" }}>
      <div className="w-full h-28 flex items-center justify-center" style={{ background: "#111" }}>
        {hasImage ? (
          <img src={it.image_url} alt={it.name} onError={() => setImgError(true)}
            className="w-full h-full object-cover" />
        ) : (
          <Package size={28} style={{ color: "#444" }} />
        )}
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="font-bold min-w-0 truncate">{it.name}</div>
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"
            style={it.in_stock
              ? { background: "rgba(74,222,128,.15)", color: "#4ade80" }
              : { background: "rgba(248,113,113,.12)", color: "#f87171" }}>
            {it.in_stock ? "På lager" : "Udsolgt"}
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="text-[11px]" style={{ color: SUB }}>
            Køb: <span className="font-semibold" style={{ color: "#c9c9c9" }}>{fmtAmt(it.price)} kr.</span>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wide font-bold" style={{ color: SUB }}>Salgspris</div>
            <div className="text-xl font-black tabular-nums leading-tight" style={{ color: GOLD }}>{fmtAmt(it.sell)} kr.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicPriceList() {
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [q, setQ] = useState("");

  const fetchList = (isInitial) => {
    if (isInitial) setState((s) => ({ ...s, loading: true, error: "" }));
    else setRefreshing(true);
    return loadPublicPriceList()
      .then((items) => { setState({ loading: false, error: "", items: items || [] }); setUpdatedAt(new Date()); })
      .catch(() => setState((s) => ({ ...s, loading: false, error: "Kunne ikke hente prislisten lige nu. Prøv igen om lidt." })))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => { fetchList(true); }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const items = state.items || [];
    return term ? items.filter((it) => (it.name || "").toLowerCase().includes(term)) : items;
  }, [state.items, q]);

  // Grupperer de viste varer efter kategori (varer uden kategori havner i "Andet" —
  // se coalesce(...,'Andet') i get_public_pricelist()). Kategorier sorteres
  // alfabetisk, men "Andet" ligger altid sidst, som en fangst-alt-gruppe.
  const groups = useMemo(() => {
    const map = new Map();
    shown.forEach((it) => {
      const cat = (it.category || "").trim() || "Andet";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(it);
    });
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === "Andet") return 1;
      if (b === "Andet") return -1;
      return a.localeCompare(b, "da");
    });
    return keys.map((cat) => ({ cat, items: map.get(cat) }));
  }, [shown]);

  const hasStorefrontInfo = STOREFRONT_TAGLINE || STOREFRONT_HOURS || STOREFRONT_DISCORD_URL;

  return (
    <div className="min-h-screen font-sans" style={{ background: INK, color: "white" }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center rounded-lg font-black" style={{ background: GOLD, color: INK, width: 34, height: 34, fontSize: 18 }}>◆</span>
          <div className="text-2xl font-black">Mirror Pawn</div>
        </div>
        <div className="text-center text-xs uppercase tracking-widest font-bold mb-3" style={{ color: GOLD }}>Prisliste</div>

        {hasStorefrontInfo && (
          <div className="text-center text-xs mb-6 space-y-1" style={{ color: SUB }}>
            {STOREFRONT_TAGLINE && <div>{STOREFRONT_TAGLINE}</div>}
            {STOREFRONT_HOURS && <div>{STOREFRONT_HOURS}</div>}
            {STOREFRONT_DISCORD_URL && (
              <div>
                <a href={STOREFRONT_DISCORD_URL} target="_blank" rel="noopener noreferrer" className="font-bold" style={{ color: GOLD }}>
                  Vores Discord
                </a>
              </div>
            )}
          </div>
        )}

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
            <div className="relative mb-5">
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

            <div className="space-y-6">
              {groups.map((g) => (
                <div key={g.cat}>
                  <div className="text-xs font-black uppercase tracking-widest mb-2 px-0.5" style={{ color: GOLD }}>{g.cat}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {g.items.map((it, i) => <PriceCard key={it.name + i} it={it} />)}
                  </div>
                </div>
              ))}
            </div>

            {updatedAt && (
              <div className="text-center text-[11px] mt-8" style={{ color: SUB }}>
                Priser opdateret: {updatedAt.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
