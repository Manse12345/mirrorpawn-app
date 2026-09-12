import { useState, useEffect, useRef } from "react";
import { Plus, Minus, X, Trash2, RotateCcw, Settings, Check, Search, Receipt, BarChart3, Save, Clock, User, Users, LogOut, Award, ChevronLeft, Lock, Package, ArrowLeftRight, Home, Camera, Hammer } from "lucide-react";
import {
  loadConfig, saveConfig as sbSaveConfig, loadSales as sbLoadSales, insertSale, logEvent,
  signIn, signOut, getSession, onAuthChange, loadMyProfile, loadAllProfiles,
  createStaff, updateStaff, deleteStaff,
  loadInventory, adjustInventory, setInventoryQty,
  loadCash, adjustCash, setCash,
  deleteCustomer, craftItem,
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

// ── Crafting-opskrifter (arbejdsbænk i spillet). Materialer matches på NAVN
//    mod config.materials, så navnene her skal matche spillet 1-til-1. ──
const RECIPES = [
  { name: "Luksus Våben Kit", time: 10, cat: "Våben & Udstyr", mats: [{ name: "Guld spraydåse", qty: 5 }, { name: "Plastik", qty: 10 }] },
  { name: "Skudsikker vest", time: 15, cat: "Våben & Udstyr", mats: [{ name: "Plastik", qty: 25 }, { name: "Aluminium", qty: 25 }, { name: "Glas", qty: 25 }, { name: "Stål", qty: 50 }, { name: "Tekstil", qty: 100 }] },
  { name: "Extended Pistol Clip", time: 10, cat: "Våben & Udstyr", mats: [{ name: "Aluminium", qty: 75 }, { name: "Gummi", qty: 75 }, { name: "Metalskrot", qty: 100 }] },
  { name: "Lyddæmper", time: 10, cat: "Våben & Udstyr", mats: [{ name: "Stål", qty: 75 }, { name: "Aluminium", qty: 100 }, { name: "Plastik", qty: 100 }] },
  { name: "Knojern", time: 10, cat: "Våben & Udstyr", mats: [{ name: "Metalskrot", qty: 10 }, { name: "Aluminium", qty: 15 }] },
  { name: "Dagger", time: 10, cat: "Våben & Udstyr", mats: [{ name: "Aluminium", qty: 10 }, { name: "Metalskrot", qty: 15 }, { name: "Træ", qty: 15 }] },
  { name: "Machete", time: 10, cat: "Våben & Udstyr", mats: [{ name: "Metalskrot", qty: 10 }, { name: "Aluminium", qty: 15 }, { name: "Træ", qty: 15 }] },

  { name: "Låsesæt", time: 1, cat: "Værktøj & Andet", mats: [{ name: "Aluminium", qty: 2 }] },
  { name: "Vinkelsliber", time: 15, cat: "Værktøj & Andet", mats: [{ name: "Glas", qty: 10 }, { name: "Gummi", qty: 10 }, { name: "Plastik", qty: 10 }, { name: "Metalskrot", qty: 20 }] },
  { name: "Skruetrækkersæt", time: 10, cat: "Værktøj & Andet", mats: [{ name: "Gummi", qty: 10 }, { name: "Plastik", qty: 15 }, { name: "Metalskrot", qty: 30 }] },
  { name: "Nummerplade", time: 30, cat: "Værktøj & Andet", mats: [{ name: "Plastik", qty: 30 }, { name: "Metalskrot", qty: 30 }] },
  { name: "Sportstaske", time: 10, cat: "Værktøj & Andet", mats: [{ name: "Gummi", qty: 15 }, { name: "Tekstil", qty: 85 }] },
  { name: "Våbenrensesæt", time: 5, cat: "Værktøj & Andet", mats: [{ name: "Raffineret Metal", qty: 20 }, { name: "Raffineret Kobber", qty: 20 }] },
  { name: "Bandage", time: 5, cat: "Værktøj & Andet", mats: [{ name: "Tekstil", qty: 15 }] },

  { name: "Elektronik", time: 2.5, cat: "Elektronik", mats: [{ name: "Kabler", qty: 1 }] },
  { name: "Xeltrix Enhed", time: 5, cat: "Elektronik", mats: [{ name: "Kabler", qty: 1 }, { name: "Glas", qty: 10 }, { name: "Kobber", qty: 10 }, { name: "Elektronik", qty: 10 }] },
  { name: "KryptaNode Modul", time: 5, cat: "Elektronik", mats: [{ name: "Kabler", qty: 1 }, { name: "Glas", qty: 10 }, { name: "Kobber", qty: 10 }, { name: "Elektronik", qty: 10 }] },
  { name: "sFruit S420", time: 15, cat: "Elektronik", mats: [{ name: "Bagpanel", qty: 1 }, { name: "Kobber", qty: 10 }, { name: "Glas", qty: 25 }, { name: "Elektronik", qty: 60 }] },
  { name: "Kabler", time: 5, cat: "Elektronik", mats: [{ name: "Dekrypteringsenhed", qty: 1 }] },
];

const fmt = (n) => (Math.round(n) || 0).toLocaleString("da-DK");
const PAGE_MAX = 1100; // max-bredde for indholdssider på brede skærme (Kunder/Ansatte/Rediger)

// Antal styk handlet pr. vare (køb + salg lagt sammen), udledt af de handler appen allerede har indlæst
function computeTradeCounts(sales) {
  const counts = {};
  sales.forEach((t) => {
    (t.lines || []).forEach((l) => {
      if (!l.id) return;
      counts[l.id] = (counts[l.id] || 0) + (l.qty || 0);
    });
  });
  return counts;
}
// Delt sortering for Hjem og Lager: på lager før udsolgt, derefter flest handlede styk øverst
function sortByStockThenTrades(list, inventory, tradeCounts) {
  return [...list].sort((a, b) => {
    const aOnStock = (inventory[a.id] || 0) > 0 ? 1 : 0;
    const bOnStock = (inventory[b.id] || 0) > 0 ? 1 : 0;
    if (aOnStock !== bOnStock) return bOnStock - aOnStock;
    return (tradeCounts[b.id] || 0) - (tradeCounts[a.id] || 0);
  });
}

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
const AUTO_MATCH_SIMILARITY_MIN = 0.82; // kun auto-vælg ved meget høj lighed
// Er "needle" til stede som et helt ord (eller sammenhængende ordfølge) i "haystack"?
// Undgår falske match som "AND" der bare er en delstreng af "VAND".
function containsWholeWord(haystack, needle) {
  if (!needle) return false;
  const hWords = haystack.split(" ").filter(Boolean);
  const nWords = needle.split(" ").filter(Boolean);
  if (nWords.length === 0) return false;
  for (let i = 0; i + nWords.length <= hWords.length; i++) {
    if (nWords.every((w, j) => hWords[i + j] === w)) return true;
  }
  return false;
}
// Manuelle OCR→vare-rettelser: bruges når reglerne nedenfor (dansk bogstav-fold,
// forkortede navne) ikke selv fanger en specifik OCR-fejl. Nøglen er OCR-teksten
// normaliseret som normalizeOcr() ville skrive den (stort, tegn fjernet, ét mellemrum
// mellem ord, trimmet), værdien er det rigtige varenavn. Udvid frit efter behov.
const OCR_NAME_OVERRIDES = {
  "TRE": "Træ",
};
// OCR forveksler ofte danske specialtegn med deres "udskrevne" form (fx TRÆ læses som
// TRE eller TRAE, STÅL som STAL). Behandler æ/ae, ø/oe og å/aa som ens — begge veje —
// så matchet er robust uden at skulle liste hver enkelt variant.
function foldDanishChars(s) {
  return (s || "")
    .replace(/AE/g, "E").replace(/Æ/g, "E")
    .replace(/OE/g, "O").replace(/Ø/g, "O")
    .replace(/AA/g, "A").replace(/Å/g, "A");
}
function bestMaterialMatch(rawName, materials) {
  const targetRaw = normalizeOcr(rawName);
  if (!targetRaw) return null;

  // 1) Manuel rettelse (se OCR_NAME_OVERRIDES) — slår direkte op på varenavn.
  const override = OCR_NAME_OVERRIDES[targetRaw];
  if (override) {
    const hit = findMaterialByName(materials, override);
    if (hit) return { material: hit, score: 1 };
  }

  const target = foldDanishChars(targetRaw);
  const targetNoSpace = target.replace(/\s+/g, "");
  let best = null, bestScore = -1;
  materials.forEach((m) => {
    const candRaw = normalizeOcr(m.name);
    if (!candRaw) return;
    const cand = foldDanishChars(candRaw);
    const candNoSpace = cand.replace(/\s+/g, "");
    const dist = levenshtein(target, cand);
    const maxLen = Math.max(target.length, cand.length) || 1;
    const score = 1 - dist / maxLen;
    const identical = targetNoSpace === candNoSpace;
    const wholeWord = containsWholeWord(cand, target) || containsWholeWord(target, cand);
    // Afkortet OCR-navn (fx "RAFFINERET PLAS" fra "RAFFINERET PLAS.", fordi teksten var
    // for lang på bakken) — match hvis det læste navn er begyndelsen af varenavnet.
    // Krav om mindst 4 tegn undgår korte, tilfældige præfiks-match.
    const truncated = targetNoSpace.length >= 4 && candNoSpace.startsWith(targetNoSpace);
    const strongEnough = identical || wholeWord || truncated || score >= AUTO_MATCH_SIMILARITY_MIN;
    // Det er altid bedre at lade varen stå som "ukendt" end at gætte forkert.
    if (strongEnough && score > bestScore) { bestScore = score; best = m; }
  });
  return best ? { material: best, score: bestScore } : null;
}
// ── Bakken er altid 5 felter bred. Vi skærer billedet op i kvadratiske
//    felter og OCR'er hvert felt for sig, så navne/antal ikke smøres
//    sammen på tværs af rækken. ──
const TRAY_COLS = 5;
const NAME_BRIGHT_LUM_THRESHOLD = 140; // luminans over dette regnes som "lys" (tekst) pixel
const NAME_BRIGHT_RATIO_MIN = 0.015;   // under denne andel lyse pixels i navnestriben = tomt felt
const NAME_STRIP_HEIGHT_RATIO = 0.28;  // nederste ~28% af feltet = varenavn
const QTY_WIDTH_RATIO = 0.35;          // øverste venstre hjørne: ~35% bredde
const QTY_HEIGHT_RATIO = 0.30;         // ~30% højde
const CROP_UPSCALE = 3;                // opskalering af beskårne områder før OCR

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Kunne ikke indlæse billedet."));
    img.src = src;
  });
}

