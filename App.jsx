import { useState, useEffect, useRef } from "react";
import { Plus, Minus, X, Trash2, RotateCcw, Settings, Check, Search, Receipt, BarChart3, Save, Clock, User, Users, LogOut, Award, ChevronLeft, Lock } from "lucide-react";
import {
  loadConfig, saveConfig as sbSaveConfig, loadSales as sbLoadSales, insertSale, logEvent,
  signIn, signOut, getSession, onAuthChange, loadMyProfile, loadAllProfiles,
  createStaff, updateStaff, deleteStaff,
} from "./supabase-store.js";

/* ── Pawnshop-beregner ────────────────────────────────────────────
   Vælg materialer, sæt mængde (og evt. ret prisen pr. handel),
   se totalen kunden skal have. Priser gemmes lokalt. */

const KEY = "pawn_config_v1";
const LOG_KEY = "pawn_sales_v1";
const BLUE = "#1F3864", GREEN = "#2E7D32", ORANGE = "#E67E22", RED = "#C0392B";
const BLUE_T = "#EEF2F9", GREEN_T = "#EDF6EE";
const INK = "#141414", GOLD = "#F5B301", GOLD_D = "#C99400", PANEL = "#1c1c1c";

const DEFAULT_CONFIG = {
  shopName: "Udbetalingsberegner",
  currency: "kr.",
  categories: ["Materialer", "Heists", "Våben & Udstyr", "Andet"],
  pointsPer: 1000,
  levels: [
    { name: "Bronze", min: 0 },
    { name: "Sølv", min: 25 },
    { name: "Guld", min: 100 },
    { name: "Platin", min: 300 },
    { name: "VIP", min: 750 },
  ],
  materials: [
    { id: "m1", name: "Træ", price: 30, sell: 50, unit: "stk.", cat: "Materialer" },
    { id: "m2", name: "Tekstil", price: 105, sell: 200, unit: "stk.", cat: "Materialer" },
    { id: "m3", name: "Kobber", price: 125, sell: 200, unit: "stk.", cat: "Materialer" },
    { id: "m4", name: "Plastik", price: 105, sell: 200, unit: "stk.", cat: "Materialer" },
    { id: "m5", name: "Metalskrot", price: 105, sell: 200, unit: "stk.", cat: "Materialer" },
    { id: "m6", name: "Glas", price: 30, sell: 50, unit: "stk.", cat: "Materialer" },
    { id: "m7", name: "Gummi", price: 125, sell: 250, unit: "stk.", cat: "Materialer" },
    { id: "m8", name: "Stål", price: 100, sell: 250, unit: "stk.", cat: "Materialer" },
    { id: "m9", name: "Elektronik", price: 80, sell: 80, unit: "stk.", cat: "Andet" },
    { id: "m10", name: "Genbrugs Blå Kasser", price: 300, sell: 500, unit: "stk.", cat: "Materialer" },
    { id: "m11", name: "Bandage", price: 1000, sell: 1500, unit: "stk.", cat: "Materialer" },
    { id: "m12", name: "Lyddæmper", price: 25000, sell: 50000, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m13", name: "Vest", price: 5000, sell: 20000, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m14", name: "Plader", price: 5000, sell: 20000, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m15", name: "Rød Usb", price: 35000, sell: 35000, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m16", name: "Grøn Usb", price: 70000, sell: 70000, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m17", name: "Blå Usb", price: 150000, sell: 150000, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m18", name: "Thermite", price: 150000, sell: 300000, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m19", name: "C4", price: 50000, sell: 75000, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m20", name: "Fleca Bank", price: 5000, sell: 10000, unit: "stk.", cat: "Heists" },
    { id: "m21", name: "Juvel Heist", price: 10000, sell: 25000, unit: "stk.", cat: "Heists" },
    { id: "m22", name: "Oilrig Heist", price: 25000, sell: 60000, unit: "stk.", cat: "Heists" },
    { id: "m23", name: "Container Heist", price: 50000, sell: 100000, unit: "stk.", cat: "Heists" },
    { id: "m24", name: "Laptops", price: 12500, sell: 25000, unit: "stk.", cat: "Andet" },
    { id: "m25", name: "44 Magnum Skud", price: 400, sell: 1200, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m26", name: "50.AE", price: 800, sell: 1200, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m27", name: "9mm skud", price: 800, sell: 1200, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m28", name: "45.CAP", price: 800, sell: 1200, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m29", name: "38.LC", price: 800, sell: 1200, unit: "stk.", cat: "Våben & Udstyr" },
    { id: "m30", name: "12.GA", price: 400, sell: 1200, unit: "stk.", cat: "Våben & Udstyr" },
  ]
};

const fmt = (n) => (Math.round(n) || 0).toLocaleString("da-DK");

