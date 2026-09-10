import { useState, useEffect, useRef } from "react";
import { Plus, Minus, X, Trash2, RotateCcw, Settings, Check, Search, Receipt, BarChart3, Save, Clock, User, Users, LogOut, Award, ChevronLeft, Lock, Package, ArrowLeftRight, Home, Camera } from "lucide-react";
import {
  loadConfig, saveConfig as sbSaveConfig, loadSales as sbLoadSales, insertSale, logEvent,
  signIn, signOut, getSession, onAuthChange, loadMyProfile, loadAllProfiles,
  createStaff, updateStaff, deleteStaff,
  loadInventory, adjustInventory, setInventoryQty,
  loadCash, adjustCash, setCash,
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
const PAGE_MAX = 1100; // max-bredde for indholdssider på brede skærme (Kunder/Ansatte/Rediger)

/* ── Scan bakke: OCR-tekst -> varelinjer -> fuzzy match mod prislisten ── */
function normalizeOcr(s) {
  return (s || "").toUpperCase().replace(/[^A-ZÆØÅ0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = [];
  for (let i = 0; i <= m; i++) dp.push([i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
function bestMaterialMatch(rawName, materials) {
  const target = normalizeOcr(rawName);
  if (!target) return null;
  let best = null, bestScore = -1;
  materials.forEach((m) => {
    const cand = normalizeOcr(m.name);
    if (!cand) return;
    const dist = levenshtein(target, cand);
    const maxLen = Math.max(target.length, cand.length) || 1;
    let score = 1 - dist / maxLen;
    if (cand.includes(target) || target.includes(cand)) score = Math.min(1, score + 0.15);
    if (score > bestScore) { bestScore = score; best = m; }
  });
  return bestScore >= 0.45 ? { material: best, score: bestScore } : null;
}
// Deler OCR-teksten op i linjer og udleder et evt. antal for enden af hver linje (fx "KAGOZ 5" -> navn "KAGOZ", antal 5)
function parseOcrLines(rawText) {
  return (rawText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.replace(/[^A-Za-zÆØÅæøå0-9]/g, "").length > 1)
    .map((line) => {
      const m = line.match(/^(.{2,}?)[\s:xX×\-]+(\d{1,4})$/);
      if (m) return { raw: line, name: m[1].trim(), qty: Math.max(1, parseInt(m[2], 10)) };
      return { raw: line, name: line, qty: 1 };
    });
}

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
  const [inventory, setInventory] = useState({}); // material_id -> qty
  const loadInventoryFn = async () => { try { setInventory(await loadInventory()); } catch (e) {} };
  const [cash, setCashState] = useState(0);
  const loadCashFn = async () => { try { setCashState(await loadCash()); } catch (e) {} };
  const [tradeMode, setTradeMode] = useState("buy"); // buy | sell
  const [showScan, setShowScan] = useState(false);
  // Skifter Køb/Sælg uden at miste det, man har tastet ind — kun prisen pr. linje
  // regnes om til den nye tilstands standardpris (køb- eller salgspris).
  const switchTradeMode = (m) => {
    if (m === tradeMode) return;
    setTradeMode(m);
    setCart((prev) => {
      const next = {};
      Object.keys(prev).forEach((mid) => {
        const mat = (config?.materials || []).find((x) => x.id === mid);
        if (!mat) return;
        next[mid] = { qty: prev[mid].qty, price: m === "sell" ? (mat.sell ?? mat.price) : mat.price };
      });
      return next;
    });
  };

  const canManageStore = !!profile && (profile.role === "ejer" || profile.role === "manager");
  const isOwner = !!profile && profile.role === "ejer";
  const toggleSettings = () => {
    if (showSettings) { setShowSettings(false); editingRef.current = false; return; }
    if (!canManageStore) return;
    setShowSettings(true); editingRef.current = true;
  };
  const goHome = () => { setView("beregner"); setShowSettings(false); editingRef.current = false; setOpenCust(null); };

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
        type: r.type || "buy",
      })));
    } catch (e) {}
  };
  // sletning/rydning håndteres via DB separat; behold lokalt fallback
  const saveSales = async (next) => { setSales(next); };
  const editingRef = useRef(false);
  useEffect(() => { if (profile) { loadConfigFn(true); loadSalesFn(); refreshStaff(); loadInventoryFn(); loadCashFn(); } }, [profile]);
  useEffect(() => {
    if (!profile) return;
    const poll = setInterval(() => {
      // hent nye priser i baggrunden — men aldrig mens ejeren redigerer
      if (!editingRef.current && document.visibilityState === "visible") { loadConfigFn(false); loadSalesFn(); loadInventoryFn(); loadCashFn(); }
    }, 12000);
    const onVis = () => { if (document.visibilityState === "visible" && !editingRef.current) { loadConfigFn(false); loadSalesFn(); loadInventoryFn(); loadCashFn(); } };
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
    else next[id(m)] = { qty, price: cart[id(m)]?.price ?? (tradeMode === "sell" ? (m.sell ?? m.price) : m.price) };
    setCart(next);
  };
  const setPrice = (mid, price) => setCart({ ...cart, [mid]: { ...cart[mid], price } });
  // Lægger scannede/matchede varer fra "Scan bakke" ind i kurven (lægger oven i eksisterende antal)
  const applyScannedItems = (items) => {
    setCart((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        const mat = materials.find((mm) => mm.id === it.materialId);
        if (!mat) return;
        const existing = next[mat.id];
        const defaultPrice = tradeMode === "sell" ? (mat.sell ?? mat.price) : mat.price;
        next[mat.id] = { qty: (existing?.qty || 0) + it.qty, price: existing?.price ?? defaultPrice };
      });
      return next;
    });
  };
  const id = (m) => m.id;

  const lines = materials
    .filter((m) => cart[m.id]?.qty > 0)
    .map((m) => {
      const qty = cart[m.id].qty, price = cart[m.id].price;
      const sell = m.sell ?? m.price;
      const stock = inventory[m.id] || 0;
      return { m, qty, price, sum: qty * price, sellSum: qty * sell, costSum: qty * m.price, stock };
    });
  const total = lines.reduce((a, l) => a + l.sum, 0);
  const resaleValue = lines.reduce((a, l) => a + l.sellSum, 0);
  const costBasis = lines.reduce((a, l) => a + l.costSum, 0);
  const sellTotal = tradeMode === "sell" ? costBasis : resaleValue;
  const profit = tradeMode === "sell" ? (total - costBasis) : (resaleValue - total);
  const payLabel = tradeMode === "sell" ? "Kunden skal betale" : "Kunden skal have";
  const secondaryLabel = tradeMode === "sell" ? "Kostpris" : "Videresalg";
  const profitLabel = tradeMode === "sell" ? "Fortjeneste" : "Avance";

  const shown = materials.filter((m) =>
    m.name.toLowerCase().includes(q.trim().toLowerCase()) &&
    (activeCat === "Alle" || (m.cat || "Materialer") === activeCat));

  const cats = ["Alle", ...(config.categories || ["Materialer"])];

  const saveTrade = () => {
    if (lines.length === 0) return;
    const pts = tradeMode === "buy" ? Math.floor(total / (config.pointsPer || 1000)) : 0;
    const trade = {
      id: "t" + Date.now(), at: Date.now(),
      custId: custId.trim(),
      points: pts,
      type: tradeMode,
      lines: lines.map((l) => ({ id: l.m.id, name: l.m.name, qty: l.qty, price: l.price, unit: l.m.unit, sum: l.sum, sellSum: l.sellSum })),
      total, sellTotal, profit,
      sellerId: profile.id, sellerName: profile.name, commission: 0,
    };
    // beregn evt. niveau-skift FØR vs EFTER for kunden (kun ved køb — points gives ikke ved salg)
    const id = custId.trim();
    let prevPoints = 0;
    if (id) sales.forEach((t) => { if ((t.custId || "") === id) prevPoints += (t.points || 0); });
    const wasNew = tradeMode === "buy" && id && prevPoints === 0;
    const beforeLvl = levelFor(prevPoints, config.levels).cur.name;
    const afterLvl = levelFor(prevPoints + pts, config.levels).cur.name;

    // lager: op ved køb, ned ved salg. Kasse: ned ved køb (I betaler ud), op ved salg (I modtager)
    const invDelta = tradeMode === "buy" ? 1 : -1;
    const cashDelta = tradeMode === "buy" ? -total : total;
    setInventory((prev) => {
      const next = { ...prev };
      trade.lines.forEach((l) => { next[l.id] = (next[l.id] || 0) + invDelta * l.qty; });
      return next;
    });
    setCashState((prev) => prev + cashDelta);

    setSales([trade, ...sales].slice(0, 500));
    setReceipt(trade);
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500);
    if (navigator.vibrate) navigator.vibrate(40);
    setCart({}); setCustId("");

    // skriv til databasen + log hændelser til Discord
    (async () => {
      try {
        await insertSale(trade);
        await Promise.all(trade.lines.map((l) => adjustInventory(l.id, invDelta * l.qty)));
        await adjustCash(cashDelta);
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
        <button onClick={goHome} className="flex items-center gap-3 text-left" title="Til forsiden">
          <span className="inline-flex items-center justify-center rounded-lg font-black shrink-0"
            style={{ background: GOLD, color: INK, width: wide ? 52 : 40, height: wide ? 52 : 40, fontSize: wide ? 26 : 20 }}>◆</span>
          <div>
            <div className="uppercase tracking-widest font-bold" style={{ color: GOLD, fontSize: wide ? 11 : 10 }}>Buy · Sell · Trade</div>
            <div className={"font-black leading-none text-white " + (wide ? "text-3xl" : "text-lg")}>{config.shopName}</div>
            {wide && <div className="text-[10px] text-stone-500 mt-1 flex items-center gap-1"><Clock size={10} /> Priser synkroniseres automatisk</div>}
          </div>
        </button>
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
          <button onClick={goHome}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "beregner" && !showSettings ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <Home size={16} /> <span className="hidden sm:inline">Hjem</span>
          </button>
          <button onClick={() => { setView(view === "kunder" ? "beregner" : "kunder"); setShowSettings(false); setOpenCust(null); }}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "kunder" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <User size={16} /> Kunder
          </button>
          <button onClick={() => { setView(view === "lager" ? "beregner" : "lager"); setShowSettings(false); }}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "lager" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <Package size={16} /> Lager
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
      ) : view === "lager" && !showSettings ? (
        <InventoryView materials={materials} inventory={inventory} cur={cur} wide={wide} canEdit={canManageStore}
          cash={cash}
          onSetQty={async (mid, qty) => {
            setInventory((prev) => ({ ...prev, [mid]: qty }));
            try { await setInventoryQty(mid, qty); } catch (e) {}
          }}
          onSetCash={async (amount) => {
            setCashState(amount);
            try { await setCash(amount); } catch (e) {}
          }} />
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
          <div className="flex rounded-lg overflow-hidden border text-sm font-black" style={{ borderColor: wide ? "#3a3a3a" : "#d6d3d1" }}>
            <button onClick={() => switchTradeMode("buy")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5"
              style={tradeMode === "buy" ? { background: GOLD, color: INK } : { background: wide ? PANEL : "white", color: wide ? "#9ca3af" : "#78716c" }}>
              <ArrowLeftRight size={15} /> Køb fra kunde
            </button>
            <button onClick={() => switchTradeMode("sell")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5"
              style={tradeMode === "sell" ? { background: GREEN, color: "white" } : { background: wide ? PANEL : "white", color: wide ? "#9ca3af" : "#78716c" }}>
              <Package size={15} /> Sælg til kunde
            </button>
          </div>
          {tradeMode === "buy" && (
            <button onClick={() => setShowScan(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-sm border-2 border-dashed"
              style={wide ? { borderColor: GOLD, color: GOLD, background: "rgba(245,179,1,.08)" } : { borderColor: GOLD_D, color: GOLD_D, background: "#fdf3e7" }}>
              <Camera size={16} /> Scan bakke (læs varer fra screenshot)
            </button>
          )}
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-2.5 text-stone-400" />
            <input placeholder="Søg materiale…" value={q} onChange={(e) => setQ(e.target.value)}
              autoFocus={wide}
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
            const stock = inventory[m.id] || 0;
            const oversell = tradeMode === "sell" && active && c.qty > stock;
            const isEmpty = stock <= 0;
            const isLow = stock > 0 && stock <= 5;
            const stockBg = isEmpty ? (dark ? "rgba(248,113,113,.07)" : "#fdf4f3") : isLow ? (dark ? "rgba(156,163,175,.08)" : "#f6f5f4") : (dark ? PANEL : "white");
            const stockBorder = isEmpty ? (dark ? "#5c2b2b" : "#f3c9c6") : isLow ? (dark ? "#4a4a48" : "#e5e3e0") : (dark ? "#333" : "#e7e5e4");
            const quickBtn = dark ? { background: "#262626", color: "#d4d4d4", border: "1px solid #444" } : { background: "#f5f5f4", color: "#57534e", border: "1px solid #e7e5e4" };
            return (
              <div key={m.id} className="rounded-xl border p-3"
                style={{ background: stockBg, borderColor: active ? GOLD : stockBorder, borderLeft: active ? `3px solid ${GOLD}` : `1px solid ${stockBorder}`, opacity: isEmpty ? 0.5 : 1 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold" style={{ color: dark ? "white" : INK }}>{m.name}</div>
                    <div className="text-[11px]" style={{ color: dark ? "#9ca3af" : "#a8a29e" }}>
                      <span style={tradeMode === "buy" ? { color: GOLD, fontWeight: 700 } : {}}>Køb {fmt(m.price)}</span>
                      {" · "}
                      <span style={tradeMode === "sell" ? { color: GOLD, fontWeight: 700 } : {}}>Salg {fmt(m.sell ?? m.price)}</span>
                      {" "}{cur} pr. {m.unit || "stk."}
                      {" · "}Lager: <span style={{ color: (oversell || isEmpty) ? "#f87171" : isLow ? (dark ? "#facc15" : "#b45309") : (dark ? "#9ca3af" : "#a8a29e"), fontWeight: (oversell || isEmpty || isLow) ? 700 : 400 }}>{stock}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(m, (c?.qty || 0) - 1)}
                      className="w-11 h-11 rounded-lg border flex items-center justify-center disabled:opacity-30"
                      style={{ borderColor: dark ? "#444" : "#d6d3d1", color: dark ? "#ccc" : "#57534e" }}
                      disabled={!active}><Minus size={18} /></button>
                    <input type="number" inputMode="numeric" value={c?.qty || ""} placeholder="0"
                      onChange={(e) => setQty(m, Math.max(0, +e.target.value))}
                      className="w-16 text-center rounded-lg border py-2.5 text-sm font-bold"
                      style={{ borderColor: dark ? "#444" : "#d6d3d1", background: dark ? "#111" : "white", color: dark ? "white" : INK }} />
                    <button onClick={() => setQty(m, (c?.qty || 0) + 1)}
                      className="w-11 h-11 rounded-lg flex items-center justify-center font-black"
                      style={{ background: GOLD, color: INK }}>
                      <Plus size={18} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <button onClick={() => setQty(m, (c?.qty || 0) + 5)} className="px-3.5 py-2 rounded-md text-xs font-bold" style={quickBtn}>+5</button>
                  <button onClick={() => setQty(m, (c?.qty || 0) + 10)} className="px-3.5 py-2 rounded-md text-xs font-bold" style={quickBtn}>+10</button>
                  {tradeMode === "sell" && (
                    <button onClick={() => setQty(m, stock)} disabled={stock <= 0}
                      className="px-3.5 py-2 rounded-md text-xs font-bold disabled:opacity-30" style={quickBtn}>Max</button>
                  )}
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
                {oversell && (
                  <div className="text-[11px] font-bold mt-1.5" style={{ color: "#f87171" }}>
                    ⚠ Kun {stock} på lager — salget kan stadig gemmes, men lageret går i minus.
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
                    <span>{secondaryLabel}: <span className="font-bold text-white">{fmt(sellTotal)} {cur}</span></span>
                    <span>{profitLabel}: <span className="font-black" style={{ color: profit >= 0 ? "#4ade80" : "#f87171" }}>{fmt(profit)} {cur}</span></span>
                  </div>
                )}
                <div className="px-4 py-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#9ca3af" }}>{payLabel}</div>
                  <div className="text-4xl font-black tabular-nums" style={{ color: lines.length ? GOLD : "#555" }}>
                    {fmt(total)} <span className="text-xl">{cur}</span>
                  </div>
                  <div className="mt-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#9ca3af" }}>Kunde-ID (server)</label>
                    <input value={custId} onChange={(e) => setCustId(e.target.value)} placeholder="valgfrit"
                      className="w-full mt-1 rounded-lg border px-3 py-2 text-sm font-bold"
                      style={{ borderColor: "#444", background: "#111", color: "white" }} />
                    {tradeMode === "buy" && custId.trim() && lines.length > 0 && (
                      <div className="text-[11px] mt-1" style={{ color: GOLD }}>
                        + {Math.floor(total / (config.pointsPer || 1000))} point til {custId.trim()}
                      </div>
                    )}
                  </div>
                  {lines.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <button onClick={() => saveTrade()}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-black text-base"
                        style={{ background: tradeMode === "sell" ? GREEN : GOLD, color: tradeMode === "sell" ? "white" : INK }}>
                        <Save size={18} /> {tradeMode === "sell" ? "Gem salg & kvittering" : "Gem handel & kvittering"}
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
      {showScan && <ScanTrayModal materials={materials} onApply={applyScannedItems} onClose={() => setShowScan(false)} />}

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
              <span className="text-stone-500">{secondaryLabel}: <span className="font-bold text-stone-700">{fmt(sellTotal)} {cur}</span></span>
              <span className="text-stone-500">{profitLabel}: <span className="font-black" style={{ color: profit >= 0 ? GREEN : RED }}>{fmt(profit)} {cur}</span></span>
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
              <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400">{payLabel}</div>
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
  const wrapStyle = dk ? { maxWidth: PAGE_MAX } : {};

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

/* ── Lager ── */
function InventoryView({ materials, inventory, cur, wide, canEdit, cash, onSetQty, onSetCash }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [editCash, setEditCash] = useState(false);
  const [cashVal, setCashVal] = useState("");
  const wrap = "pb-10 " + (dk ? "px-8 pt-6 mx-auto " : "px-3 pt-3 ") + (dk ? "text-white" : "");
  const wrapStyle = dk ? { maxWidth: 900 } : {};

  const shown = materials.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const totalValue = materials.reduce((a, m) => a + (inventory[m.id] || 0) * m.price, 0);
  const totalResaleValue = materials.reduce((a, m) => a + (inventory[m.id] || 0) * (m.sell ?? m.price), 0);
  const totalUnits = materials.reduce((a, m) => a + (inventory[m.id] || 0), 0);

  const startEdit = (m) => { setEditing(m.id); setEditVal(String(inventory[m.id] || 0)); };
  const commitEdit = (m) => { onSetQty(m.id, Math.max(0, +editVal || 0)); setEditing(null); };
  const startCashEdit = () => { setCashVal(String(Math.round(cash))); setEditCash(true); };
  const commitCash = () => { onSetCash(+cashVal || 0); setEditCash(false); };

  return (
    <div className={wrap} style={wrapStyle}>
      <div className="rounded-xl border p-4 mb-3 flex items-center justify-between" style={{ ...box, borderColor: GOLD }}>
        <div>
          <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>Kontanter (kassen)</div>
          {editCash ? (
            <div className="flex items-center gap-2 mt-1">
              <input type="number" inputMode="numeric" autoFocus value={cashVal} onChange={(e) => setCashVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitCash()}
                className="w-32 rounded-lg border px-2 py-1.5 text-lg font-black"
                style={dk ? { borderColor: "#444", background: "#111", color: "white" } : { borderColor: "#d6d3d1" }} />
              <button onClick={commitCash} className="px-2.5 py-1.5 rounded-lg font-bold text-xs" style={{ background: GREEN, color: "white" }}>Gem</button>
            </div>
          ) : (
            <div className="text-2xl font-black tabular-nums" style={{ color: dk ? GOLD : GOLD_D }}>{fmt(cash)} {cur}</div>
          )}
        </div>
        {canEdit && !editCash && (
          <button onClick={startCashEdit} className="text-xs font-bold px-2 py-1" style={{ color: dk ? GOLD : BLUE }}>Ret</button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <div className="rounded-xl border p-3" style={box}>
          <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>Varer på lager</div>
          <div className="text-lg font-black tabular-nums" style={{ color: dk ? "white" : INK }}>{fmt(totalUnits)} stk.</div>
        </div>
        <div className="rounded-xl border p-3" style={box}>
          <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>Kostpris</div>
          <div className="text-lg font-black tabular-nums" style={{ color: dk ? "white" : INK }}>{fmt(totalValue)} {cur}</div>
        </div>
        <div className="rounded-xl border p-3" style={box}>
          <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>Potentiel salgsværdi</div>
          <div className="text-lg font-black tabular-nums" style={{ color: dk ? GOLD : GOLD_D }}>{fmt(totalResaleValue)} {cur}</div>
        </div>
      </div>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-2.5 top-2.5" style={{ color: sub }} />
        <input placeholder="Søg materiale…" value={q} onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm"
          style={dk ? { borderColor: "#3a3a3a", background: PANEL, color: "white" } : { borderColor: "#d6d3d1", background: "white" }} />
      </div>
      <div className="space-y-2">
        {shown.map((m) => {
          const qty = inventory[m.id] || 0;
          const isEmpty = qty <= 0;
          const isLow = qty > 0 && qty <= 5;
          const rowBg = isEmpty ? (dk ? "rgba(248,113,113,.07)" : "#fdf4f3") : isLow ? (dk ? "rgba(156,163,175,.08)" : "#f6f5f4") : box.background;
          const rowBorder = isEmpty ? (dk ? "#5c2b2b" : "#f3c9c6") : isLow ? (dk ? "#4a4a48" : "#e5e3e0") : box.borderColor;
          return (
            <div key={m.id} className="rounded-xl border p-3 flex items-center justify-between" style={{ background: rowBg, borderColor: rowBorder }}>
              <div>
                <div className="font-bold" style={{ color: dk ? "white" : INK }}>{m.name}</div>
                <div className="text-[11px]" style={{ color: sub }}>
                  Kostpris: {fmt(qty * m.price)} {cur} · Salgsværdi: {fmt(qty * (m.sell ?? m.price))} {cur}
                </div>
              </div>
              {editing === m.id ? (
                <div className="flex items-center gap-1.5">
                  <input type="number" inputMode="numeric" autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commitEdit(m)}
                    className="w-20 rounded-lg border px-2 py-1.5 text-sm font-bold text-center"
                    style={dk ? { borderColor: "#444", background: "#111", color: "white" } : { borderColor: "#d6d3d1" }} />
                  <button onClick={() => commitEdit(m)} className="px-2 py-1.5 rounded-lg font-bold text-xs" style={{ background: GREEN, color: "white" }}>Gem</button>
                </div>
              ) : (
                <button onClick={() => canEdit && startEdit(m)} className="text-right" disabled={!canEdit}>
                  <div className="text-xl font-black tabular-nums" style={{ color: isEmpty ? "#f87171" : isLow ? (dk ? "#facc15" : "#b45309") : (dk ? GOLD : INK) }}>
                    {fmt(qty)} <span className="text-xs font-bold" style={{ color: sub }}>stk.</span>
                  </div>
                  {canEdit && <div className="text-[10px] font-bold" style={{ color: dk ? GOLD : BLUE }}>Ret</div>}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!canEdit && <div className="text-[11px] mt-3" style={{ color: sub }}>Kun ejer/manager kan rette lagerantal manuelt.</div>}
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
  const wrapStyle = dk ? { maxWidth: PAGE_MAX } : {};

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

/* ── Scan bakke (OCR via Tesseract.js — kører lokalt i browseren) ── */
function ScanTrayModal({ materials, onApply, onClose }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const fileInputRef = useRef(null);

  const loadImage = (fileOrBlob) => {
    if (!fileOrBlob) return;
    setImgFile(fileOrBlob);
    setRows(null);
    setErr("");
    const reader = new FileReader();
    reader.onload = (e) => setImgSrc(e.target.result);
    reader.readAsDataURL(fileOrBlob);
  };
  const onFileChange = (e) => loadImage(e.target.files?.[0]);
  const onDrop = (e) => { e.preventDefault(); loadImage(e.dataTransfer.files?.[0]); };
  const onPasteImg = (e) => {
    const items = e.clipboardData?.items || [];
    for (const it of items) {
      if (it.type && it.type.startsWith("image/")) { loadImage(it.getAsFile()); break; }
    }
  };

  const runScan = async () => {
    if (!imgFile) return;
    setScanning(true); setProgress(0); setErr("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (msg) => { if (msg.status === "recognizing text" && typeof msg.progress === "number") setProgress(Math.round(msg.progress * 100)); },
      });
      const { data } = await worker.recognize(imgFile);
      await worker.terminate();
      const parsed = parseOcrLines(data.text);
      if (parsed.length === 0) { setErr("Kunne ikke læse nogen tekst i billedet. Prøv et tydeligere/nærmere screenshot."); setScanning(false); return; }
      setRows(parsed.map((p) => {
        const match = bestMaterialMatch(p.name, materials);
        return { raw: p.raw, materialId: match ? match.material.id : "", qty: p.qty, checked: true };
      }));
    } catch (e) {
      setErr("OCR fejlede: " + (e?.message || String(e)));
    }
    setScanning(false);
  };

  const updateRow = (i, patch) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const matchedCount = rows ? rows.filter((r) => r.materialId).length : 0;

  const apply = () => {
    const toAdd = (rows || []).filter((r) => r.checked && r.materialId && r.qty > 0);
    onApply(toAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 py-6" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col" style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()} onPaste={onPasteImg}>
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ background: INK, borderBottom: `3px solid ${GOLD}` }}>
          <div className="text-white font-black flex items-center gap-2"><Camera size={18} style={{ color: GOLD }} /> Scan bakke</div>
          <button onClick={onClose} className="text-stone-400"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3 text-stone-900 overflow-y-auto">
          {!imgSrc && (
            <div onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
              className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-stone-500" style={{ borderColor: "#d6d3d1" }}>
              <div className="mb-3">Træk et screenshot af kundens bakke herind, indsæt med <b>Ctrl+V</b>, eller</div>
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 rounded-lg font-bold text-sm" style={{ background: GOLD, color: INK }}>Vælg billede</button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            </div>
          )}
          {imgSrc && !rows && (
            <div className="space-y-3">
              <img src={imgSrc} alt="Screenshot af bakke" className="w-full rounded-lg border" style={{ borderColor: "#e7e5e4" }} />
              {!scanning ? (
                <div className="flex gap-2">
                  <button onClick={runScan} className="flex-1 py-2.5 rounded-xl font-black text-sm" style={{ background: GOLD, color: INK }}>Scan billedet</button>
                  <button onClick={() => { setImgSrc(null); setImgFile(null); setErr(""); }} className="px-4 py-2.5 rounded-xl font-bold text-sm border border-stone-300 text-stone-600">Vælg andet</button>
                </div>
              ) : (
                <div className="text-center text-sm font-semibold text-stone-500 py-2">Scanner billedet… {progress}%</div>
              )}
              {err && <div className="text-xs font-semibold" style={{ color: RED }}>{err}</div>}
            </div>
          )}
          {rows && (
            <div className="space-y-3">
              <div className="text-xs text-stone-500">
                Fandt {rows.length} linje{rows.length === 1 ? "" : "r"} — {matchedCount} matchede automatisk. Tjek og ret gerne før du lægger dem i kurven.
              </div>
              <div className="space-y-2">
                {rows.map((r, i) => {
                  const unmatched = !r.materialId;
                  return (
                    <div key={i} className="rounded-lg border p-2.5" style={{ borderColor: unmatched ? "#f3c9c6" : "#e7e5e4", background: unmatched ? "#fdf4f3" : "white" }}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={r.checked} onChange={(e) => updateRow(i, { checked: e.target.checked })} />
                        <div className="text-[11px] text-stone-400 flex-1 min-w-0 truncate">OCR læste: "{r.raw}"</div>
                        {unmatched && <span className="text-[10px] font-bold shrink-0" style={{ color: RED }}>ukendt — vælg selv</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <select value={r.materialId} onChange={(e) => updateRow(i, { materialId: e.target.value })}
                          className="flex-1 min-w-0 rounded-lg border px-2 py-1.5 text-sm" style={{ borderColor: unmatched ? "#f3c9c6" : "#d6d3d1" }}>
                          <option value="">— Ukendt, vælg selv —</option>
                          {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <input type="number" inputMode="numeric" value={r.qty}
                          onChange={(e) => updateRow(i, { qty: Math.max(1, +e.target.value || 1) })}
                          className="w-16 rounded-lg border px-2 py-1.5 text-sm font-bold text-center" style={{ borderColor: "#d6d3d1" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={apply} className="flex-1 py-2.5 rounded-xl font-black text-sm" style={{ background: GREEN, color: "white" }}>
                  <Check size={16} className="inline mr-1" /> Læg i kurv
                </button>
                <button onClick={() => { setImgSrc(null); setImgFile(null); setRows(null); setErr(""); }}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm border border-stone-300 text-stone-600">Scan nyt billede</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
            <span className="font-black uppercase text-xs text-stone-500">{trade.type === "sell" ? "Modtaget" : "Udbetalt"}</span>
            <span className="text-2xl font-black tabular-nums" style={{ color: GREEN }}>{fmt(trade.total)} {cur}</span>
          </div>
          {trade.custId && trade.type !== "sell" && (
            <div className="flex justify-between items-baseline mt-1 text-xs">
              <span className="text-stone-500">Kunde {trade.custId}</span>
              <span className="font-bold" style={{ color: GOLD_D }}>+{trade.points} point</span>
            </div>
          )}
          {trade.custId && trade.type === "sell" && (
            <div className="flex justify-between items-baseline mt-1 text-xs">
              <span className="text-stone-500">Kunde {trade.custId}</span>
            </div>
          )}
          {trade.sellerName && (
            <div className="flex justify-between items-baseline mt-1 text-xs">
              <span className="text-stone-500">{trade.type === "sell" ? "Solgt af" : "Købt af"} {trade.sellerName}</span>
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
  const [period, setPeriod] = useState("dag"); // dag | uge | måned | alt
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

  const now = Date.now();
  const cutoff = period === "dag" ? new Date().setHours(0, 0, 0, 0)
    : period === "uge" ? now - 7 * 86400000
    : period === "måned" ? now - 30 * 86400000
    : 0;
  const inPeriod = sales.filter((t) => t.at >= cutoff);
  const buys = inPeriod.filter((t) => t.type !== "sell");
  const sells = inPeriod.filter((t) => t.type === "sell");
  const udgifter = sum(buys, (t) => t.total);
  const indtaegter = sum(sells, (t) => t.total);
  const overskud = indtaegter - udgifter;

  return (
    <div className={"pb-10 " + (dk ? "px-8 pt-6 mx-auto text-white" : "px-3 pt-3")} style={dk ? { maxWidth: 900 } : {}}>
      <div className="flex rounded-lg overflow-hidden border text-xs font-black mb-3" style={{ borderColor: dk ? "#3a3a3a" : "#d6d3d1" }}>
        {[["dag", "I dag"], ["uge", "7 dage"], ["måned", "30 dage"], ["alt", "Alt"]].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)} className="flex-1 py-2"
            style={period === v ? { background: GOLD, color: INK } : { background: dk ? PANEL : "white", color: sub }}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[["Handler", inPeriod.length, dk ? "white" : INK],
          ["Udgifter (køb)", fmt(udgifter) + " " + cur, dk ? "#f87171" : RED],
          ["Indtægter (salg)", fmt(indtaegter) + " " + cur, dk ? "#4ade80" : GREEN],
          ["Overskud", fmt(overskud) + " " + cur, overskud >= 0 ? (dk ? "#4ade80" : GREEN) : (dk ? "#f87171" : RED)]].map(([l, v, c]) => (
          <div key={l} className="rounded-xl border p-3" style={box}>
            <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>{l}</div>
            <div className="text-lg font-black tabular-nums" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-black uppercase tracking-wider" style={{ color: dk ? GOLD : BLUE }}>Handler i perioden</div>
        {role === "ejer" && sales.length > 0 && (
          <button onClick={onClear} className="text-[11px] font-bold" style={{ color: dk ? "#f87171" : RED }}>Ryd alle</button>
        )}
      </div>
      {inPeriod.length === 0 && <div className="text-sm py-6 text-center" style={{ color: sub }}>Ingen handler i denne periode.</div>}
      <div className="space-y-2">
        {inPeriod.map((t) => {
          const d = new Date(t.at);
          const isSell = t.type === "sell";
          return (
            <div key={t.id} className="rounded-xl border p-3" style={box}>
              <div className="flex items-center justify-between">
                <div className="text-[11px] flex items-center gap-1.5" style={{ color: sub }}>
                  <span className="px-1.5 py-0.5 rounded font-bold" style={isSell ? { background: "rgba(74,222,128,.15)", color: dk ? "#4ade80" : GREEN } : { background: "rgba(245,179,1,.15)", color: dk ? GOLD : GOLD_D }}>
                    {isSell ? "🏷️ Salg" : "💰 Køb"}
                  </span>
                  {d.toLocaleDateString("da-DK")} · {d.toTimeString().slice(0, 5)}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black tabular-nums" style={{ color: isSell ? (dk ? "#4ade80" : GREEN) : (dk ? "#f87171" : RED) }}>{fmt(t.total)} {cur}</span>
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
    <div className={"space-y-3 pb-10 " + (dk ? "px-8 pt-6 mx-auto" : "px-3 pt-3")} style={dk ? { maxWidth: PAGE_MAX } : {}}>
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