// Er feltet tomt? Et udfyldt felt har ALTID en lys varenavn-tekst i bunden (uanset om
// selve varens ikon er mørkt, fx en sort pistol/radio/telefon) — så vi tester kun
// navnestriben i bunden af feltet, ikke hele feltet.
function isNameStripEmpty(ctx, x, y, w, h) {
  const iw = Math.max(1, Math.round(w)), ih = Math.max(1, Math.round(h));
  const { data } = ctx.getImageData(Math.round(x), Math.round(y), iw, ih);
  let bright = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    n++;
    if (lum > NAME_BRIGHT_LUM_THRESHOLD) bright++;
  }
  if (n === 0) return true;
  return (bright / n) < NAME_BRIGHT_RATIO_MIN;
}

// Beskærer et område af kilde-canvas'et til et nyt, opskaleret og gråtonet canvas (bedre OCR-præcision)
function cropToGrayCanvas(sourceCanvas, sx, sy, sw, sh, scale) {
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(sw * scale));
  out.height = Math.max(1, Math.round(sh * scale));
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = true;
  octx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
  const imgData = octx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = lum;
  }
  octx.putImageData(imgData, 0, 0);
  return out;
}

const NAME_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÆØÅæøå0123456789 ./-";
const QTY_WHITELIST = "0123456789";