export default function App() {
  // ── Login (Supabase Auth) ──
  const [session, setSession] = useState(undefined); // undefined = tjekker session, null = ikke logget ind
  const [profile, setProfile] = useState(null); // { id, username, name, role }
  const [authErr, setAuthErr] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    getSession().then((s) => setSession(s || null));
    const unsub = onAuthChange((s) => setSession(s || null));
    return unsub;
  }, []);
  useEffect(() => {
    if (session?.user) loadMyProfile(session.user.id).then(setProfile).catch(() => setProfile(null));
    else setProfile(null);
  }, [session]);

  const doLogin = async () => {
    setAuthErr(""); setLoginBusy(true);
    try {
      await signIn(loginUser, loginPass);
      setLoginPass("");
    } catch (e) {
      setAuthErr("Forkert brugernavn eller kodeord.");
    } finally {
      setLoginBusy(false);
    }
  };
  const doLogout = async () => {
    await signOut();
    setSession(null); setProfile(null); setView("beregner"); setShowSettings(false);
  };

  const [config, setConfig] = useState(null);
  const [cart, setCart] = useState({}); // id -> { qty, price }
  const [q, setQ] = useState("");
  const [sales, setSales] = useState([]);
  const [view, setView] = useState("beregner"); // beregner | log | kunder | ansatte
  const [receipt, setReceipt] = useState(null);
  const [activeCat, setActiveCat] = useState("Alle");
  const [savedFlash, setSavedFlash] = useState(false);
  const [custId, setCustId] = useState("");
  const [openCust, setOpenCust] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoWide, setAutoWide] = useState(typeof window !== "undefined" && window.innerWidth >= 1000);
  const [mode, setMode] = useState("auto");
  useEffect(() => {
    const onR = () => setAutoWide(window.innerWidth >= 1000);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  const wide = mode === "pc" ? true : mode === "mobil" ? false : autoWide;
  const [staffList, setStaffList] = useState([]);
  const refreshStaff = async () => { try { setStaffList(await loadAllProfiles()); } catch (e) {} };

  const canManageStore = !!profile && (profile.role === "ejer" || profile.role === "manager");
  const isOwner = !!profile && profile.role === "ejer";
  const toggleSettings = () => {
    if (showSettings) { setShowSettings(false); editingRef.current = false; return; }
    if (!canManageStore) return;
    setShowSettings(true); editingRef.current = true;
  };

  const loadConfigFn = async (isFirst) => {
    try {
      const c = await loadConfig();
      if (c && c.materials) {
        c.materials = (c.materials || []).map((m) => ({ unit: "stk.", sell: m.sell ?? m.price, ...m }));
        setConfig({ ...DEFAULT_CONFIG, ...c });
        return;
      }
    } catch (e) {}
    if (isFirst) {
      const def = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      setConfig(def);
      try { await sbSaveConfig(def); } catch (e) {}
    }
  };
  const loadSalesFn = async () => {
    try {
      const rows = await sbLoadSales();
      // map DB-felter -> app-format
      setSales((rows || []).map((r) => ({
        id: "t" + r.id, at: new Date(r.at).getTime(), custId: r.cust_id || "",
        points: r.points, lines: r.lines, total: +r.total, sellTotal: +r.sell_total, profit: +r.profit,
        sellerId: r.seller_id || "", sellerName: r.seller_name || "", commission: +r.commission || 0,
      })));
    } catch (e) {}
  };
  // sletning/rydning håndteres via DB separat; behold lokalt fallback
  const saveSales = async (next) => { setSales(next); };
  const editingRef = useRef(false);
  useEffect(() => { if (profile) { loadConfigFn(true); loadSalesFn(); refreshStaff(); } }, [profile]);
  useEffect(() => {
    if (!profile) return;
    const poll = setInterval(() => {
      // hent nye priser i baggrunden — men aldrig mens ejeren redigerer
      if (!editingRef.current && document.visibilityState === "visible") { loadConfigFn(false); loadSalesFn(); }
    }, 12000);
    const onVis = () => { if (document.visibilityState === "visible" && !editingRef.current) { loadConfigFn(false); loadSalesFn(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(poll); document.removeEventListener("visibilitychange", onVis); };
  }, [profile]);

  const saveConfig = async (next) => {
    const prev = config;
    setConfig(next);
    try {
      await sbSaveConfig(next);
      // log prisændring til Discord
      if (prev && JSON.stringify(prev.materials) !== JSON.stringify(next.materials)) {
        logEvent("price", { summary: "Priser/materialer blev opdateret i pawnshoppen." });
      }
    } catch (e) {}
  };

  if (session === undefined) return <FullScreenMsg text="Henter…" />;
  if (!session) return (
    <LoginScreen username={loginUser} setUsername={setLoginUser} password={loginPass} setPassword={setLoginPass}
      err={authErr} busy={loginBusy} onSubmit={doLogin} />
  );
  if (!profile || !config) return <FullScreenMsg text="Henter…" />;
  const materials = config.materials;
  const cur = config.currency;

  const inCart = (id) => cart[id]?.qty > 0;
  const setQty = (m, qty) => {
    const next = { ...cart };
    if (qty <= 0) delete next[id(m)];
    else next[id(m)] = { qty, price: cart[id(m)]?.price ?? m.price };
    setCart(next);
  };
  const setPrice = (mid, price) => setCart({ ...cart, [mid]: { ...cart[mid], price } });
  const id = (m) => m.id;

  const lines = materials
    .filter((m) => cart[m.id]?.qty > 0)
    .map((m) => {
      const qty = cart[m.id].qty, price = cart[m.id].price;
      const sell = m.sell ?? m.price;
      return { m, qty, price, sum: qty * price, sellSum: qty * sell };
    });
  const total = lines.reduce((a, l) => a + l.sum, 0);
  const sellTotal = lines.reduce((a, l) => a + l.sellSum, 0);
  const profit = sellTotal - total;

  const shown = materials.filter((m) =>
    m.name.toLowerCase().includes(q.trim().toLowerCase()) &&
    (activeCat === "Alle" || (m.cat || "Materialer") === activeCat));

  const cats = ["Alle", ...(config.categories || ["Materialer"])];

  const saveTrade = () => {
    if (lines.length === 0) return;
    const pts = Math.floor(total / (config.pointsPer || 1000));
    const trade = {
      id: "t" + Date.now(), at: Date.now(),
      custId: custId.trim(),
      points: pts,
      lines: lines.map((l) => ({ name: l.m.name, qty: l.qty, price: l.price, unit: l.m.unit, sum: l.sum, sellSum: l.sellSum })),
      total, sellTotal, profit,
      sellerId: profile.id, sellerName: profile.name, commission: 0,
    };
    // beregn evt. niveau-skift FØR vs EFTER for kunden
    const id = custId.trim();
    let prevPoints = 0;
    if (id) sales.forEach((t) => { if ((t.custId || "") === id) prevPoints += (t.points || 0); });
    const wasNew = id && prevPoints === 0;
    const beforeLvl = levelFor(prevPoints, config.levels).cur.name;
    const afterLvl = levelFor(prevPoints + pts, config.levels).cur.name;

    setSales([trade, ...sales].slice(0, 500));
    setReceipt(trade);
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500);
    if (navigator.vibrate) navigator.vibrate(40);
    setCart({}); setCustId("");

    // skriv til databasen + log hændelser til Discord
    (async () => {
      try {
        await insertSale(trade);
        if (id && wasNew) await logEvent("newcustomer", { custId: id });
        if (id && afterLvl !== beforeLvl) await logEvent("levelup", { custId: id, level: afterLvl, points: prevPoints + pts });
      } catch (e) {}
    })();
  };

  return (
    <div className={"min-h-screen font-sans w-full" + (wide ? " text-white" : " text-stone-900 pb-40 mx-auto")}
      style={{ maxWidth: wide ? "100%" : 480, background: wide ? INK : "#fafaf9" }}>
      <style>{`button{transition:all .12s ease}button:active{transform:scale(.97)}`}</style>
      {savedFlash && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-black text-sm shadow-lg"
          style={{ background: GREEN, color: "white" }}>✓ Handel gemt</div>
      )}

      {/* Header */}
      <div className={"flex items-center justify-between " + (wide ? "px-8 py-6" : "px-4 pt-4 pb-3 text-white")}
        style={wide
          ? { background: `linear-gradient(135deg, ${INK} 0%, #232323 60%, ${INK} 100%)`, borderBottom: `3px solid ${GOLD}` }
          : { background: INK, borderBottom: `3px solid ${GOLD}` }}>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-lg font-black shrink-0"
            style={{ background: GOLD, color: INK, width: wide ? 52 : 40, height: wide ? 52 : 40, fontSize: wide ? 26 : 20 }}>◆</span>
          <div>
            <div className="uppercase tracking-widest font-bold" style={{ color: GOLD, fontSize: wide ? 11 : 10 }}>Buy · Sell · Trade</div>
            <div className={"font-black leading-none text-white " + (wide ? "text-3xl" : "text-lg")}>{config.shopName}</div>
            {wide && <div className="text-[10px] text-stone-500 mt-1 flex items-center gap-1"><Clock size={10} /> Priser synkroniseres automatisk</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 pl-3 pr-3 py-2 rounded-full text-xs font-bold"
            style={{ background: "rgba(245,179,1,.15)", color: GOLD }}>
            <User size={14} /> {profile.name} <span style={{ opacity: .6 }}>· {profile.role}</span>
          </div>
          <div className="hidden sm:flex rounded-full overflow-hidden text-[11px] font-bold" style={{ border: "1px solid rgba(245,179,1,.4)" }}>
            {[["auto", "Auto"], ["mobil", "Telefon"], ["pc", "PC"]].map(([v, l]) => (
              <button key={v} onClick={() => setMode(v)} className="px-2.5 py-1.5"
                style={mode === v ? { background: GOLD, color: INK } : { color: GOLD }}>{l}</button>
            ))}
          </div>
          <button onClick={() => { setView(view === "kunder" ? "beregner" : "kunder"); setShowSettings(false); setOpenCust(null); }}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "kunder" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <User size={16} /> Kunder
          </button>
          {isOwner && (
            <button onClick={() => { setView(view === "ansatte" ? "beregner" : "ansatte"); setShowSettings(false); }}
              className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
              style={view === "ansatte" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
              <Users size={16} /> Ansatte
            </button>
          )}
          <button onClick={() => { setView(view === "log" ? "beregner" : "log"); setShowSettings(false); }}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "log" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <BarChart3 size={16} /> Dagbog
          </button>
          {canManageStore && (
            <button onClick={toggleSettings}
              className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
              style={{ background: GOLD, color: INK }}
              aria-label="Rediger materialer og priser">
              <Settings size={16} /> {showSettings ? "Luk" : "Rediger"}
            </button>
          )}
          <button onClick={doLogout} title="Log ud"
            className="flex items-center justify-center w-9 h-9 rounded-full font-black text-sm"
            style={{ background: "rgba(245,179,1,.15)", color: GOLD }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {view === "kunder" && !showSettings ? (
        <Customers sales={sales} config={config} cur={cur} wide={wide} openCust={openCust} setOpenCust={setOpenCust} />
      ) : view === "ansatte" && !showSettings && isOwner ? (
        <StaffAdmin staffList={staffList} refresh={refreshStaff} myId={profile.id} wide={wide} />
      ) : view === "log" && !showSettings ? (
        <SalesLog sales={sales} cur={cur} wide={wide} onClear={() => { if (isOwner) saveSales([]); }} role={profile.role}
          onDelete={(id) => saveSales(sales.filter((s) => s.id !== id))} />
      ) : showSettings ? (
        <PriceSettings config={config} save={saveConfig} close={() => { setShowSettings(false); editingRef.current = false; }} wide={wide} />
      ) : (
        <div className={wide ? "flex gap-5 px-8 pt-6 items-start" : "px-3 pt-3 space-y-2"}>
          <div className={wide ? "flex-1 min-w-0 space-y-3" : "space-y-2"}>
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-2.5 text-stone-400" />
            <input placeholder="Søg materiale…" value={q} onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm"
              style={wide ? { borderColor: "#3a3a3a", background: PANEL, color: "white" } : { borderColor: "#d6d3d1", background: "white" }} />
          </div>
          {canManageStore && (
            <button onClick={toggleSettings}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed text-sm font-semibold"
              style={wide ? { borderColor: "#3a3a3a", color: GOLD } : { borderColor: "#d6d3d1", color: "#78716c" }}>
              <Settings size={15} /> Rediger, tilføj eller slet materialer
            </button>
          )}
          {(config.categories || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <button key={c} onClick={() => setActiveCat(c)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold border"
                  style={activeCat === c
                    ? { background: GOLD, color: INK, borderColor: GOLD }
                    : (wide ? { borderColor: "#3a3a3a", color: "#9ca3af", background: "transparent" } : { borderColor: "#d6d3d1", color: "#57534e", background: "white" })}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className={wide ? "grid gap-3" : ""}
            style={wide ? { gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" } : {}}>
          {shown.map((m) => {
            const c = cart[m.id];
            const active = c?.qty > 0;
            const dark = wide;
            return (
              <div key={m.id} className="rounded-xl border p-3"
                style={dark
                  ? { background: PANEL, borderColor: active ? GOLD : "#333", borderLeft: active ? `3px solid ${GOLD}` : "1px solid #333" }
                  : { background: "white", borderColor: active ? INK : "#e7e5e4" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold" style={{ color: dark ? "white" : INK }}>{m.name}</div>
                    <div className="text-[11px]" style={{ color: dark ? "#9ca3af" : "#a8a29e" }}>
                      Køb {fmt(m.price)} · <span style={{ color: GOLD }}>Salg {fmt(m.sell ?? m.price)}</span> {cur} pr. {m.unit || "stk."}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(m, (c?.qty || 0) - 1)}
                      className="w-9 h-9 rounded-lg border flex items-center justify-center disabled:opacity-30"
                      style={{ borderColor: dark ? "#444" : "#d6d3d1", color: dark ? "#ccc" : "#57534e" }}
                      disabled={!active}><Minus size={16} /></button>
                    <input type="number" inputMode="numeric" value={c?.qty || ""} placeholder="0"
                      onChange={(e) => setQty(m, Math.max(0, +e.target.value))}
                      className="w-14 text-center rounded-lg border py-2 text-sm font-bold"
                      style={{ borderColor: dark ? "#444" : "#d6d3d1", background: dark ? "#111" : "white", color: dark ? "white" : INK }} />
                    <button onClick={() => setQty(m, (c?.qty || 0) + 1)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-black"
                      style={{ background: GOLD, color: INK }}>
                      <Plus size={16} /></button>
                  </div>
                </div>
                {active && (
                  <div className="mt-2 pt-2 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${dark ? "#333" : "#f0efed"}` }}>
                    <label className="text-[11px] flex items-center gap-1.5" style={{ color: dark ? "#9ca3af" : "#78716c" }}>
                      Pris/stk.
                      <input type="number" inputMode="numeric" value={c.price}
                        onChange={(e) => setPrice(m.id, +e.target.value)}
                        className="w-20 rounded-lg border px-2 py-1 text-sm font-bold"
                        style={{ borderColor: dark ? "#444" : "#d6d3d1", background: dark ? "#111" : "white", color: dark ? "white" : INK }} />
                    </label>
                    <div className="text-sm font-black tabular-nums" style={{ color: GOLD }}>
                      = {fmt(c.qty * c.price)} {cur}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
          {shown.length === 0 && <div className="text-sm text-stone-400 py-4 text-center">Ingen materialer matcher søgningen.</div>}
          </div>
          {wide && (
            <div className="w-96 shrink-0 sticky top-6">
              <div className="rounded-xl overflow-hidden" style={{ background: PANEL, border: "1px solid #333" }}>
                <div className="px-4 py-2 text-[11px] font-black uppercase tracking-widest" style={{ background: GOLD, color: INK }}>Kassen</div>
                {lines.length > 0 && (
                  <div className="px-4 pt-3 max-h-64 overflow-y-auto">
                    {lines.map((l) => (
                      <div key={l.m.id} className="flex justify-between text-xs py-0.5" style={{ color: "#9ca3af" }}>
                        <span>{l.qty} × {l.m.name}</span>
                        <span className="tabular-nums font-semibold text-white">{fmt(l.sum)} {cur}</span>
                      </div>
                    ))}
                  </div>
                )}
                {lines.length > 0 && (
                  <div className="px-4 pt-2 flex justify-between text-xs" style={{ color: "#9ca3af" }}>
                    <span>Videresalg: <span className="font-bold text-white">{fmt(sellTotal)} {cur}</span></span>
                    <span>Avance: <span className="font-black" style={{ color: profit >= 0 ? "#4ade80" : "#f87171" }}>{fmt(profit)} {cur}</span></span>
                  </div>
                )}
                <div className="px-4 py-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#9ca3af" }}>Kunden skal have</div>
                  <div className="text-4xl font-black tabular-nums" style={{ color: lines.length ? GOLD : "#555" }}>
                    {fmt(total)} <span className="text-xl">{cur}</span>
                  </div>
                  <div className="mt-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#9ca3af" }}>Kunde-ID (server)</label>
                    <input value={custId} onChange={(e) => setCustId(e.target.value)} placeholder="valgfrit"
                      className="w-full mt-1 rounded-lg border px-3 py-2 text-sm font-bold"
                      style={{ borderColor: "#444", background: "#111", color: "white" }} />
                    {custId.trim() && lines.length > 0 && (
                      <div className="text-[11px] mt-1" style={{ color: GOLD }}>
                        + {Math.floor(total / (config.pointsPer || 1000))} point til {custId.trim()}
                      </div>
                    )}
                  </div>
                  {lines.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <button onClick={() => saveTrade()}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-black text-base"
                        style={{ background: GOLD, color: INK }}>
                        <Save size={18} /> Gem handel &amp; kvittering
                      </button>
                      <button onClick={() => setCart({})}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm"
                        style={{ background: "transparent", color: "#9ca3af", border: "1px solid #444" }}>
                        <RotateCcw size={15} /> Ryd uden at gemme
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {receipt && <ReceiptModal trade={receipt} config={config} onClose={() => setReceipt(null)} />}

      {/* Total-bjælke (kun telefon) */}
      {!showSettings && !wide && (
        <div className="fixed bottom-0 inset-x-0 mx-auto w-full border-t border-stone-200 bg-white" style={{ maxWidth: 480 }}>
          {lines.length > 0 && (
            <div className="px-4 pt-2 max-h-32 overflow-y-auto">
              {lines.map((l) => (
                <div key={l.m.id} className="flex justify-between text-xs text-stone-500 py-0.5">
                  <span>{l.qty} × {l.m.name}</span>
                  <span className="tabular-nums font-semibold">{fmt(l.sum)} {cur}</span>
                </div>
              ))}
            </div>
          )}
          {lines.length > 0 && (
            <div className="px-4 pt-1 flex justify-between text-xs">
              <span className="text-stone-500">Videresalg: <span className="font-bold text-stone-700">{fmt(sellTotal)} {cur}</span></span>
              <span className="text-stone-500">Din avance: <span className="font-black" style={{ color: profit >= 0 ? GREEN : RED }}>{fmt(profit)} {cur}</span></span>
            </div>
          )}
          {lines.length > 0 && (
            <div className="px-4 pt-2">
              <input value={custId} onChange={(e) => setCustId(e.target.value)} placeholder="Kunde-ID (valgfrit)"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white" />
            </div>
          )}
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Kunden skal have</div>
              <div className="text-3xl font-black tabular-nums" style={{ color: lines.length ? GREEN : "#a8a29e" }}>
                {fmt(total)} <span className="text-lg">{cur}</span>
              </div>
            </div>
            {lines.length > 0 && (
              <button onClick={() => saveTrade()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-white" style={{ background: INK }}>
                <Save size={16} /> Gem
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Kunder & loyalitet ── */
function levelFor(points, levels) {
  const ls = [...(levels || [{ name: "Bronze", min: 0 }])].sort((a, b) => a.min - b.min);
  let cur = ls[0], next = null;
  for (let i = 0; i < ls.length; i++) {
    if (points >= ls[i].min) { cur = ls[i]; next = ls[i + 1] || null; }
  }
  return { cur, next };
}

function buildCustomers(sales) {
  const map = {};
  sales.forEach((t) => {
    const id = (t.custId || "").trim();
    if (!id) return;
    if (!map[id]) map[id] = { id, trades: [], total: 0, profit: 0, points: 0, first: t.at, last: t.at };
    const c = map[id];
    c.trades.push(t); c.total += t.total; c.profit += t.profit; c.points += (t.points || 0);
    c.first = Math.min(c.first, t.at); c.last = Math.max(c.last, t.at);
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function Customers({ sales, config, cur, wide, openCust, setOpenCust }) {
  const [q, setQ] = useState("");
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const custs = buildCustomers(sales);
  const wrap = "pb-10 " + (dk ? "px-8 pt-6 mx-auto " : "px-3 pt-3 ") + (dk ? "text-white" : "");
  const wrapStyle = dk ? { maxWidth: 900 } : {};

  if (openCust) {
    const c = custs.find((x) => x.id === openCust);
    if (!c) { setOpenCust(null); return null; }
    const { cur: lvl, next } = levelFor(c.points, config.levels);
    const itemAgg = {};
    c.trades.forEach((t) => t.lines.forEach((l) => { itemAgg[l.name] = (itemAgg[l.name] || 0) + l.qty; }));
    const topItems = Object.entries(itemAgg).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const progress = next ? Math.min(100, Math.round(((c.points - lvl.min) / (next.min - lvl.min)) * 100)) : 100;
    return (
      <div className={wrap} style={wrapStyle}>
        <button onClick={() => setOpenCust(null)} className="flex items-center gap-1 text-sm font-bold mb-3" style={{ color: dk ? GOLD : BLUE }}>
          <ChevronLeft size={16} /> Tilbage til kunder
        </button>
        <div className="rounded-xl border p-4 mb-3" style={box}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>Kunde-ID</div>
              <div className="text-2xl font-black" style={{ color: dk ? "white" : INK }}>{c.id}</div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-sm" style={{ background: GOLD, color: INK }}>
                <Award size={15} /> {lvl.name}
              </div>
              <div className="text-sm font-black mt-1" style={{ color: dk ? GOLD : INK }}>{c.points} point</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: dk ? "#333" : "#e7e5e4" }}>
              <div className="h-full" style={{ width: progress + "%", background: GOLD }} />
            </div>
            <div className="text-[11px] mt-1" style={{ color: sub }}>
              {next ? `${next.min - c.points} point til ${next.name}` : "Højeste niveau nået 🏆"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[["Handler", c.trades.length], ["Omsætning", fmt(c.total) + " " + cur], ["Avance", fmt(c.profit) + " " + cur]].map(([l, v]) => (
            <div key={l} className="rounded-xl border p-3" style={box}>
              <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>{l}</div>
              <div className="text-base font-black tabular-nums" style={{ color: dk ? "white" : INK }}>{v}</div>
            </div>
          ))}
        </div>
        {topItems.length > 0 && (
          <div className="rounded-xl border p-3 mb-3" style={box}>
            <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Mest solgt</div>
            {topItems.map(([name, qty]) => (
              <div key={name} className="flex justify-between text-sm py-0.5" style={{ color: sub }}>
                <span>{name}</span><span className="font-bold" style={{ color: dk ? "white" : INK }}>{qty} stk.</span>
              </div>
            ))}
          </div>
        )}
        <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Alle handler</div>
        <div className="space-y-2">
          {c.trades.sort((a, b) => b.at - a.at).map((t) => {
            const d = new Date(t.at);
            return (
              <div key={t.id} className="rounded-xl border p-3" style={box}>
                <div className="flex justify-between">
                  <span className="text-[11px]" style={{ color: sub }}>{d.toLocaleDateString("da-DK")} · {d.toTimeString().slice(0, 5)}</span>
                  <span className="font-black tabular-nums" style={{ color: dk ? GOLD : INK }}>{fmt(t.total)} {cur}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: sub }}>{t.lines.map((l) => `${l.qty}× ${l.name}`).join(" · ")}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const shown = custs.filter((c) => c.id.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className={wrap} style={wrapStyle}>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-2.5 top-2.5" style={{ color: sub }} />
        <input placeholder="Søg kunde-ID…" value={q} onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm"
          style={dk ? { borderColor: "#3a3a3a", background: PANEL, color: "white" } : { borderColor: "#d6d3d1", background: "white" }} />
      </div>
      {custs.length === 0 && <div className="text-sm py-6 text-center" style={{ color: sub }}>Ingen kunder endnu. Tilføj et kunde-ID, når du gemmer en handel.</div>}
      <div className="space-y-2">
        {shown.map((c) => {
          const { cur: lvl } = levelFor(c.points, config.levels);
          return (
            <button key={c.id} onClick={() => setOpenCust(c.id)} className="w-full text-left rounded-xl border p-3 flex items-center justify-between" style={box}>
              <div>
                <div className="font-black" style={{ color: dk ? "white" : INK }}>{c.id}</div>
                <div className="text-[11px]" style={{ color: sub }}>{c.trades.length} handler · {c.points} point</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black" style={{ background: dk ? "rgba(245,179,1,.15)" : "#fdf3e7", color: dk ? GOLD : GOLD_D }}>{lvl.name}</span>
                <span className="font-black tabular-nums" style={{ color: dk ? GOLD : INK }}>{fmt(c.total)} {cur}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Ansatte (login-administration, kun ejer) ── */
function StaffAdmin({ staffList, refresh, myId, wide }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const inp = "rounded-lg border px-2 py-2 text-sm " + (dk ? "" : "border-stone-300 bg-white");
  const inpStyle = dk ? { borderColor: "#3a3a3a", background: PANEL, color: "white" } : {};
  const wrap = "pb-10 " + (dk ? "px-8 pt-6 mx-auto " : "px-3 pt-3 ") + (dk ? "text-white" : "");
  const wrapStyle = dk ? { maxWidth: 720 } : {};

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [newForm, setNewForm] = useState({ username: "", password: "", name: "", role: "ansat" });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", role: "ansat", password: "" });

  const submitNew = async () => {
    setErr("");
    if (!newForm.username.trim() || !newForm.password.trim() || !newForm.name.trim()) { setErr("Udfyld brugernavn, kodeord og navn."); return; }
    setBusy(true);
    try {
      await createStaff(newForm.username.trim(), newForm.password, newForm.name.trim(), newForm.role);
      setNewForm({ username: "", password: "", name: "", role: "ansat" });
      await refresh();
    } catch (e) { setErr(e.message || "Kunne ikke oprette ansat."); }
    setBusy(false);
  };
  const startEdit = (p) => { setEditing(p.id); setEditForm({ name: p.name, role: p.role, password: "" }); setErr(""); };
  const submitEdit = async (id) => {
    setBusy(true); setErr("");
    try {
      await updateStaff(id, { name: editForm.name, role: editForm.role, password: editForm.password || undefined });
      setEditing(null);
      await refresh();
    } catch (e) { setErr(e.message || "Kunne ikke gemme ændringer."); }
    setBusy(false);
  };
  const remove = async (id) => {
    if (!window.confirm("Slet denne ansattes konto? Det kan ikke fortrydes.")) return;
    setBusy(true); setErr("");
    try { await deleteStaff(id); await refresh(); } catch (e) { setErr(e.message || "Kunne ikke slette."); }
    setBusy(false);
  };

  return (
    <div className={wrap} style={wrapStyle}>
      <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Ansatte</div>
      {err && <div className="text-xs font-semibold mb-2" style={{ color: RED }}>{err}</div>}
      <div className="space-y-2 mb-4">
        {staffList.map((p) => (
          <div key={p.id} className="rounded-xl border p-3" style={box}>
            {editing === p.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Navn" className={inp + " flex-1 min-w-0"} style={inpStyle} />
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className={inp} style={inpStyle}>
                    <option value="ansat">Ansat</option>
                    <option value="manager">Manager</option>
                    <option value="ejer">Ejer</option>
                  </select>
                </div>
                <input value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Nyt kodeord (kun hvis det skal skiftes)" type="password"
                  className={inp + " w-full"} style={inpStyle} />
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => submitEdit(p.id)} className="flex-1 py-2 rounded-lg font-bold text-sm" style={{ background: GREEN, color: "white" }}>Gem</button>
                  <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg font-bold text-sm border" style={{ borderColor: dk ? "#444" : "#d6d3d1", color: sub }}>Annullér</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black" style={{ color: dk ? "white" : INK }}>
                    {p.name} {p.id === myId && <span className="text-[10px] font-bold" style={{ color: sub }}>(dig)</span>}
                  </div>
                  <div className="text-[11px]" style={{ color: sub }}>@{p.username} · {p.role}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(p)} className="text-xs font-bold px-2 py-1" style={{ color: dk ? GOLD : BLUE }}>Rediger</button>
                  {p.id !== myId && (
                    <button onClick={() => remove(p.id)} className="p-1" style={{ color: dk ? "#666" : "#d6d3d1" }}><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Opret ny ansat</div>
      <div className="rounded-xl border-2 border-dashed p-3 space-y-2" style={{ borderColor: dk ? "#444" : "#d6d3d1" }}>
        <div className="flex items-center gap-2">
          <input value={newForm.username} onChange={(e) => setNewForm({ ...newForm, username: e.target.value })}
            placeholder="Brugernavn" className={inp + " flex-1 min-w-0"} style={inpStyle} />
          <input value={newForm.password} onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
            placeholder="Kodeord (min. 6 tegn)" type="password" className={inp + " flex-1 min-w-0"} style={inpStyle} />
        </div>
        <div className="flex items-center gap-2">
          <input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
            placeholder="Fulde navn" className={inp + " flex-1 min-w-0"} style={inpStyle} />
          <select value={newForm.role} onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}
            className={inp} style={inpStyle}>
            <option value="ansat">Ansat</option>
            <option value="manager">Manager</option>
            <option value="ejer">Ejer</option>
          </select>
        </div>
        <button disabled={busy} onClick={submitNew} className="w-full py-2.5 rounded-lg font-black text-sm" style={{ background: GOLD, color: INK }}>
          <Plus size={15} className="inline mr-1" /> Opret ansat
        </button>
      </div>
      <div className="text-[11px] mt-2" style={dk ? { color: "#6b7280" } : { color: "#a8a29e" }}>
        Rollerne styrer adgang: <b>Ansat</b> kan bruge beregneren. <b>Manager</b> kan også redigere priser. <b>Ejer</b> har fuld adgang, inkl. denne side.
      </div>
    </div>
  );
}

/* ── Login ── */
function LoginScreen({ username, setUsername, password, setPassword, err, busy, onSubmit }) {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans px-4" style={{ background: INK }}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="w-full max-w-xs rounded-2xl p-6" style={{ background: PANEL, border: "1px solid #333" }}>
        <div className="flex items-center justify-center mb-4">
          <span className="inline-flex items-center justify-center rounded-lg font-black" style={{ background: GOLD, color: INK, width: 48, height: 48, fontSize: 24 }}>◆</span>
        </div>
        <div className="text-center uppercase tracking-widest font-bold text-[11px] mb-1" style={{ color: GOLD }}>Buy · Sell · Trade</div>
        <div className="text-center text-white font-black text-xl mb-5">Log ind</div>
        <label className="block mb-3">
          <div className="text-[11px] font-bold uppercase mb-1" style={{ color: "#9ca3af" }}>Brugernavn</div>
          <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm font-bold"
            style={{ borderColor: "#444", background: "#111", color: "white" }} />
        </label>
        <label className="block mb-1">
          <div className="text-[11px] font-bold uppercase mb-1" style={{ color: "#9ca3af" }}>Kodeord</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm font-bold"
            style={{ borderColor: "#444", background: "#111", color: "white" }} />
        </label>
        {err && <div className="text-xs font-semibold mt-2" style={{ color: "#f87171" }}>{err}</div>}
        <button type="submit" disabled={busy || !username.trim() || !password.trim()}
          className="w-full mt-4 flex items-center justify-center gap-1.5 py-3 rounded-xl font-black text-base disabled:opacity-50"
          style={{ background: GOLD, color: INK }}>
          <Lock size={16} /> {busy ? "Logger ind…" : "Log ind"}
        </button>
      </form>
    </div>
  );
}

function FullScreenMsg({ text }) {
  return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-400 font-sans">{text}</div>;
}

/* ── Kvittering ── */
function ReceiptModal({ trade, config, onClose }) {
  const cur = config.currency;
  const d = new Date(trade.at);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 text-center" style={{ background: INK, borderBottom: `3px solid ${GOLD}` }}>
          <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: GOLD }}>Buy · Sell · Trade</div>
          <div className="text-xl font-black text-white">{config.shopName}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Kvittering · {d.toLocaleDateString("da-DK")} {d.toTimeString().slice(0, 5)}</div>
        </div>
        <div className="px-5 py-4 text-stone-900">
          {trade.lines.map((l, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-stone-100">
              <span className="text-stone-700">{l.qty} {l.unit || "stk."} × {l.name}</span>
              <span className="font-semibold tabular-nums text-stone-900">{fmt(l.sum)} {cur}</span>
            </div>
          ))}
          <div className="flex justify-between items-baseline mt-3 pt-2 border-t-2 border-stone-200">
            <span className="font-black uppercase text-xs text-stone-500">Udbetalt</span>
            <span className="text-2xl font-black tabular-nums" style={{ color: GREEN }}>{fmt(trade.total)} {cur}</span>
          </div>
          {trade.custId && (
            <div className="flex justify-between items-baseline mt-1 text-xs">
              <span className="text-stone-500">Kunde {trade.custId}</span>
              <span className="font-bold" style={{ color: GOLD_D }}>+{trade.points} point</span>
            </div>
          )}
          {trade.sellerName && (
            <div className="flex justify-between items-baseline mt-1 text-xs">
              <span className="text-stone-500">Solgt af {trade.sellerName}</span>
            </div>
          )}
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <div className="flex-1 text-[10px] text-stone-400 self-center">Screenshot og send til kunden.</div>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl font-black text-white" style={{ background: INK }}>Færdig</button>
        </div>
      </div>
    </div>
  );
}

/* ── Salgs-dagbog ── */
function SalesLog({ sales, cur, wide, onClear, onDelete, role }) {
  const today = new Date().toISOString().slice(0, 10);
  const isToday = (t) => new Date(t.at).toISOString().slice(0, 10) === today;
  const todays = sales.filter(isToday);
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";

  return (
    <div className={"pb-10 " + (dk ? "px-8 pt-6 mx-auto text-white" : "px-3 pt-3")} style={dk ? { maxWidth: 900 } : {}}>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[["Handler i dag", todays.length, GOLD],
          ["Udbetalt i dag", fmt(sum(todays, (t) => t.total)) + " " + cur, dk ? "#f87171" : RED],
          ["Avance i dag", fmt(sum(todays, (t) => t.profit)) + " " + cur, dk ? "#4ade80" : GREEN]].map(([l, v, c]) => (
          <div key={l} className="rounded-xl border p-3" style={box}>
            <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>{l}</div>
            <div className="text-lg font-black tabular-nums" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-black uppercase tracking-wider" style={{ color: dk ? GOLD : BLUE }}>Alle handler</div>
        {role === "ejer" && sales.length > 0 && (
          <button onClick={onClear} className="text-[11px] font-bold" style={{ color: dk ? "#f87171" : RED }}>Ryd alle</button>
        )}
      </div>
      {sales.length === 0 && <div className="text-sm py-6 text-center" style={{ color: sub }}>Ingen gemte handler endnu. Tryk "Gem handel" efter en beregning.</div>}
      <div className="space-y-2">
        {sales.map((t) => {
          const d = new Date(t.at);
          return (
            <div key={t.id} className="rounded-xl border p-3" style={box}>
              <div className="flex items-center justify-between">
                <div className="text-[11px]" style={{ color: sub }}>
                  {d.toLocaleDateString("da-DK")} · {d.toTimeString().slice(0, 5)}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black tabular-nums" style={{ color: dk ? GOLD : INK }}>{fmt(t.total)} {cur}</span>
                  <button onClick={() => onDelete(t.id)} className="p-1" style={{ color: dk ? "#666" : "#d6d3d1" }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="text-xs mt-1" style={{ color: sub }}>
                {t.custId ? `ID ${t.custId} · ` : ""}{t.lines.map((l) => `${l.qty}× ${l.name}`).join(" · ")}
                {t.points ? ` · +${t.points}p` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Indstillinger: butik, valuta, materialer ── */
function PriceSettings({ config, save, close, wide }) {
  const [shopName, setShopName] = useState(config.shopName);
  const [currency, setCurrency] = useState(config.currency);
  const [pointsPer, setPointsPer] = useState(config.pointsPer || 1000);
  const [levels, setLevels] = useState(config.levels || [{ name: "Bronze", min: 0 }]);
  const [catList, setCatList] = useState(config.categories || ["Materialer"]);
  const [newCat, setNewCat] = useState("");
  const addCat = () => {
    const n = newCat.trim();
    if (!n || catList.includes(n)) return;
    setCatList([...catList, n]); setNewCat("");
  };
  const delCat = (c) => {
    setCatList(catList.filter((x) => x !== c));
    // varer i den slettede kategori flyttes til første tilbageværende
    const fallback = catList.filter((x) => x !== c)[0] || "Andet";
    setList(list.map((m) => (m.cat === c ? { ...m, cat: fallback } : m)));
  };
  const [list, setList] = useState(config.materials);
  const [nm, setNm] = useState({ name: "", price: "", sell: "", unit: "stk." });

  const upd = (id, field, val) =>
    setList(list.map((m) => (m.id === id ? { ...m, [field]: field === "price" ? +val : val } : m)));
  const del = (id) => setList(list.filter((m) => m.id !== id));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setList(copy);
  };
  const add = () => {
    if (!nm.name.trim()) return;
    setList([...list, { id: "m" + Date.now(), name: nm.name.trim(), price: +nm.price || 0, sell: +nm.sell || +nm.price || 0, unit: nm.unit.trim() || "stk.", cat: catList[0] || "Materialer" }]);
    setNm({ name: "", price: "", sell: "", unit: "stk." });
  };
  const commit = () => save({ shopName: shopName.trim() || "Udbetalingsberegner", currency: currency.trim() || "kr.", categories: catList.length ? catList : ["Materialer"], pointsPer: +pointsPer || 1000, levels, materials: list });

  const dk = wide;
  const inp = "rounded-lg border px-2 py-2 text-sm " + (dk ? "" : "border-stone-300 bg-white");
  const inpStyle = dk ? { borderColor: "#3a3a3a", background: PANEL, color: "white" } : {};
  const lab = dk ? { color: "#9ca3af" } : { color: "#78716c" };
  const cardBg = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };

  const [confirmReset, setConfirmReset] = useState(false);
  const restoreDefaults = () => {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); return; }
    setConfirmReset(false);
    setList(JSON.parse(JSON.stringify(DEFAULT_CONFIG.materials)));
  };

  return (
    <div className={"space-y-3 pb-10 " + (dk ? "px-8 pt-6 mx-auto" : "px-3 pt-3")} style={dk ? { maxWidth: 720 } : {}}>
      <button onClick={restoreDefaults}
        className="w-full py-2.5 rounded-lg font-black text-sm border-2 border-dashed"
        style={confirmReset
          ? { background: GOLD, color: INK, borderColor: GOLD }
          : (dk ? { borderColor: "#3a3a3a", color: GOLD } : { borderColor: "#d6d3d1", color: "#78716c" })}>
        {confirmReset ? "Tryk igen for at indlæse alle 30 standardvarer (erstatter listen nedenfor)" : "↻ Gendan standardvarer (30 items med priser & kategorier)"}
      </button>
      <div>
        <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Butik</div>
        <div className="space-y-2">
          <label className="block">
            <div className="text-[11px] font-bold uppercase mb-1" style={lab}>Navn på beregneren</div>
            <input value={shopName} onChange={(e) => setShopName(e.target.value)} className={inp + " w-full"} style={inpStyle} />
          </label>
          <label className="block">
            <div className="text-[11px] font-bold uppercase mb-1" style={lab}>Valuta</div>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inp + " w-28"} style={inpStyle} />
          </label>
        </div>
      </div>

      <div>
        <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Loyalitet</div>
        <label className="block mb-2">
          <div className="text-[11px] font-bold uppercase mb-1" style={lab}>Point pr. beløb (1 point pr. X {config.currency})</div>
          <input type="number" inputMode="numeric" value={pointsPer} onChange={(e) => setPointsPer(e.target.value)} className={inp + " w-32"} style={inpStyle} />
        </label>
        <div className="text-[11px] font-bold uppercase mb-1" style={lab}>Niveauer (navn + point-krav)</div>
        <div className="space-y-1.5 mb-2">
          {levels.map((lv, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={lv.name} onChange={(e) => setLevels(levels.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                className={inp + " flex-1 min-w-0"} style={inpStyle} />
              <input type="number" inputMode="numeric" value={lv.min} onChange={(e) => setLevels(levels.map((x, j) => j === i ? { ...x, min: +e.target.value } : x))}
                className={inp + " w-24"} style={inpStyle} />
              <button onClick={() => setLevels(levels.filter((_, j) => j !== i))} className="p-1" style={{ color: dk ? "#666" : "#d6d3d1" }}><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={() => setLevels([...levels, { name: "Nyt niveau", min: 0 }])}
            className="text-xs font-bold flex items-center gap-1" style={{ color: dk ? GOLD : BLUE }}><Plus size={14} /> Tilføj niveau</button>
        </div>
      </div>
      <div>
        <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Kategorier</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {catList.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border"
              style={dk ? { borderColor: "#3a3a3a", color: "white", background: PANEL } : { borderColor: "#d6d3d1", color: INK, background: "white" }}>
              {c}
              <button onClick={() => delCat(c)} style={{ color: dk ? "#888" : "#a8a29e" }}><X size={14} /></button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCat()}
            placeholder="Ny kategori (fx Smykker & Malerier)" className={inp + " flex-1 min-w-0"} style={inpStyle} />
          <button onClick={addCat} disabled={!newCat.trim()}
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-30 font-black"
            style={{ background: GOLD, color: INK }}><Plus size={18} /></button>
        </div>
        <div className="text-[11px] mt-1" style={dk ? { color: "#6b7280" } : { color: "#a8a29e" }}>
          Sletter du en kategori, flyttes dens varer til den første tilbageværende. Vælg kategori pr. vare nedenfor.
        </div>
      </div>
      <div>
        <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Materialer & priser</div>
        <div className="space-y-2">
          {list.map((m, i) => (
            <div key={m.id} className="rounded-xl border p-2 space-y-2" style={cardBg}>
              <div className="flex items-center gap-2">
                <input value={m.name} onChange={(e) => upd(m.id, "name", e.target.value)}
                  placeholder="Navn" className={inp + " flex-1 min-w-0 font-semibold"} style={inpStyle} />
                <button onClick={() => del(m.id)} className="text-stone-300 active:text-red-500 p-1 shrink-0"><Trash2 size={16} /></button>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 flex-1">
                  <span className="text-[11px] shrink-0" style={lab}>Køb</span>
                  <input type="number" inputMode="numeric" value={m.price} onChange={(e) => upd(m.id, "price", e.target.value)}
                    className={inp + " w-full font-bold"} style={inpStyle} />
                </label>
                <label className="flex items-center gap-1.5 flex-1">
                  <span className="text-[11px] shrink-0" style={lab}>Salg</span>
                  <input type="number" inputMode="numeric" value={m.sell ?? m.price} onChange={(e) => upd(m.id, "sell", e.target.value)}
                    className={inp + " w-full font-bold"} style={{ ...inpStyle, color: dk ? "#4ade80" : GREEN }} />
                </label>
                <div className="flex flex-col shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="px-1.5 disabled:opacity-20 text-xs leading-tight" style={{ color: dk ? "#9ca3af" : "#a8a29e" }}>▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === list.length - 1}
                    className="px-1.5 disabled:opacity-20 text-xs leading-tight" style={{ color: dk ? "#9ca3af" : "#a8a29e" }}>▼</button>
                </div>
              </div>
              <label className="flex items-center gap-1.5">
                <span className="text-[11px] shrink-0" style={lab}>Enhed</span>
                <input value={m.unit || "stk."} onChange={(e) => upd(m.id, "unit", e.target.value)}
                  placeholder="stk." className={inp + " w-24"} style={inpStyle} />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-[11px] shrink-0" style={lab}>Kategori</span>
                <select value={m.cat || catList[0]} onChange={(e) => upd(m.id, "cat", e.target.value)}
                  className={inp} style={inpStyle}>
                  {catList.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          ))}
        </div>

        <div className="rounded-xl border-2 border-dashed p-2 mt-2 space-y-2" style={{ borderColor: dk ? "#444" : "#d6d3d1" }}>
          <input placeholder="Nyt materiale / item" value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })}
            className={inp + " w-full"} style={inpStyle} />
          <div className="flex items-center gap-2">
            <input type="number" inputMode="numeric" placeholder="Købspris" value={nm.price} onChange={(e) => setNm({ ...nm, price: e.target.value })}
              className={inp + " flex-1 min-w-0"} style={inpStyle} />
            <input type="number" inputMode="numeric" placeholder="Salgspris" value={nm.sell} onChange={(e) => setNm({ ...nm, sell: e.target.value })}
              className={inp + " flex-1 min-w-0"} style={inpStyle} />
            <input placeholder="Enhed" value={nm.unit} onChange={(e) => setNm({ ...nm, unit: e.target.value })}
              className={inp + " w-16"} style={inpStyle} />
            <button onClick={add} disabled={!nm.name.trim()}
              className="w-9 h-9 rounded-lg text-white flex items-center justify-center shrink-0 disabled:opacity-30" style={{ background: GREEN }}>
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      <button onClick={commit} className="w-full py-3 rounded-xl font-black" style={dk ? { background: GOLD, color: INK } : { background: BLUE, color: "white" }}>
        <Check size={16} className="inline mr-1" /> Gem alt
      </button>
      <div className="text-[11px]" style={dk ? { color: "#6b7280" } : { color: "#a8a29e" }}>Standardpriserne bruges automatisk — under en handel kan du stadig rette prisen pr. materiale uden at ændre standarden. Rækkefølgen her styrer rækkefølgen i listen.</div>
    </div>
  );
}