// Skærer billedet op i bakke-felter (5 i bredden, kvadratiske) og OCR'er hvert
// ikke-tomt felts navn- og antal-område for sig. Returnerer én { raw, name, qty } pr. fundet vare.
async function scanTrayImage(imgSrc, worker, onProgress) {
  const img = await loadImageEl(imgSrc);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const cellW = canvas.width / TRAY_COLS;
  const cellH = cellW; // felterne antages kvadratiske
  const rows = Math.floor(canvas.height / cellH);
  if (rows < 1) throw new Error("Billedet er for lille/forkert formet til at finde bakke-felter.");

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < TRAY_COLS; c++) {
      const x = c * cellW, y = r * cellH;
      const nameH = cellH * NAME_STRIP_HEIGHT_RATIO;
      const nameY = y + cellH - nameH;
      if (isNameStripEmpty(ctx, x, nameY, cellW, nameH)) continue; // tomt felt -> spring helt over, ingen OCR
      cells.push({ x, y, w: cellW, h: cellH, nameY, nameH });
    }
  }
  if (cells.length === 0) return [];

  const results = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    onProgress(Math.round((i / cells.length) * 100));

    // NAVN: nederste ~28% stribe, fuld bredde af feltet
    const nameCanvas = cropToGrayCanvas(canvas, cell.x, cell.nameY, cell.w, cell.nameH, CROP_UPSCALE);

    await worker.setParameters({ tessedit_char_whitelist: NAME_WHITELIST });
    const { data: nameData } = await worker.recognize(nameCanvas);
    const name = (nameData.text || "").replace(/\s+/g, " ").trim();
    // Backstop: kassér rester som "4" eller "J" — for korte eller uden bogstaver overhovedet
    if (name.length < 3 || !/[A-Za-zÆØÅæøå]/.test(name)) continue;

    // ANTAL: øverste venstre hjørne (venstre ~35%, øverste ~30%). Øverste højre hjørne (vægt) ignoreres helt.
    const qtyW = cell.w * QTY_WIDTH_RATIO;
    const qtyH = cell.h * QTY_HEIGHT_RATIO;
    const qtyCanvas = cropToGrayCanvas(canvas, cell.x, cell.y, qtyW, qtyH, CROP_UPSCALE);

    let qty = 1;
    await worker.setParameters({ tessedit_char_whitelist: QTY_WHITELIST });
    const { data: qtyData } = await worker.recognize(qtyCanvas);
    const digits = (qtyData.text || "").replace(/[^0-9]/g, "");
    if (digits) qty = Math.max(1, parseInt(digits, 10));

    results.push({ raw: qty > 1 ? `${name} (${qty})` : name, name, qty });
  }
  onProgress(100);
  return results;
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
  const [craftCheck, setCraftCheck] = useState(null); // { matches: [{ recipe, soldQty }] } — "craftede du disse?" efter et salg
  // Et SALG der afventer bekræftelse i kvitteringen — intet er bogført endnu (se commitTrade/finalizeTrade/cancelTrade).
  // Køb bogføres stadig med det samme og bruger ikke denne (forbliver null).
  const [pendingTrade, setPendingTrade] = useState(null);
  const [pendingCraftChoices, setPendingCraftChoices] = useState({}); // recipe-navn -> antal valgt i "Craftede du disse?"
  const [activeCat, setActiveCat] = useState("Alle");
  const [savedFlash, setSavedFlash] = useState(false);
  const [craftError, setCraftError] = useState(""); // vist når craft-delen af et salg ikke kunne gennemføres (fx for få materialer)
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
  // "Skranke-vare": unikke værdigenstande (smykker, malerier, ure, ringe) købt af kunden
  // og videresolgt til spillets skranke for 100% af grundværdien. Håndteres separat fra
  // cart/materials — indgår kun i den aktuelle handel, ikke i det faste lager.
  const [counterItems, setCounterItems] = useState([]); // [{ id, note, baseValue, pct, payout, profit }]
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterForm, setCounterForm] = useState({ note: "", baseValue: "", pct: 90 });
  // Skifter Køb/Sælg uden at miste det, man har tastet ind — kun prisen pr. linje
  // regnes om til den nye tilstands standardpris (køb- eller salgspris).
  const switchTradeMode = (m) => {
    if (m === tradeMode) return;
    setTradeMode(m);
    // Skranke-varer giver kun mening ved køb fra kunden
    if (m === "sell") { setCounterItems([]); setShowCounterForm(false); }
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
  const handleDeleteCustomer = async (id) => {
    setSales((prev) => prev.filter((s) => (s.custId || "") !== id));
    try { await deleteCustomer(id); } catch (e) {}
  };

  // Crafter "qty" stk. af en opskrift: opretter evt. den færdige vare i materialelisten
  // (hvis den ikke findes i forvejen, matchet på navn), og trækker/lægger til lageret
  // atomisk via craft_item i databasen. Kaster en fejl (som Crafting-visningen viser),
  // hvis der ikke længere er nok af et materiale.
  const handleCraft = async (recipe, qty) => {
    qty = Math.max(1, Math.floor(+qty) || 0);
    if (qty <= 0) throw new Error("Ugyldigt antal.");

    let nextConfig = config;
    let outputMat = findMaterialByName(config.materials, recipe.name);
    if (!outputMat) {
      const catMatch = (config.categories || []).find((c) => c.toLowerCase() === (recipe.cat || "").toLowerCase());
      const cat = catMatch || (config.categories || [])[0] || "Andet";
      outputMat = { id: "m" + Date.now(), name: recipe.name, price: 0, sell: 0, unit: "stk.", cat };
      nextConfig = { ...config, materials: [...config.materials, outputMat] };
      await saveConfig(nextConfig);
    }

    const consumed = recipe.mats.map((rm) => {
      const mat = findMaterialByName(nextConfig.materials, rm.name);
      if (!mat) throw new Error(`Ukendt materiale: ${rm.name}`);
      return { material_id: mat.id, name: mat.name, qty: rm.qty * qty };
    });

    // hurtigt klient-tjek for en pæn fejlmelding — den autoritative kontrol sker atomisk i databasen
    for (const c of consumed) {
      const have = inventory[c.material_id] || 0;
      if (have < c.qty) throw new Error(`Ikke nok ${c.name} på lager længere — har ${have}, kræver ${c.qty}.`);
    }

    try {
      await craftItem(consumed.map(({ material_id, qty }) => ({ material_id, qty })), outputMat.id, qty);
    } catch (e) {
      throw new Error("Lageret nåede at ændre sig, inden craftet blev gennemført (en kollega har måske solgt materialer i mellemtiden). Prøv igen.");
    }

    setInventory((prev) => {
      const next = { ...prev };
      consumed.forEach((c) => { next[c.material_id] = (next[c.material_id] || 0) - c.qty; });
      next[outputMat.id] = (next[outputMat.id] || 0) + qty;
      return next;
    });
  };

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

  const materialLines = materials
    .filter((m) => cart[m.id]?.qty > 0)
    .map((m) => {
      const qty = cart[m.id].qty, price = cart[m.id].price;
      const sell = m.sell ?? m.price;
      const stock = inventory[m.id] || 0;
      return { m, qty, price, sum: qty * price, sellSum: qty * sell, costSum: qty * m.price, stock };
    });
  // Skranke-varer indgår i kurven på linje med materialer: "price"/"sum" = hvad kunden får
  // udbetalt (grundværdi × procent), "sellSum" = grundværdien (100%, det vi får fra skranken).
  const counterLines = tradeMode === "buy" ? counterItems.map((it) => ({
    m: { id: it.id, name: it.note ? `Skranke-vare: ${it.note}` : "Skranke-vare", unit: "stk." },
    qty: 1, price: it.payout, sum: it.payout, sellSum: it.baseValue, costSum: it.payout, stock: null,
    isCounter: true, counter: it,
  })) : [];
  const lines = [...materialLines, ...counterLines];
  const total = lines.reduce((a, l) => a + l.sum, 0);
  const resaleValue = lines.reduce((a, l) => a + l.sellSum, 0);
  const costBasis = lines.reduce((a, l) => a + l.costSum, 0);
  const sellTotal = tradeMode === "sell" ? costBasis : resaleValue;
  const profit = tradeMode === "sell" ? (total - costBasis) : (resaleValue - total);
  const payLabel = tradeMode === "sell" ? "Kunden skal betale" : "Kunden skal have";
  const secondaryLabel = tradeMode === "sell" ? "Kostpris" : "Videresalg";
  const profitLabel = tradeMode === "sell" ? "Fortjeneste" : "Avance";

  const tradeCounts = computeTradeCounts(sales);
  const shown = sortByStockThenTrades(
    materials.filter((m) =>
      m.name.toLowerCase().includes(q.trim().toLowerCase()) &&
      (activeCat === "Alle" || (m.cat || "Materialer") === activeCat)),
    inventory, tradeCounts);

  const cats = ["Alle", ...(config.categories || ["Materialer"])];

  // Bogfører en handel: gemmer den i databasen, justerer lager og kasse, trækker evt.
  // valgte craft-materialer (kun relevant ved salg), og logger til Discord. Alt sker
  // samlet herfra — enten alt sammen, eller (ved en fejl undervejs) intet af det bliver
  // synligt lokalt, fordi de lokale state-opdateringer sker FØR de asynkrone DB-kald.
  const commitTrade = (trade, craftChoices) => {
    // beregn evt. niveau-skift FØR vs EFTER for kunden (kun ved køb — points gives ikke ved salg)
    const custIdVal = trade.custId;
    let prevPoints = 0;
    if (custIdVal) sales.forEach((t) => { if ((t.custId || "") === custIdVal) prevPoints += (t.points || 0); });
    const wasNew = trade.type === "buy" && custIdVal && prevPoints === 0;
    const beforeLvl = levelFor(prevPoints, config.levels).cur.name;
    const afterLvl = levelFor(prevPoints + trade.points, config.levels).cur.name;

    // lager: op ved køb, ned ved salg. Kasse: ned ved køb (I betaler ud), op ved salg (I modtager)
    const invDelta = trade.type === "buy" ? 1 : -1;
    // Skranke-varer er unikke engangsgenstande og tælles IKKE i det almindelige lager —
    // kun de "rigtige" materialelinjer justerer lagerbeholdningen (bruges også nedenfor).
    const stockLines = trade.lines.filter((l) => !l.isCounter);
    const counterLines = trade.lines.filter((l) => l.isCounter);
    // Skranke-varer påvirker kassen anderledes end almindelige køb: vi udbetaler kunden
    // "sum" (grundværdi × procent) af egen kasse, men får hele grundværdien tilbage fra
    // spillets skranke bagefter — så det er kun AVANCEN (grundværdi minus det kunden
    // fik), der reelt rører den kontantbeholdning, vi tracker her, ikke hele beløbet.
    const materialTotal = stockLines.reduce((a, l) => a + l.sum, 0);
    const counterProfitTotal = counterLines.reduce((a, l) => a + ((l.baseValue || 0) - l.sum), 0);
    const cashDelta = trade.type === "buy" ? (-materialTotal + counterProfitTotal) : trade.total;

    // craft-materialer valgt i "Craftede du disse?" — for hver opskrift med craft-antal
    // > 0 skal råmaterialerne trækkes OG den færdige vare lægges til dens eget lager
    // (samme som craft_item gør på Crafting-siden). Salgets normale lagertræk herunder
    // (stockLines) trækker bagefter det solgte antal fra samme vare — ellers ville en
    // vare man lige har craftet til salget gå i minus.
    const craftJobs = []; // [{ outputMatId, qty, consumed: [{ material_id, qty }] }]
    const craftNeedByMat = {}; // råmateriale-id -> samlet behov på tværs af opskrifterne
    let craftLookupFailed = false;
    Object.entries(craftChoices || {}).forEach(([recipeName, rawQty]) => {
      const qty = Math.max(0, Math.floor(+rawQty) || 0);
      if (qty <= 0) return;
      const recipe = findRecipeByName(recipeName);
      const outputMat = recipe && findMaterialByName(config.materials, recipe.name);
      if (!recipe || !outputMat) { craftLookupFailed = true; return; }
      const consumed = [];
      recipe.mats.forEach((rm) => {
        const mat = findMaterialByName(config.materials, rm.name);
        if (!mat) { craftLookupFailed = true; return; }
        consumed.push({ material_id: mat.id, qty: rm.qty * qty });
        craftNeedByMat[mat.id] = (craftNeedByMat[mat.id] || 0) + rm.qty * qty;
      });
      craftJobs.push({ outputMatId: outputMat.id, qty, consumed });
    });
    // Tjek FØRST at der er nok af ALLE råmaterialer til ALLE craft-valg tilsammen, før
    // noget som helst udføres — hvis ikke, springes craft-delen helt over (men resten af
    // handlen — salg, lager, kasse, dagbog — bogføres stadig som normalt).
    const craftShortage = Object.entries(craftNeedByMat).find(([mid, need]) => (inventory[mid] || 0) < need);
    const craftOk = craftJobs.length > 0 && !craftLookupFailed && !craftShortage;
    if (craftJobs.length > 0 && !craftOk) {
      const msg = craftShortage
        ? `Ikke nok ${(config.materials.find((m) => m.id === craftShortage[0]) || {}).name || craftShortage[0]} på lager til at crafte — craft-materialerne blev IKKE trukket. Salget er stadig gemt.`
        : "Kunne ikke finde en opskrift eller vare til craftet — craft-materialerne blev IKKE trukket. Salget er stadig gemt.";
      setCraftError(msg);
      setTimeout(() => setCraftError((cur) => (cur === msg ? "" : cur)), 8000);
    }

    setInventory((prev) => {
      const next = { ...prev };
      stockLines.forEach((l) => { next[l.id] = (next[l.id] || 0) + invDelta * l.qty; });
      if (craftOk) {
        craftJobs.forEach((job) => {
          job.consumed.forEach((c) => { next[c.material_id] = (next[c.material_id] || 0) - c.qty; });
          next[job.outputMatId] = (next[job.outputMatId] || 0) + job.qty;
        });
      }
      return next;
    });
    setCashState((prev) => prev + cashDelta);
    setSales((prev) => [trade, ...prev].slice(0, 500));
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500);
    if (navigator.vibrate) navigator.vibrate(40);

    // skriv til databasen + log hændelser til Discord
    (async () => {
      try {
        await insertSale(trade);
        await Promise.all(stockLines.map((l) => adjustInventory(l.id, invDelta * l.qty)));
        await adjustCash(cashDelta);
        if (craftOk) {
          // sekventielt (ikke parallelt), så delte råmaterialer mellem to opskrifter
          // tjekkes korrekt af craft_item i databasen for hvert kald
          for (const job of craftJobs) {
            await craftItem(job.consumed, job.outputMatId, job.qty);
          }
        }
        if (custIdVal && wasNew) await logEvent("newcustomer", { custId: custIdVal });
        if (custIdVal && afterLvl !== beforeLvl) await logEvent("levelup", { custId: custIdVal, level: afterLvl, points: prevPoints + trade.points });
      } catch (e) {}
    })();
  };

  // Tryk på "Gem salg & kvittering" / "Gem handel & kvittering". Bygger handlen ud fra
  // kurven. KØB bogføres stadig med det samme, som hidtil (kvitteringen er bare en
  // visning bagefter). SALG bogføres INTET endnu — handlen afventer i stedet "Craftede
  // du disse?" (hvis relevant) og bekræftelse i kvitteringen (finalizeTrade/cancelTrade).
  const beginSaveTrade = () => {
    if (lines.length === 0) return;
    const pts = tradeMode === "buy" ? Math.floor(total / (config.pointsPer || 1000)) : 0;
    const trade = {
      id: "t" + Date.now(), at: Date.now(),
      custId: custId.trim(),
      points: pts,
      type: tradeMode,
      lines: lines.map((l) => ({
        id: l.m.id, name: l.m.name, qty: l.qty, price: l.price, unit: l.m.unit, sum: l.sum, sellSum: l.sellSum,
        ...(l.isCounter ? { isCounter: true, note: l.counter.note, baseValue: l.counter.baseValue, pct: l.counter.pct } : {}),
      })),
      total, sellTotal, profit,
      sellerId: profile.id, sellerName: profile.name, commission: 0,
    };

    if (tradeMode === "buy") {
      commitTrade(trade, {});
      setReceipt(trade);
      setCart({}); setCustId(""); setCounterItems([]); setShowCounterForm(false);
      return;
    }

    // Salg: intet bogført endnu. "Craftede du disse?" vises kun for linjer, der matcher
    // en af de 19 crafting-opskrifter (navnematch, ikke case/mellemrum-følsomt).
    setPendingTrade(trade);
    setPendingCraftChoices({});
    const matches = trade.lines
      .map((l) => ({ recipe: findRecipeByName(l.name), soldQty: l.qty }))
      .filter((m) => m.recipe);
    if (matches.length > 0) { setCraftCheck({ matches }); return; }
    setReceipt(trade);
  };

  // Brugerens valg fra "Craftede du disse?" — trækker INTET fra lageret endnu, gemmer
  // blot hvilke antal der skal craft-trækkes samlet, når salget bogføres ved "Færdig".
  const handleCraftDecision = (qtyMap) => {
    setPendingCraftChoices(qtyMap);
    setCraftCheck(null);
    setReceipt(pendingTrade);
  };

  // Kvitteringens ✕: annullér HELE den afventende salgshandel. Intet salg, lager, kasse,
  // craft-træk eller Discord-post — som om "Gem salg & kvittering" aldrig blev trykket.
  // Kurven bevares, så man kan rette og prøve igen.
  const cancelTrade = () => {
    setPendingTrade(null);
    setPendingCraftChoices({});
    setReceipt(null);
    setCraftCheck(null);
  };

  // Kvitteringens "Færdig" (kun for salg, der afventer bekræftelse): bogfør hele
  // handlen nu — salg, lager, kasse og craft-materialer samlet.
  const finalizeTrade = () => {
    if (!pendingTrade) return;
    commitTrade(pendingTrade, pendingCraftChoices);
    setCart({}); setCustId("");
    setReceipt(null); setPendingTrade(null); setPendingCraftChoices({});
  };

  return (
    <div className={"min-h-screen font-sans w-full" + (wide ? " text-white" : " text-stone-900 pb-40 mx-auto")}
      style={{ maxWidth: wide ? "100%" : 480, background: wide ? INK : "#fafaf9" }}>
      <style>{`button{transition:all .12s ease}button:active{transform:scale(.97)}`}</style>
      {savedFlash && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-black text-sm shadow-lg"
          style={{ background: GREEN, color: "white" }}>✓ Handel gemt</div>
      )}
      {craftError && (
        <button onClick={() => setCraftError("")}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-bold text-sm shadow-lg text-left"
          style={{ background: RED, color: "white", maxWidth: 420 }}>⚠ {craftError}</button>
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
          <button onClick={() => { setView(view === "crafting" ? "beregner" : "crafting"); setShowSettings(false); }}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "crafting" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <Hammer size={16} /> Crafting
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
        <Customers sales={sales} config={config} cur={cur} wide={wide} openCust={openCust} setOpenCust={setOpenCust}
          canManage={canManageStore} onDeleteCustomer={handleDeleteCustomer} />
      ) : view === "lager" && !showSettings ? (
        <InventoryView materials={materials} inventory={inventory} cur={cur} wide={wide} canEdit={canManageStore}
          cash={cash} tradeCounts={tradeCounts}
          onSetQty={async (mid, qty) => {
            setInventory((prev) => ({ ...prev, [mid]: qty }));
            try { await setInventoryQty(mid, qty); } catch (e) {}
          }}
          onSetCash={async (amount) => {
            setCashState(amount);
            try { await setCash(amount); } catch (e) {}
          }} />
      ) : view === "crafting" && !showSettings ? (
        <Crafting materials={materials} inventory={inventory} wide={wide} onCraft={handleCraft} />
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
                      <div key={l.m.id} className="flex justify-between items-center gap-2 text-xs py-0.5" style={{ color: "#9ca3af" }}>
                        <span className="min-w-0 truncate">{l.qty} × {l.m.name}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="tabular-nums font-semibold text-white">{fmt(l.sum)} {cur}</span>
                          {l.isCounter && (
                            <button onClick={() => setCounterItems((prev) => prev.filter((it) => it.id !== l.m.id))}
                              title="Fjern skranke-vare" aria-label="Fjern skranke-vare"
                              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ color: "#f87171" }}>
                              <X size={12} />
                            </button>
                          )}
                        </span>
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
                  {tradeMode === "buy" && (
                    <div className="mt-3">
                      {!showCounterForm ? (
                        <button onClick={() => setShowCounterForm(true)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed text-xs font-bold"
                          style={{ borderColor: "#444", color: GOLD }}>
                          <Plus size={14} /> Tilføj skranke-vare
                        </button>
                      ) : (
                        <div className="rounded-lg p-3 space-y-2" style={{ background: "#111", border: "1px solid #333" }}>
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: GOLD }}>Skranke-vare</div>
                            <button onClick={() => { setShowCounterForm(false); setCounterForm({ note: "", baseValue: "", pct: 90 }); }}
                              aria-label="Luk" className="w-5 h-5 rounded-full flex items-center justify-center" style={{ color: "#9ca3af" }}>
                              <X size={13} />
                            </button>
                          </div>
                          <label className="block">
                            <div className="text-[10px] font-bold mb-1" style={{ color: "#9ca3af" }}>Note (valgfri)</div>
                            <input value={counterForm.note} placeholder="Note (fx smykke, maleri) — valgfri"
                              onChange={(e) => setCounterForm((f) => ({ ...f, note: e.target.value }))}
                              className="w-full rounded-lg border px-2 py-1.5 text-sm font-bold"
                              style={{ borderColor: "#444", background: PANEL, color: "white" }} />
                          </label>
                          <div className="flex items-center gap-2">
                            <label className="flex-1 min-w-0 block">
                              <div className="text-[10px] font-bold mb-1" style={{ color: "#9ca3af" }}>Grundværdi (100%)</div>
                              <input type="number" inputMode="numeric" value={counterForm.baseValue} placeholder="0"
                                onChange={(e) => setCounterForm((f) => ({ ...f, baseValue: e.target.value }))}
                                className="w-full rounded-lg border px-2 py-1.5 text-sm font-bold"
                                style={{ borderColor: "#444", background: PANEL, color: "white" }} />
                            </label>
                            <label className="w-20 shrink-0 block">
                              <div className="text-[10px] font-bold mb-1" style={{ color: "#9ca3af" }}>Kunden får %</div>
                              <input type="number" inputMode="numeric" value={counterForm.pct}
                                onChange={(e) => setCounterForm((f) => ({ ...f, pct: e.target.value }))}
                                className="w-full rounded-lg border px-2 py-1.5 text-sm font-bold"
                                style={{ borderColor: "#444", background: PANEL, color: "white" }} />
                            </label>
                          </div>
                          {(() => {
                            const bv = Math.max(0, +counterForm.baseValue || 0);
                            const pct = Math.max(0, Math.min(100, +counterForm.pct || 0));
                            const payoutPreview = Math.round(bv * pct / 100);
                            const profitPreview = bv - payoutPreview;
                            return (
                              <div className="text-[11px] space-y-0.5 pt-0.5" style={{ color: "#9ca3af" }}>
                                <div>Kunden får: <span className="font-bold text-white">{fmt(payoutPreview)} {cur}</span></div>
                                <div>Din fortjeneste: <span className="font-bold" style={{ color: GOLD }}>{fmt(profitPreview)} {cur}</span></div>
                              </div>
                            );
                          })()}
                          <button onClick={() => {
                              const bv = Math.max(0, +counterForm.baseValue || 0);
                              if (bv <= 0) return;
                              const pct = Math.max(0, Math.min(100, +counterForm.pct || 0));
                              const payout = Math.round(bv * pct / 100);
                              const note = counterForm.note.trim();
                              setCounterItems((prev) => [...prev, {
                                id: "c" + Date.now() + Math.random().toString(36).slice(2, 7),
                                note, baseValue: bv, pct, payout, profit: bv - payout,
                              }]);
                              setCounterForm({ note: "", baseValue: "", pct });
                            }}
                            disabled={!(+counterForm.baseValue > 0)}
                            className="w-full py-2 rounded-lg font-black text-xs disabled:opacity-40"
                            style={{ background: GOLD, color: INK }}>
                            <Plus size={13} className="inline -mt-0.5" /> Tilføj til handlen
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {lines.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <button onClick={() => beginSaveTrade()}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-black text-base"
                        style={{ background: tradeMode === "sell" ? GREEN : GOLD, color: tradeMode === "sell" ? "white" : INK }}>
                        <Save size={18} /> {tradeMode === "sell" ? "Gem salg & kvittering" : "Gem handel & kvittering"}
                      </button>
                      <button onClick={() => { setCart({}); setCounterItems([]); setShowCounterForm(false); }}
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

      {receipt ? (
        <ReceiptModal trade={receipt} config={config} pending={!!pendingTrade}
          onConfirm={finalizeTrade} onCancel={cancelTrade} onClose={() => setReceipt(null)} />
      ) : craftCheck ? (
        <CraftCheckModal matches={craftCheck.matches} onDecide={handleCraftDecision} />
      ) : null}
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
              <button onClick={() => beginSaveTrade()}
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

function Customers({ sales, config, cur, wide, openCust, setOpenCust, canManage, onDeleteCustomer }) {
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
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setOpenCust(null)} className="flex items-center gap-1 text-sm font-bold" style={{ color: dk ? GOLD : BLUE }}>
            <ChevronLeft size={16} /> Tilbage til kunder
          </button>
          {canManage && (
            <button
              onClick={() => {
                if (window.confirm(`Slet kunden "${c.id}" og alle ${c.trades.length} handler? Det kan ikke fortrydes.`)) {
                  onDeleteCustomer(c.id);
                  setOpenCust(null);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs"
              style={{ background: dk ? "rgba(192,57,43,.15)" : "#fdf0ef", color: RED }}>
              <Trash2 size={14} /> Slet kunde
            </button>
          )}
        </div>
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
            <div key={c.id} className="w-full rounded-xl border p-3 flex items-center justify-between gap-2" style={box}>
              <button onClick={() => setOpenCust(c.id)} className="flex-1 min-w-0 text-left flex items-center justify-between gap-3">
                <div>
                  <div className="font-black" style={{ color: dk ? "white" : INK }}>{c.id}</div>
                  <div className="text-[11px]" style={{ color: sub }}>{c.trades.length} handler · {c.points} point</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black" style={{ background: dk ? "rgba(245,179,1,.15)" : "#fdf3e7", color: dk ? GOLD : GOLD_D }}>{lvl.name}</span>
                  <span className="font-black tabular-nums" style={{ color: dk ? GOLD : INK }}>{fmt(c.total)} {cur}</span>
                </div>
              </button>
              {canManage && (
                <button
                  onClick={() => {
                    if (window.confirm(`Slet kunden "${c.id}" og alle ${c.trades.length} handler? Det kan ikke fortrydes.`)) {
                      onDeleteCustomer(c.id);
                    }
                  }}
                  title="Slet kunde"
                  className="shrink-0 p-2 rounded-lg"
                  style={{ color: RED }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Lager ── */
function InventoryView({ materials, inventory, cur, wide, canEdit, cash, tradeCounts, onSetQty, onSetCash }) {
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

  const shown = sortByStockThenTrades(
    materials.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase())),
    inventory, tradeCounts || {});
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

/* ── Crafting (visning/tjek — trækker IKKE fra lager) ── */
function findMaterialByName(materials, name) {
  const target = (name || "").trim().toLowerCase();
  return materials.find((m) => (m.name || "").trim().toLowerCase() === target) || null;
}
// Samme insensitive navnematch som ovenfor, men mod opskriftslisten — bruges til at
// opdage om en solgt vare er en af de 19 craftbare ting (fx til "craftede du disse?").
function findRecipeByName(name) {
  const target = (name || "").trim().toLowerCase();
  return RECIPES.find((r) => r.name.trim().toLowerCase() === target) || null;
}

function Crafting({ materials, inventory, wide, onCraft }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const wrap = "pb-10 " + (dk ? "px-8 pt-6 mx-auto " : "px-3 pt-3 ") + (dk ? "text-white" : "");
  const wrapStyle = dk ? { maxWidth: PAGE_MAX } : {};
  const cats = [...new Set(RECIPES.map((r) => r.cat))];

  const [qtyByRecipe, setQtyByRecipe] = useState({});
  const [busyRecipe, setBusyRecipe] = useState(null);
  const [msgByRecipe, setMsgByRecipe] = useState({}); // recipe.name -> { type: "ok"|"err", text }

  const doCraft = async (r, rows, maxTotal) => {
    const qty = Math.min(Math.max(1, Math.floor(+qtyByRecipe[r.name] || 1)), maxTotal);
    const matsStr = rows.map((row) => `${row.req.qty * qty}× ${row.mat.name}`).join(", ");
    const confirmed = window.confirm(
      `Craft ${qty}× ${r.name}? Dette trækker ${matsStr} fra lageret og lægger ${qty}× ${r.name} til.`
    );
    if (!confirmed) return;

    setBusyRecipe(r.name);
    setMsgByRecipe((prev) => ({ ...prev, [r.name]: null }));
    try {
      await onCraft(r, qty);
      setMsgByRecipe((prev) => ({ ...prev, [r.name]: { type: "ok", text: `✓ Craftede ${qty}× ${r.name}` } }));
    } catch (e) {
      setMsgByRecipe((prev) => ({ ...prev, [r.name]: { type: "err", text: e.message || "Craft fejlede." } }));
    } finally {
      setBusyRecipe(null);
      setTimeout(() => setMsgByRecipe((prev) => ({ ...prev, [r.name]: null })), 5000);
    }
  };

  return (
    <div className={wrap} style={wrapStyle}>
      <div className="text-xs mb-4" style={{ color: sub }}>
        Viser om I har nok materialer på lager til hver opskrift. Tryk "Craft" for at trække materialerne fra det delte lager og lægge den færdige vare til.
      </div>
      {cats.map((cat) => (
        <div key={cat} className="mb-5">
          <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: dk ? GOLD : BLUE }}>{cat}</div>
          <div className={wide ? "grid gap-3" : "space-y-2"} style={wide ? { gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" } : {}}>
            {RECIPES.filter((r) => r.cat === cat).map((r) => {
              const rows = r.mats.map((req) => {
                const mat = findMaterialByName(materials, req.name);
                if (!mat) return { req, mat: null, unknown: true, ok: false, stock: 0, maxCraft: 0 };
                const stock = inventory[mat.id] || 0;
                const ok = stock >= req.qty;
                const maxCraft = req.qty > 0 ? Math.floor(stock / req.qty) : 0;
                return { req, mat, unknown: false, ok, stock, maxCraft };
              });
              const hasUnknown = rows.some((x) => x.unknown);
              const canCraft = !hasUnknown && rows.every((x) => x.ok);
              const maxTotal = hasUnknown ? 0 : Math.min(...rows.map((x) => x.maxCraft));
              const status = hasUnknown ? "unknown" : canCraft ? "ok" : "missing";
              const statusColor = status === "ok" ? GREEN : status === "unknown" ? ORANGE : RED;
              const cardBg = status === "ok"
                ? (dk ? "rgba(46,125,50,.08)" : GREEN_T)
                : status === "unknown"
                  ? (dk ? "rgba(230,126,34,.08)" : "#fdf3e7")
                  : (dk ? "rgba(192,57,43,.08)" : "#fdf0ef");
              return (
                <div key={r.name} className="rounded-xl border p-3" style={{ ...box, background: cardBg, borderColor: statusColor }}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-black" style={{ color: dk ? "white" : INK }}>{r.name}</div>
                    <div className="flex items-center gap-1 text-[11px] font-bold shrink-0" style={{ color: sub }}>
                      <Clock size={12} /> {r.time}s
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black mb-2"
                    style={{ background: statusColor, color: status === "unknown" ? INK : "white" }}>
                    {status === "ok" && `✓ Kan laves × ${maxTotal}`}
                    {status === "missing" && "✕ Mangler materialer"}
                    {status === "unknown" && "⚠ Ukendt materiale i opskrift"}
                  </div>
                  <div className="space-y-1">
                    {rows.map((row, i) => (
                      <div key={i} className="text-[12px]">
                        {row.unknown ? (
                          <span style={{ color: ORANGE, fontWeight: 700 }}>Ukendt materiale: {row.req.name}</span>
                        ) : row.ok ? (
                          <div className="flex items-center justify-between">
                            <span style={{ color: sub }}>{row.req.qty}× {row.mat.name}</span>
                            <span style={{ color: dk ? "#4ade80" : GREEN, fontWeight: 700 }}>{row.stock} på lager</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span style={{ color: sub }}>{row.req.qty}× {row.mat.name}</span>
                            <span style={{ color: "#f87171", fontWeight: 700 }}>
                              Mangler {row.req.qty - row.stock}× — har {row.stock}, kræver {row.req.qty}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {status === "ok" && (
                    <div className="mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${dk ? "#333" : "#e7e5e4"}` }}>
                      <div className="flex items-center gap-2">
                        <input type="number" inputMode="numeric" min={1} max={maxTotal}
                          value={qtyByRecipe[r.name] ?? 1}
                          onChange={(e) => {
                            const v = Math.min(Math.max(1, Math.floor(+e.target.value) || 1), maxTotal);
                            setQtyByRecipe((prev) => ({ ...prev, [r.name]: v }));
                          }}
                          className="w-16 text-center rounded-lg border py-2 text-sm font-bold"
                          style={{ borderColor: dk ? "#444" : "#d6d3d1", background: dk ? "#111" : "white", color: dk ? "white" : INK }} />
                        <button onClick={() => doCraft(r, rows, maxTotal)} disabled={busyRecipe === r.name}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-black text-sm disabled:opacity-50"
                          style={{ background: GREEN, color: "white" }}>
                          <Hammer size={14} /> {busyRecipe === r.name ? "Crafter…" : "Craft"}
                        </button>
                      </div>
                    </div>
                  )}
                  {msgByRecipe[r.name] && (
                    <div className="text-[11px] font-bold mt-2" style={{ color: msgByRecipe[r.name].type === "ok" ? (dk ? "#4ade80" : GREEN) : "#f87171" }}>
                      {msgByRecipe[r.name].text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
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
    if (!imgSrc) return;
    setScanning(true); setProgress(0); setErr("");
    let worker = null;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng");
      const parsed = await scanTrayImage(imgSrc, worker, setProgress);
      if (parsed.length === 0) { setErr("Fandt ingen udfyldte felter eller læselige varenavne i billedet. Prøv et tydeligere/nærmere screenshot af bakken."); setScanning(false); await worker.terminate(); return; }
      setRows(parsed.map((p) => {
        const match = bestMaterialMatch(p.name, materials);
        return { raw: p.raw, materialId: match ? match.material.id : "", qty: p.qty, checked: true };
      }));
    } catch (e) {
      setErr("OCR fejlede: " + (e?.message || String(e)));
    }
    if (worker) { try { await worker.terminate(); } catch (e) {} }
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
// pending=true (kun ved salg, der endnu ikke er bogført): "Færdig" bogfører hele
// handlen (onConfirm), og et ✕ i toppen annullerer den helt uden spor (onCancel).
// pending=false (køb, der allerede er bogført med det samme): kvitteringen er bare en
// visning, og "Færdig" lukker den blot (onClose) — som hidtil.
function ReceiptModal({ trade, config, pending, onConfirm, onCancel, onClose }) {
  const cur = config.currency;
  const d = new Date(trade.at);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={pending ? undefined : onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative px-5 py-4 text-center" style={{ background: INK, borderBottom: `3px solid ${GOLD}` }}>
          {pending && (
            <button onClick={onCancel} aria-label="Annullér handlen" title="Annullér handlen"
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ color: GOLD, background: "rgba(245,179,1,.15)" }}>
              <X size={15} />
            </button>
          )}
          <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: GOLD }}>Buy · Sell · Trade</div>
          <div className="text-xl font-black text-white">{config.shopName}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Kvittering · {d.toLocaleDateString("da-DK")} {d.toTimeString().slice(0, 5)}</div>
        </div>
        <div className="px-5 py-4 text-stone-900">
          {trade.lines.map((l, i) => (
            <div key={i} className="py-1 border-b border-stone-100">
              <div className="flex justify-between text-sm">
                <span className="text-stone-700">{l.qty} {l.unit || "stk."} × {l.name}</span>
                <span className="font-semibold tabular-nums text-stone-900">{fmt(l.sum)} {cur}</span>
              </div>
              {l.isCounter && (
                <div className="text-[11px] text-stone-400">
                  Grundværdi {fmt(l.baseValue)} {cur} ({l.pct}%)
                </div>
              )}
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
          <button onClick={pending ? onConfirm : onClose} className="px-4 py-2.5 rounded-xl font-black text-white" style={{ background: INK }}>Færdig</button>
        </div>
      </div>
    </div>
  );
}

/* ── "Craftede du disse?" — vises FØR kvitteringen, hvis en eller flere solgte varer
   matcher en crafting-opskrift. Trækker INTET fra lageret her — gemmer blot brugerens
   valg (onDecide), som først udføres samlet med resten af salget ved "Færdig" i
   kvitteringen (se finalizeTrade/commitTrade i App). ── */
function CraftCheckModal({ matches, onDecide }) {
  const [qtyMap, setQtyMap] = useState(() =>
    Object.fromEntries(matches.map((m) => [m.recipe.name, m.soldQty]))
  );

  const setQty = (name, v) => {
    // tomt felt (v === "") -> +v er NaN -> || 0 rammer, dvs. tomt felt tæller som 0
    const n = Math.max(0, Math.floor(+v) || 0);
    setQtyMap((prev) => ({ ...prev, [name]: n }));
  };

  // Kryds og "Spring over" gør PRÆCIS det samme: gå videre til kvitteringen uden at
  // vælge nogen craft-materialer til at blive trukket ved "Færdig".
  const handleSkip = () => onDecide({});
  // Kaldes KUN af "Bekræft"-knappen: gemmer de indtastede antal (et tomt/0-felt
  // tælles ikke med) og går videre til kvitteringen.
  const handleConfirm = () => onDecide(qtyMap);

  return (
    // Bevidst INTET onClick her — klik på baggrunden/overlayet må ikke lukke dialogen.
    // Dialogen kan kun lukkes via krydset, "Spring over" eller "Bekræft".
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="relative px-5 py-4" style={{ background: INK, borderBottom: `3px solid ${GOLD}` }}>
          <button onClick={handleSkip} aria-label="Luk" title="Luk"
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ color: GOLD, background: "rgba(245,179,1,.15)" }}>
            <X size={15} />
          </button>
          <div className="flex items-center gap-2 text-white font-black text-base pr-8"><Hammer size={17} color={GOLD} /> Craftede du disse?</div>
          <div className="text-[11px] text-stone-400 mt-0.5 pr-8">Materialerne trækkes sammen med resten af salget, når du trykker "Færdig" i kvitteringen. Sæt 0 for at springe en vare over.</div>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {matches.map((m) => (
            <div key={m.recipe.name} className="flex items-center justify-between gap-3 pb-3 border-b border-stone-100 last:border-0 last:pb-0">
              <div className="min-w-0">
                <div className="font-bold text-sm text-stone-900 truncate">{m.recipe.name}</div>
                <div className="text-[11px] text-stone-500">Solgt: {m.soldQty} stk.</div>
              </div>
              <input type="number" inputMode="numeric" min={0} value={qtyMap[m.recipe.name] ?? 0}
                onChange={(e) => setQty(m.recipe.name, e.target.value)}
                className="w-16 text-center rounded-lg border border-stone-300 py-2 text-sm font-bold shrink-0"
                style={{ background: "white", color: INK, colorScheme: "light" }} />
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={handleSkip}
            className="flex-1 py-2.5 rounded-xl font-bold text-stone-600 border border-stone-300">Spring over</button>
          <button onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl font-black text-white" style={{ background: GREEN }}>Bekræft</button>
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
  // Skranke-varer må ikke tælle som udgift til deres fulde beløb (det kunden fik) — kun
  // AVANCEN (grundværdi minus det kunden fik) skal tælle, og den tæller som en INDTÆGT/i
  // overskuddet, ikke en udgift. Samme regel som kassen: kun avancen rører regnskabet.
  const buyExpense = (t) => (t.lines || []).filter((l) => !l.isCounter).reduce((a, l) => a + l.sum, 0);
  const buyCounterProfit = (t) => (t.lines || []).filter((l) => l.isCounter).reduce((a, l) => a + ((l.baseValue || 0) - l.sum), 0);
  const udgifter = sum(buys, buyExpense);
  const indtaegter = sum(sells, (t) => t.total) + sum(buys, buyCounterProfit);
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
          // En handel kan indeholde BÅDE almindelige varer (udgift) OG skranke-varer
          // (gevinst = avancen). Kun for sådanne blandede/skranke-handler viser vi
          // NETTO-resultatet i stedet for t.total — almindelige handler uden
          // skranke-varer viser t.total helt som før.
          const hasCounter = (t.lines || []).some((l) => l.isCounter);
          const netAmount = hasCounter ? (buyCounterProfit(t) - buyExpense(t)) : t.total;
          const isGain = isSell || (hasCounter && netAmount >= 0);
          const amountPrefix = hasCounter && !isSell && netAmount >= 0 ? "+" : "";
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
                  <span className="font-black tabular-nums" style={{ color: isGain ? (dk ? "#4ade80" : GREEN) : (dk ? "#f87171" : RED) }}>{amountPrefix}{fmt(netAmount)} {cur}</span>
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
  const commit = () => save({
    shopName: shopName.trim() || "Udbetalingsberegner", currency: currency.trim() || "kr.",
    categories: catList.length ? catList : ["Materialer"],
    pointsPer: +pointsPer || 1000, levels, materials: list,
  });

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
