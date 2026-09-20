import { useState, useEffect, useRef } from "react";
import { Plus, Minus, X, Trash2, RotateCcw, Settings, Check, Search, Receipt, BarChart3, Save, Clock, User, Users, LogOut, Award, ChevronLeft, ChevronDown, Lock, Package, ArrowLeftRight, Home, Camera, Hammer, Trophy, TrendingUp, Star, Pencil, Download, Wallet, Activity } from "lucide-react";
import {
  loadConfig, saveConfig as sbSaveConfig, loadSales as sbLoadSales, insertSale, logEvent,
  signIn, signOut, getSession, onAuthChange, loadMyProfile, loadAllProfiles,
  createStaff, updateStaff, deleteStaff, setDiscordId,
  loadInventory, adjustInventory, setInventoryQty,
  loadMaterialVisibility, setMaterialVisibility as sbSetMaterialVisibility,
  loadMaterialImages, setMaterialImage as sbSetMaterialImage,
  loadCash, adjustCash, setCash,
  deleteCustomer, craftItem, reverseSale, updateSaleCustomer, editSaleAmount,
  loadLeaderboardSettings, saveLeaderboardSettings,
  loadCustomerPhones, saveCustomerPhone,
  loadRecipes, createRecipe, updateRecipe, deleteRecipe,
  loadActiveShifts, loadShiftLog, clockIn as sbClockIn, clockOut as sbClockOut,
  closeShift as sbCloseShift, editShift as sbEditShift,
  loadActivityLog,
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
// Alle klokkeslæt/datoer i appen skal vises i DANSK tid (Europe/Copenhagen), med
// korrekt sommer-/vintertid — IKKE i den tidszone browseren/enheden selv står i
// (som fx kan være UTC, hvis nogen tester fra en server/VPS). Tidsstemplerne i
// databasen er og forbliver UTC — dette rører KUN visningen, aldrig lagringen
// eller nogen beregning (varighed osv. regnes stadig på de rå ms-epoch-tal).
// "en-GB" bruges bevidst for selve KLOKKESLÆT-formatet (garanterer "14:05" med
// kolon og 24-timers-ur) — det er kun "timeZone", der styrer selve tidszonen,
// uanset hvilket sprog-format der bruges til at skrive tallene ud.
const DK_TZ = "Europe/Copenhagen";
const fmtTimeDK = (ms) => new Date(ms).toLocaleTimeString("en-GB", { timeZone: DK_TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const fmtDateDK = (ms) => new Date(ms).toLocaleDateString("da-DK", { timeZone: DK_TZ });
// Stabilt "YYYY-MM-DD"-nøgle i dansk tid — bruges KUN til at gruppere/sortere vagter pr.
// dag (fmtDateDK ovenfor er til visning og kan ikke bruges som nøgle, da formatet
// afhænger af locale). Samme dag i København, uanset browserens egen tidszone.
const dayKeyDK = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: DK_TZ });
const PAGE_MAX = 1100; // max-bredde for indholdssider på brede skærme (Kunder/Ansatte/Rediger)
const BIG_TRADE_CONFIRM_THRESHOLD = 500000; // over dette beløb (kr.) skal kassøren bekræfte handlen, før den gemmes

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

// ── Handel: lager-/kasse-påvirkning ─────────────────────────────────────────
// Bruges af commitTrade til at beregne kassens faktiske ændring ved en handel.
function tradeStockLines(trade) {
  return (trade.lines || []).filter((l) => !l.isCounter);
}
function tradeCounterLines(trade) {
  return (trade.lines || []).filter((l) => l.isCounter);
}
// Kassens ændring ved at bogføre "trade": KØB trækker materialernes beløb fra, men
// skranke-varers AVANCE (ikke hele udbetalingen — se commitTrade) lægges til. SALG
// lægger hele det modtagne beløb til.
function tradeCashDelta(trade) {
  const materialTotal = tradeStockLines(trade).reduce((a, l) => a + l.sum, 0);
  const counterProfitTotal = tradeCounterLines(trade).reduce((a, l) => a + ((l.baseValue || 0) - l.sum), 0);
  return trade.type === "buy" ? (-materialTotal + counterProfitTotal) : trade.total;
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
// OCR forveksler ofte danske specialtegn med deres "udskrevne" form (fx TRÆ læses som
// TRE eller TRAE, STÅL som STAL). Behandler æ/ae, ø/oe og å/aa som ens — begge veje —
// så matchet er robust uden at skulle liste hver enkelt variant.
function foldDanishChars(s) {
  return (s || "")
    .replace(/AE/g, "E").replace(/Æ/g, "E")
    .replace(/OE/g, "O").replace(/Ø/g, "O")
    .replace(/AA/g, "A").replace(/Å/g, "A");
}
// OCR læser somme tider Ø visuelt som "E" i stedet for at stave den ud som "OE" (fx
// "GØDNING" -> "GEDNI"). foldDanishChars() ovenfor dækker kun den udskrevne form
// (OE/AE/AA), så vi prøver også denne variant, hvor Ø/OE foldes til E, ved siden af
// den almindelige — ellers falder afkortede navne som "FLYDENDE GEDNI" mellem to stole.
function foldDanishCharsOcrE(s) {
  return (s || "")
    .replace(/AE/g, "E").replace(/Æ/g, "E")
    .replace(/OE/g, "E").replace(/Ø/g, "E")
    .replace(/AA/g, "A").replace(/Å/g, "A");
}
function bestMaterialMatch(rawName, materials) {
  const targetRaw = normalizeOcr(rawName);
  if (!targetRaw) return null;

  const target = foldDanishChars(targetRaw);
  const targetNoSpace = target.replace(/\s+/g, "");
  const targetE = foldDanishCharsOcrE(targetRaw);
  const targetENoSpace = targetE.replace(/\s+/g, "");
  let best = null, bestScore = -1;
  materials.forEach((m) => {
    const candRaw = normalizeOcr(m.name);
    if (!candRaw) return;
    const cand = foldDanishChars(candRaw);
    const candNoSpace = cand.replace(/\s+/g, "");
    const candE = foldDanishCharsOcrE(candRaw);
    const candENoSpace = candE.replace(/\s+/g, "");
    const dist = Math.min(levenshtein(target, cand), levenshtein(targetE, candE));
    const maxLen = Math.max(target.length, cand.length) || 1;
    const score = 1 - dist / maxLen;
    const identical = targetNoSpace === candNoSpace || targetENoSpace === candENoSpace;
    const wholeWord = containsWholeWord(cand, target) || containsWholeWord(target, cand)
      || containsWholeWord(candE, targetE) || containsWholeWord(targetE, candE);
    // Afkortet OCR-navn (fx "RAFFINERET PLAS" fra "RAFFINERET PLAS.", fordi teksten var
    // for lang på bakken) — match hvis det læste navn er begyndelsen af varenavnet.
    // Krav om mindst 4 tegn undgår korte, tilfældige præfiks-match. Tjekkes i begge
    // Ø-varianter (Ø->O og Ø->E), så æøå-normaliseringen og afkortnings-reglen spiller sammen.
    const truncated = (targetNoSpace.length >= 4 && candNoSpace.startsWith(targetNoSpace))
      || (targetENoSpace.length >= 4 && candENoSpace.startsWith(targetENoSpace));
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
const QTY_UPSCALE = 5;                 // antal-tallet er meget lille i originalen, så det får sin egen, større opskalering

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

const QTY_BADGE_CONTRAST_MIN = 40; // min-max luminansspredning i hjørnet, der tæller som "der er et badge her"

// Er der et tal-badge i feltets hjørne? Badget er ALTID en mørk cirkel med et lyst tal
// (fast i spillets design), så det giver stærk intern lyshedskontrast — modsat en tom,
// stort set ensfarvet baggrund. Dette er en BEVIDST grov/lempelig test (kun min/max-
// spredning), UAFHÆNGIG af den præcise cifer-segmentering, som selve tal-læsningen bruger
// (extractQtyDigitBitmaps) — den er tunet til at isolere ENKELTE cifre præcist til
// skabelon-matching, og er derfor for skrap til blot at afgøre "er der overhovedet noget
// her": et tyndt/kort ciffer (fx et enkelt "4") kunne fejlagtigt segmentere til nul
// bokse, selvom badget tydeligvis findes. Den grove kontrast-test fejler ikke sådan.
function hasQtyBadge(ctx, x, y, w, h) {
  const iw = Math.max(1, Math.round(w)), ih = Math.max(1, Math.round(h));
  const { data } = ctx.getImageData(Math.round(x), Math.round(y), iw, ih);
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }
  return (max - min) >= QTY_BADGE_CONTRAST_MIN;
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

// Beregner en Otsu-tærskel (automatisk sort/hvid-skel) for en gråtone-pixelliste —
// bruges til at binarisere antal-tallet, så cifrene bliver skarpe og entydige for OCR.
function otsuThreshold(gray, n) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < n; i++) hist[gray[i]]++;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 127, bestVar = -1;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = n - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > bestVar) { bestVar = v; best = t; }
  }
  return best;
}

// Beskærer, opskalerer og binariserer (rent sort/hvid) et område — bruges KUN til
// antal-tallet, hvor skarpe, rene cifre betyder mere for OCR-præcisionen end for
// varenavnet (som ikke røres af denne ændring). Cifrene ender altid som hvidt på sort,
// uanset om de i originalen er lyse på mørk baggrund eller omvendt — mindretals-
// intensiteten (den der fylder mindst i feltet) regnes som selve tallet, resten som
// baggrund/støj, som dermed forsvinder helt i stedet for at forstyrre OCR'en.
function cropToBinaryCanvas(sourceCanvas, sx, sy, sw, sh, scale) {
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(sw * scale));
  out.height = Math.max(1, Math.round(sh * scale));
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = true;
  octx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
  const imgData = octx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;
  const n = out.width * out.height;
  const gray = new Uint8ClampedArray(n);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    gray[p] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
  }
  const t = otsuThreshold(gray, n);
  let above = 0;
  for (let p = 0; p < n; p++) if (gray[p] >= t) above++;
  const textIsAbove = above < n - above; // mindretalsklassen = teksten
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const isText = textIsAbove ? gray[p] >= t : gray[p] < t;
    const v = isText ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  octx.putImageData(imgData, 0, 0);
  return out;
}

// ── Ciffer-skabelon-matching (badge-tal) ────────────────────────────────────────
// Spillets antal-badge tegner altid cifrene i den samme faste font, så i stedet for
// at "læse" tallet med Tesseract sammenlignes hvert enkelt ciffer direkte mod gemte
// skabeloner for 0-9 — langt mere robust end OCR for lige netop disse tal. Tesseract
// (to-pas gråtone + binariseret, se scanTrayImage) bruges KUN som fallback, hvis der
// endnu ikke er kalibreret skabeloner, eller et ciffer ikke matcher nogen sikkert nok.
const DIGIT_TEMPLATES_KEY = "digit-templates";     // localStorage-nøgle — gratis, ingen database
const DIGIT_TPL_W = 20, DIGIT_TPL_H = 28;          // fast normaliseret størrelse pr. ciffer
const DIGIT_MATCH_MIN_SCORE = 0.72;                // under denne lighed (0-1, SAD-baseret) stoles der ikke på matchet

function loadDigitTemplates() {
  try {
    const raw = localStorage.getItem(DIGIT_TEMPLATES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch (e) { return {}; }
}
// Gemmer ÉN skabelon pr. cifer-værdi (0-9) — en ny kalibrering/rettelse overskriver
// blot den forrige for det ciffer, som ønsket (intet gennemsnit, ingen historik).
function saveDigitTemplate(digit, bitmap) {
  try {
    const all = loadDigitTemplates();
    all[String(digit)] = Array.from(bitmap);
    localStorage.setItem(DIGIT_TEMPLATES_KEY, JSON.stringify(all));
  } catch (e) {}
}

// Beskærer badge-området, opskalerer og binariserer med FAST polaritet — badgets tal
// er altid hvidt på en mørk cirkel i spillets faste design, så (modsat cropToBinaryCanvas
// ovenfor) er der ingen grund til at gætte polaritet ud fra billedet. Returnerer et
// 0/1-bitmap i det opskalerede koordinatsystem.
function cropBadgeBitmap(sourceCanvas, sx, sy, sw, sh, scale) {
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = true;
  octx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, w, h);
  const { data } = octx.getImageData(0, 0, w, h);
  const n = w * h;
  const gray = new Uint8ClampedArray(n);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  const t = otsuThreshold(gray, n);
  const bin = new Uint8Array(n);
  for (let p = 0; p < n; p++) bin[p] = gray[p] >= t ? 1 : 0; // lyst = ciffer
  return { bin, w, h };
}

// Finder enkelte cifre i badget via vertikal projektion: summér "tændte" pixels pr.
// kolonne, og gruppér sammenhængende søjler med indhold til hver sit ciffer — det
// splitter fx et 538-badge til tre separate bokse (5, 3, 8).
function segmentDigitBoxes(bin, w, h) {
  const colSum = new Int32Array(w);
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = 0; y < h; y++) s += bin[y * w + x];
    colSum[x] = s;
  }
  const minCol = Math.max(1, Math.round(h * 0.04)); // ignorér spredte enkelt-pixel støj i en søjle
  const minWidth = Math.max(2, Math.round(w * 0.015));
  const boxes = [];
  let x = 0;
  while (x < w) {
    if (colSum[x] < minCol) { x++; continue; }
    const x0 = x;
    while (x < w && colSum[x] >= minCol) x++;
    const x1 = x - 1;
    if (x1 - x0 + 1 < minWidth) continue; // for smalt til at være et rigtigt ciffer — støj
    let y0 = h, y1 = -1;
    for (let yy = 0; yy < h; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        if (bin[yy * w + xx]) { if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; break; }
      }
    }
    if (y1 >= y0) boxes.push({ x0, x1, y0, y1 });
  }
  return boxes;
}

// Klipper ét ciffer-område ud og normaliserer det til den faste skabelon-størrelse
// (DIGIT_TPL_W × DIGIT_TPL_H), så alle cifre — uanset badgets egen opløsning — kan
// sammenlignes direkte med de gemte skabeloner.
function normalizeDigitBox(bin, w, h, box) {
  const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
  const src = document.createElement("canvas");
  src.width = bw; src.height = bh;
  const sctx = src.getContext("2d");
  const imgData = sctx.createImageData(bw, bh);
  for (let yy = 0; yy < bh; yy++) {
    for (let xx = 0; xx < bw; xx++) {
      const v = bin[(box.y0 + yy) * w + (box.x0 + xx)] ? 255 : 0;
      const di = (yy * bw + xx) * 4;
      imgData.data[di] = imgData.data[di + 1] = imgData.data[di + 2] = v;
      imgData.data[di + 3] = 255;
    }
  }
  sctx.putImageData(imgData, 0, 0);

  const dst = document.createElement("canvas");
  dst.width = DIGIT_TPL_W; dst.height = DIGIT_TPL_H;
  const dctx = dst.getContext("2d");
  dctx.imageSmoothingEnabled = true;
  dctx.drawImage(src, 0, 0, bw, bh, 0, 0, DIGIT_TPL_W, DIGIT_TPL_H);
  const { data } = dctx.getImageData(0, 0, DIGIT_TPL_W, DIGIT_TPL_H);
  const out = new Uint8Array(DIGIT_TPL_W * DIGIT_TPL_H);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) out[p] = data[i] >= 128 ? 1 : 0;
  return out;
}

// Beskærer badge-området og returnerer ét normaliseret 0/1-bitmap pr. fundet ciffer,
// i læserækkefølge (venstre mod højre) — bruges BÅDE til live skabelon-matching og til
// at lære nye skabeloner fra en bekræftet/rettet linje (se learnDigitTemplatesFromRow).
function extractQtyDigitBitmaps(sourceCanvas, sx, sy, sw, sh, scale) {
  const { bin, w, h } = cropBadgeBitmap(sourceCanvas, sx, sy, sw, sh, scale);
  return segmentDigitBoxes(bin, w, h).map((box) => normalizeDigitBox(bin, w, h, box));
}

// Normaliseret lighed (1 = identiske, 0 = modsatte) mellem to lige store 0/1-bitmaps —
// simpel SAD (sum af absolutte forskelle), normaliseret til antal pixels.
function bitmapSimilarity(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return 1 - diff / a.length;
}
// Bedste skabelon-match for ét ciffer-bitmap. digit=null hvis der slet ingen skabeloner er.
function bestTemplateMatch(bitmap, templates) {
  let bestDigit = null, bestScore = -1;
  for (const d in templates) {
    const score = bitmapSimilarity(bitmap, templates[d]);
    if (score > bestScore) { bestScore = score; bestDigit = d; }
  }
  return { digit: bestDigit, score: bestScore };
}

// Lærer skabeloner fra ÉN linjes bekræftede/rettede antal (kaldes enten når brugeren
// selv retter et antal i det normale flow, eller fra "Gem som skabeloner" i kalibrerings-
// tilstand). Gemmer KUN hvis antallet af segmenterede cifre matcher antallet af cifre i
// det bekræftede tal — ellers er der ingen pålidelig 1:1-sammenhæng mellem bitmaps og
// cifre (fx hvis badge-udsnittet blev fejlsegmenteret), og så springes linjen over.
// Returnerer antal skabeloner der blev gemt (0 hvis linjen blev sprunget over).
function learnDigitTemplatesFromRow(row) {
  const digitsStr = String(Math.max(1, Math.floor(+row.qty) || 1));
  if (!row.digitBitmaps || row.digitBitmaps.length !== digitsStr.length) return 0;
  digitsStr.split("").forEach((ch, i) => saveDigitTemplate(ch, row.digitBitmaps[i]));
  return digitsStr.length;
}

const NAME_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÆØÅæøå0123456789 ./-";
const QTY_WHITELIST = "0123456789";

// Skærer billedet op i bakke-felter (5 i bredden, kvadratiske, et DYNAMISK antal
// rækker ud fra billedhøjden — bakken kan have flere rækker, ikke kun én) og OCR'er
// hvert ikke-tomt felts navn- og antal-område for sig. Returnerer
// { items: [{ raw, name, qty, qtyUncertain }], fieldsCount } — fieldsCount er antal
// felter der blev vurderet UDFYLDTE (før OCR), så kaldestedet kan sammenligne det med
// antal linjer der faktisk blev læst og gøre en eventuel uoverensstemmelse synlig.
async function scanTrayImage(imgSrc, worker, materials, onProgress) {
  const img = await loadImageEl(imgSrc);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const cellW = canvas.width / TRAY_COLS;
  const cellH = cellW; // felterne antages kvadratiske
  // Antal rækker beregnes DYNAMISK ud fra billedets højde — ikke hardcodet til 1.
  // Math.ceil (ikke floor), så en sidste række, der er en anelse kortere end en fuld
  // feltehøjde (fx fordi screenshottet er beskåret tæt om bakken), stadig tælles med
  // i stedet for at blive droppet helt — dens reelle højde bruges nedenfor.
  const rows = Math.max(1, Math.ceil(canvas.height / cellH));
  if (canvas.width < cellW || canvas.height < cellH * 0.4) throw new Error("Billedet er for lille/forkert formet til at finde bakke-felter.");

  // Grundprincip: et felt er kun TOMT hvis der hverken er navnetekst ELLER et tal-badge.
  // Et fundet tal-badge betyder ALTID at feltet er ægte (tal-læsningen er pålidelig, se
  // hasQtyBadge ovenfor) — navnets læsbarhed/længde har INGEN indflydelse på om feltet
  // beholdes. allBadgePositions holder styr på ALLE gitter-positioner med et badge,
  // uanset om de ender i cells, så sikkerhedstjekket til sidst kan opdage (og navngive)
  // ethvert felt der alligevel skulle blive droppet ved en fremtidig fejl.
  const cells = [];
  const allBadgePositions = [];
  for (let r = 0; r < rows; r++) {
    const y = r * cellH;
    const rowH = Math.min(cellH, canvas.height - y); // sidste række kan være delvist afskåret
    if (rowH < cellH * 0.4) continue; // for lidt af rækken synlig til at kunne læses pålideligt
    for (let c = 0; c < TRAY_COLS; c++) {
      const x = c * cellW;
      const nameH = rowH * NAME_STRIP_HEIGHT_RATIO;
      const nameY = y + rowH - nameH;
      const qtyW = cellW * QTY_WIDTH_RATIO, qtyH = rowH * QTY_HEIGHT_RATIO;
      const hasBadge = hasQtyBadge(ctx, x, y, qtyW, qtyH);
      if (hasBadge) allBadgePositions.push(`række ${r + 1}, kolonne ${c + 1}`);
      const hasNameText = !isNameStripEmpty(ctx, x, nameY, cellW, nameH);
      if (!hasBadge && !hasNameText) continue; // REELT tomt felt -> spring over
      cells.push({ x, y, w: cellW, h: rowH, nameY, nameH, r, c });
    }
  }
  if (cells.length === 0) return { items: [], fieldsCount: 0 };

  const digitTemplates = loadDigitTemplates(); // læses én gang pr. scan, ikke pr. felt
  const results = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    onProgress(Math.round((i / cells.length) * 100));

    // NAVN: nederste ~28% stribe, fuld bredde af feltet
    const nameCanvas = cropToGrayCanvas(canvas, cell.x, cell.nameY, cell.w, cell.nameH, CROP_UPSCALE);

    await worker.setParameters({ tessedit_char_whitelist: NAME_WHITELIST, tessedit_pageseg_mode: "3" });
    const { data: nameData } = await worker.recognize(nameCanvas);
    const rawName = (nameData.text || "").replace(/\s+/g, " ").trim();
    // Et navn UDEN et eneste bogstav (ren OCR-støj, tomt eller ukendt resultat) bliver
    // ALDRIG en grund til at kassere linjen — feltet er allerede bekræftet ikke-tomt
    // ovenfor. Navnet sættes blot til "", så brugeren kan vælge varen selv i dropdownen.
    const hasLetter = /[A-Za-zÆØÅæøå]/.test(rawName);
    const name = hasLetter ? rawName : "";

    // ANTAL: øverste venstre hjørne (venstre ~35%, øverste ~30%). Øverste højre hjørne (vægt)
    // ignoreres helt. Badgets cifre er tegnet i en fast font af spillet, så de segmenteres
    // først til enkelt-ciffer-bitmaps og sammenlignes mod gemte skabeloner (se
    // extractQtyDigitBitmaps/bestTemplateMatch ovenfor) — langt mere robust end OCR, når der
    // er kalibreret skabeloner for de involverede cifre. Kun hvis det IKKE lykkes for ALLE
    // cifre i badget (ingen skabeloner endnu, eller for lav lighed) falder vi tilbage til den
    // uændrede to-pas Tesseract-læsning, og markerer linjen som usikker.
    const qtyW = cell.w * QTY_WIDTH_RATIO;
    const qtyH = cell.h * QTY_HEIGHT_RATIO;
    const digitBitmaps = extractQtyDigitBitmaps(canvas, cell.x, cell.y, qtyW, qtyH, QTY_UPSCALE);

    let digits = "", qtyUncertain = true;
    if (digitBitmaps.length > 0) {
      let ok = true, out = "";
      for (const bmp of digitBitmaps) {
        const { digit, score } = bestTemplateMatch(bmp, digitTemplates);
        if (!digit || score < DIGIT_MATCH_MIN_SCORE) { ok = false; break; }
        out += digit;
      }
      if (ok) { digits = out; qtyUncertain = false; }
    }

    if (!digits) {
      // Tesseract-fallback — uændret to-pas metode (gråtone + binariseret, PSM 7).
      await worker.setParameters({ tessedit_char_whitelist: QTY_WHITELIST, tessedit_pageseg_mode: "7" });
      const qtyCanvasGray = cropToGrayCanvas(canvas, cell.x, cell.y, qtyW, qtyH, QTY_UPSCALE);
      const { data: qtyDataGray } = await worker.recognize(qtyCanvasGray);
      const digitsGray = (qtyDataGray.text || "").replace(/[^0-9]/g, "");

      const qtyCanvasBin = cropToBinaryCanvas(canvas, cell.x, cell.y, qtyW, qtyH, QTY_UPSCALE);
      const { data: qtyDataBin } = await worker.recognize(qtyCanvasBin);
      const digitsBin = (qtyDataBin.text || "").replace(/[^0-9]/g, "");

      digits = digitsBin || digitsGray;
      qtyUncertain = true; // skabelon-match lykkedes ikke -> altid markeret usikker
    }
    let qty = 1;
    if (digits) qty = Math.max(1, parseInt(digits, 10));

    // Linjen droppes ALDRIG her — feltet er allerede afgjort ikke-tomt ovenfor. Uanset
    // hvor usikker/mislykket navne- eller tal-læsningen blev, kommer den med som en linje.
    const raw = name ? (qty > 1 ? `${name} (${qty})` : name) : `(ukendt vare, ${qty} stk.)`;
    results.push({ raw, name, qty, qtyUncertain, digitBitmaps, r: cell.r, c: cell.c });
  }
  onProgress(100);

  // Sikkerhedstjek: ethvert gitter-felt med et tal-badge SKAL være endt som en linje —
  // det er selve grundprincippet ovenfor. Hvis et sådant felt alligevel mangler (fx pga.
  // en fremtidig fejl i koden), logges det HER med præcis række/kolonne, så det opdages
  // tidligt i stedet for bare at forsvinde stille fra scanningen.
  const includedPositions = new Set(results.map((r) => `række ${r.r + 1}, kolonne ${r.c + 1}`));
  const droppedBadgeFields = allBadgePositions.filter((p) => !includedPositions.has(p));
  if (droppedBadgeFields.length > 0) {
    console.warn(`[Scan bakke] ${droppedBadgeFields.length} felt(er) med et tal-badge blev IKKE medtaget i resultatet: ${droppedBadgeFields.join("; ")}. Tjek scanTrayImage.`);
  }
  return { items: results, fieldsCount: cells.length };
}

/* ── "Dagens overblik" — kompakt kort øverst på Hjem-siden med dagens nøgletal
   samlet ét sted. Læser UDELUKKENDE data der allerede er indlæst (sales/
   materials/cash) — ingen nye beregninger af kasse eller lager. "Overskud"
   bruger PRÆCIS samme formel som Dagbogens "I dag"-visning (SalesLog nedenfor,
   inkl. at kun AVANCEN af skranke-varer tæller, ikke hele beløbet), så tallet
   altid stemmer med det, der allerede vises i Dagbogen. ── */
function DailyOverview({ sales, materials, cash, cur, wide }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";

  const todayCutoff = new Date().setHours(0, 0, 0, 0);
  const todaySales = sales.filter((t) => t.at >= todayCutoff);
  const todayBuys = todaySales.filter((t) => t.type !== "sell");
  const todaySells = todaySales.filter((t) => t.type === "sell");
  const buyExpense = (t) => (t.lines || []).filter((l) => !l.isCounter).reduce((a, l) => a + l.sum, 0);
  const buyCounterProfit = (t) => (t.lines || []).filter((l) => l.isCounter).reduce((a, l) => a + ((l.baseValue || 0) - l.sum), 0);
  const udgifter = todayBuys.reduce((a, t) => a + buyExpense(t), 0);
  const indtaegter = todaySells.reduce((a, t) => a + t.total, 0) + todayBuys.reduce((a, t) => a + buyCounterProfit(t), 0);
  const overskud = indtaegter - udgifter;

  // Mest handlede vare i dag (antal styk, køb + salg lagt sammen) — skranke-varer
  // (engangs-pantegenstande, ikke "rigtige" materialer) tælles ikke med her, samme
  // udelukkelse som Top-varer-siden bruger.
  const itemCounts = {};
  todaySales.forEach((t) => {
    (t.lines || []).forEach((l) => {
      if (!l.id || l.isCounter) return;
      itemCounts[l.id] = (itemCounts[l.id] || 0) + (l.qty || 0);
    });
  });
  const topEntry = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
  const topName = topEntry ? ((materials.find((m) => m.id === topEntry[0]) || {}).name || topEntry[0]) : null;

  return (
    <div className="rounded-xl border p-3" style={box}>
      <div className="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: dk ? GOLD : BLUE }}>
        <TrendingUp size={13} /> Dagens overblik
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>Overskud i dag</div>
          <div className="text-base font-black tabular-nums" style={{ color: overskud >= 0 ? (dk ? "#4ade80" : GREEN) : (dk ? "#f87171" : RED) }}>
            {fmt(overskud)} {cur}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>Handler i dag</div>
          <div className="text-base font-black tabular-nums" style={{ color: dk ? "white" : INK }}>{todaySales.length}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>Kassen</div>
          <div className="text-base font-black tabular-nums" style={{ color: dk ? GOLD : GOLD_D }}>{fmt(cash)} {cur}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold" style={{ color: sub }}>Mest handlet i dag</div>
          <div className="text-base font-black truncate" style={{ color: dk ? "white" : INK }} title={topName || ""}>
            {topName ? `${topName} (${topEntry[1]})` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
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
  // Sand mens en handel er ved at blive gemt (fra klik til hele commitTrade, inkl. de
  // asynkrone DB-kald, er færdig) — bruges til at deaktivere "Gem"/"Færdig"-knapperne,
  // så samme handel ikke kan sendes to gange ved dobbeltklik/dobbelt-tap.
  const [savingTrade, setSavingTrade] = useState(false);
  const [tradeError, setTradeError] = useState(""); // vist hvis selve databaseskrivningen i commitTrade fejler
  const flashTradeError = (msg) => {
    setTradeError(msg);
    setTimeout(() => setTradeError((cur) => (cur === msg ? "" : cur)), 8000);
  };
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
  // material_id -> "vis offentligt" (styrer om varen vises på /priser). Gemt ADSKILT
  // fra selve lagerantallet (se loadMaterialVisibility/setMaterialVisibility i
  // supabase-store.js), så dette aldrig rører lagerlogikken ovenfor.
  const [materialVisibility, setMaterialVisibilityState] = useState({});
  const loadMaterialVisibilityFn = async () => { try { setMaterialVisibilityState(await loadMaterialVisibility()); } catch (e) {} };
  // material_id -> billede-URL til prisliste-siden (samme "adskilt fra lagerlogikken"-
  // princip som materialVisibility ovenfor — se loadMaterialImages/setMaterialImage).
  const [materialImages, setMaterialImagesState] = useState({});
  const loadMaterialImagesFn = async () => { try { setMaterialImagesState(await loadMaterialImages()); } catch (e) {} };
  const [cash, setCashState] = useState(0);
  const loadCashFn = async () => { try { setCashState(await loadCash()); } catch (e) {} };
  const [lbSettings, setLbSettings] = useState(null); // { name, start_at, end_at, active }
  const loadLeaderboardFn = async () => { try { setLbSettings(await loadLeaderboardSettings()); } catch (e) {} };
  const [customerPhones, setCustomerPhones] = useState({}); // cust_id -> phone
  const loadCustomerPhonesFn = async () => { try { setCustomerPhones(await loadCustomerPhones()); } catch (e) {} };
  // Crafting-opskrifter — hentes fra "recipes"-tabellen (se 9-crafting-recipes.sql),
  // ikke længere hardcodet. Alle roller kan læse dem (bruges af Crafting-siden for
  // alle); kun ejer/manager kan oprette/rette/slette (RecipeManager, tjekket i UI'en
  // OG i databasens RLS-policies).
  const [recipes, setRecipes] = useState([]);
  const loadRecipesFn = async () => { try { setRecipes(await loadRecipes()); } catch (e) {} };
  // Vagtstempling — "activeShifts" (alle ÅBNE vagter lige nu) hentes for ALLE roller
  // (bruges til ens egen status + "Hvem er på vagt nu"), samme rytme som
  // lager/kasse osv. herunder. "shiftLog" (fuld historik) hentes derimod KUN når
  // Vagt-fanen faktisk åbnes af ejer/manager (se useEffect ved "view" nedenfor) —
  // ingen grund til at hive hele vagt-historikken hjem i baggrunden for alle.
  const [activeShifts, setActiveShifts] = useState([]);
  const loadActiveShiftsFn = async () => { try { setActiveShifts(await loadActiveShifts()); } catch (e) {} };
  const [shiftLog, setShiftLog] = useState([]);
  const [shiftLogLoading, setShiftLogLoading] = useState(false);
  const [shiftErr, setShiftErr] = useState("");
  const flashShiftErr = (msg) => {
    setShiftErr(msg);
    setTimeout(() => setShiftErr((cur) => (cur === msg ? "" : cur)), 8000);
  };
  const handleClockIn = async () => {
    try { await sbClockIn(); await loadActiveShiftsFn(); }
    catch (e) { flashShiftErr(e?.message || "Kunne ikke stemple ind."); }
  };
  const handleClockOut = async () => {
    try { await sbClockOut(); await loadActiveShiftsFn(); }
    catch (e) { flashShiftErr(e?.message || "Kunne ikke stemple ud."); }
  };
  const handleCloseShift = async (shift) => {
    const ok = window.confirm(`Luk ${shift.name}s vagt (sæt ud-tid til nu)?`);
    if (!ok) return;
    try {
      await sbCloseShift(shift.id);
      await Promise.all([loadActiveShiftsFn(), refreshShiftLog()]);
    } catch (e) { flashShiftErr(e?.message || "Kunne ikke lukke vagten."); }
  };
  const refreshShiftLog = async () => {
    setShiftLogLoading(true);
    try { setShiftLog(await loadShiftLog()); } catch (e) {} finally { setShiftLogLoading(false); }
  };
  const handleEditShift = async (shiftId, clockInMs, clockOutMs) => {
    try {
      await sbEditShift(shiftId, new Date(clockInMs).toISOString(), clockOutMs ? new Date(clockOutMs).toISOString() : null);
      await Promise.all([loadActiveShiftsFn(), refreshShiftLog()]);
    } catch (e) { flashShiftErr(e?.message || "Kunne ikke rette vagten."); }
  };
  // Aktivitets-log (audit trail) — KUN ejer, se isOwner-tjekket i useEffect ved "view"
  // nedenfor og RLS-policyen "owner read activity_log" i 19-activity-log.sql. Selve
  // linjerne skrives udelukkende server-side (security definer-funktioner + Edge
  // Function'en manage-staff) — denne funktion henter kun, skriver aldrig.
  const [activityLog, setActivityLog] = useState([]);
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  const refreshActivityLog = async () => {
    setActivityLogLoading(true);
    try { setActivityLog(await loadActivityLog()); } catch (e) {} finally { setActivityLogLoading(false); }
  };
  // Telefon-felt ved KUNDE-ID i Kassen. Slår gemt nummer op, når kunde-id'et ÆNDRES
  // (ikke når customerPhones i baggrunden genindlæses — ellers ville et pending baggrunds-
  // poll kunne overskrive noget, kassøren lige er i gang med at rette).
  const [custPhone, setCustPhone] = useState("");
  useEffect(() => {
    const idT = custId.trim();
    setCustPhone(idT ? (customerPhones[idT] || "") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custId]);
  const saveCustPhoneNow = async () => {
    const idT = custId.trim();
    const phoneT = custPhone.trim();
    if (!idT || !phoneT) return;
    try {
      await saveCustomerPhone(idT, phoneT);
      setCustomerPhones((prev) => ({ ...prev, [idT]: phoneT }));
    } catch (e) {}
  };
  const [tradeMode, setTradeMode] = useState("buy"); // buy | sell
  const [showScan, setShowScan] = useState(false);
  const [scanCalibrate, setScanCalibrate] = useState(false); // true = ScanTrayModal åbnes i "Kalibrér cifre"-tilstand
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
  // Leaderboard-fanen: ejer/manager kan redigere (canManageStore), ansat må kun SE den
  // (skrivebeskyttet — se LeaderboardAdmin's canManage-prop og RLS-policyen "manager write leaderboard").
  const canViewLeaderboard = !!profile && (profile.role === "ejer" || profile.role === "manager" || profile.role === "ansat");
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
        id: "t" + r.id, dbId: r.id, at: new Date(r.at).getTime(), custId: r.cust_id || "",
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

  // ── Dagbog-handlinger på en enkelt handel (fortryd / ret kunde-ID / ret beløb) ──
  // Delt fejl-banner for alle tre — de er alle "ret en gemt handel"-handlinger med
  // samme slags fejlvisning, men helt uafhængige funktioner/DB-kald, så en fejl i
  // én af dem ikke rører de andre.
  const [rowActionErr, setRowActionErr] = useState("");
  const flashRowActionErr = (msg) => {
    setRowActionErr(msg);
    setTimeout(() => setRowActionErr((cur) => (cur === msg ? "" : cur)), 8000);
  };

  // Ruller handlen tilbage ATOMISK i databasen (lager + kasse modregnes, og handlen
  // markeres "reversed" — se reverse_sale i 5-undo-trade.sql/8-edit-sale.sql). Kunde-
  // point og handler-tæller er udledt af salgshistorikken (buildCustomers/
  // computeTradeCounts), så de rettes automatisk, blot ved at handlen forsvinder fra
  // den indlæste liste herunder. Databasen afviser selv et andet forsøg på at
  // fortryde samme handel igen.
  const handleReverseTrade = async (trade) => {
    const ok = window.confirm(
      `Fortryd denne handel på ${fmt(trade.total)} ${config.currency}?\n\n` +
      `Lager, kasse og kunde-point/handler-tæller rettes automatisk tilbage. Handlen fjernes fra dagbogen og kan ikke fortrydes igen.`
    );
    if (!ok) return;
    try {
      await reverseSale(trade.dbId);
      setSales((prev) => prev.filter((s) => s.id !== trade.id));
      loadCashFn(); loadInventoryFn();
    } catch (e) {
      flashRowActionErr(`Kunne ikke fortryde handlen: ${e?.message || "Ukendt fejl."}`);
    }
  };

  // Retter kunde-ID på en handel bagefter (fx glemt under handlen). Ren tekst-
  // opdatering — rører ALDRIG kasse eller lager. Kunde-point/handler-tæller er
  // udledt af salgshistorikken, så handlen tæller automatisk med for den NYE kunde,
  // som om den havde været der fra start, næse gang siden viser kundens tal.
  const handleEditTradeCustomer = async (trade, newCustIdRaw) => {
    const newCustId = (newCustIdRaw || "").trim();
    if (newCustId === (trade.custId || "")) return;
    try {
      await updateSaleCustomer(trade.dbId, newCustId);
      setSales((prev) => prev.map((s) => (s.id === trade.id ? { ...s, custId: newCustId } : s)));
    } catch (e) {
      flashRowActionErr(`Kunne ikke rette kunde-ID: ${e?.message || "Ukendt fejl."}`);
    }
  };

  // Retter beløbet ("total") på en handel. Kassen justeres ATOMISK i databasen med
  // PRÆCIS forskellen (edit_sale_amount i 8-edit-sale.sql, samme regel som
  // beskrevet i bekræftelsen) — lageret røres ALDRIG, kun de samme varer skiftede
  // hænder til en anden pris. Kan rettes igen bagefter (regner altid fra den
  // senest gemte total, ikke fra originalen).
  const handleEditTradeAmount = async (trade, newTotalRaw) => {
    const newTotal = Math.max(0, Math.round(+newTotalRaw || 0));
    if (newTotal === Math.round(trade.total)) return;
    const ok = window.confirm(
      `Ret beløb fra ${fmt(trade.total)} ${config.currency} til ${fmt(newTotal)} ${config.currency}?\n\n` +
      `Kassen justeres automatisk med forskellen. Lageret røres ikke.`
    );
    if (!ok) return;
    const deltaTotal = newTotal - trade.total;
    const deltaProfit = trade.type === "buy" ? -deltaTotal : deltaTotal;
    try {
      await editSaleAmount(trade.dbId, newTotal);
      setSales((prev) => prev.map((s) => (s.id === trade.id ? { ...s, total: newTotal, profit: s.profit + deltaProfit } : s)));
      loadCashFn();
    } catch (e) {
      flashRowActionErr(`Kunne ikke rette beløbet: ${e?.message || "Ukendt fejl."}`);
    }
  };

  // ── Offentlig prisliste (/priser) — "vis offentligt" pr. vare ──
  // Gemmes med det samme (som lagerantal/kassen), ikke som en del af PriceSettings'
  // "Gem alt"-udkast, fordi flaget bor i "inventory", ikke i config.materials.
  const handleTogglePublic = async (materialId, visible) => {
    setMaterialVisibilityState((prev) => ({ ...prev, [materialId]: visible }));
    try { await sbSetMaterialVisibility(materialId, visible); } catch (e) {}
  };
  const handleSetMaterialImage = async (materialId, url) => {
    setMaterialImagesState((prev) => ({ ...prev, [materialId]: url }));
    try { await sbSetMaterialImage(materialId, url); } catch (e) {}
  };

  // Crafter "qty" gange en opskrift: trækker materialerne (matchet på deres vare-ID,
  // valgt via dropdown i RecipeManager — aldrig navn) og lægger qty × recipe.outputQty
  // stk. af færdigvaren til, atomisk via craft_item i databasen. Kaster en fejl (som
  // Crafting-visningen viser), hvis der ikke længere er nok af et materiale.
  const handleCraft = async (recipe, qty) => {
    qty = Math.max(1, Math.floor(+qty) || 0);
    if (qty <= 0) throw new Error("Ugyldigt antal.");

    const consumed = recipe.mats.map((rm) => ({ material_id: rm.materialId, qty: rm.qty * qty }));
    const outputQty = qty * (recipe.outputQty || 1);

    // hurtigt klient-tjek for en pæn fejlmelding — den autoritative kontrol sker atomisk i databasen
    for (const c of consumed) {
      const have = inventory[c.material_id] || 0;
      if (have < c.qty) {
        const matName = (recipe.mats.find((m) => m.materialId === c.material_id) || {}).name || c.material_id;
        throw new Error(`Ikke nok ${matName} på lager længere — har ${have}, kræver ${c.qty}.`);
      }
    }

    try {
      await craftItem(consumed, recipe.outputMaterialId, outputQty);
    } catch (e) {
      throw new Error("Lageret nåede at ændre sig, inden craftet blev gennemført (en kollega har måske solgt materialer i mellemtiden). Prøv igen.");
    }

    setInventory((prev) => {
      const next = { ...prev };
      consumed.forEach((c) => { next[c.material_id] = (next[c.material_id] || 0) - c.qty; });
      next[recipe.outputMaterialId] = (next[recipe.outputMaterialId] || 0) + outputQty;
      return next;
    });
  };

  // Opret/rediger/slet-håndtag til RecipeManager (kun ejer/manager — se canManageStore).
  // Genindlæser hele listen efter hvert skriv, så alle CRUD-handlinger altid bygger på
  // den nyeste tilstand og andre indloggede kollegers ændringer ikke overskrives.
  const handleCreateRecipe = async (recipe) => { await createRecipe(recipe); await loadRecipesFn(); };
  const handleUpdateRecipe = async (id, recipe) => { await updateRecipe(id, recipe); await loadRecipesFn(); };
  const handleDeleteRecipe = async (id) => { await deleteRecipe(id); await loadRecipesFn(); };

  const editingRef = useRef(false);
  useEffect(() => { if (profile) { loadConfigFn(true); loadSalesFn(); refreshStaff(); loadInventoryFn(); loadMaterialVisibilityFn(); loadMaterialImagesFn(); loadCashFn(); loadLeaderboardFn(); loadCustomerPhonesFn(); loadRecipesFn(); loadActiveShiftsFn(); } }, [profile]);
  useEffect(() => {
    if (!profile) return;
    const poll = setInterval(() => {
      // hent nye priser i baggrunden — men aldrig mens ejeren redigerer
      if (!editingRef.current && document.visibilityState === "visible") { loadConfigFn(false); loadSalesFn(); loadInventoryFn(); loadMaterialVisibilityFn(); loadMaterialImagesFn(); loadCashFn(); loadLeaderboardFn(); loadCustomerPhonesFn(); loadRecipesFn(); loadActiveShiftsFn(); }
    }, 12000);
    const onVis = () => { if (document.visibilityState === "visible" && !editingRef.current) { loadConfigFn(false); loadSalesFn(); loadInventoryFn(); loadMaterialVisibilityFn(); loadMaterialImagesFn(); loadCashFn(); loadLeaderboardFn(); loadCustomerPhonesFn(); loadRecipesFn(); loadActiveShiftsFn(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(poll); document.removeEventListener("visibilitychange", onVis); };
  }, [profile]);
  // Vagtlog/rapporten hentes først, når ejer/manager rent faktisk åbner Vagt-fanen
  // eller Medarbejder-oversigten (som også bruger den, til at koble timer med
  // handler) — ikke i baggrunds-pollet ovenfor, som kører for alle roller.
  useEffect(() => { if ((view === "vagt" || view === "medarbejdere") && canManageStore) refreshShiftLog(); }, [view, canManageStore]);
  // Aktivitets-log hentes først, når ejeren rent faktisk åbner Aktivitet-fanen — kun
  // ejer (isOwner), ikke manager, se RLS-policyen "owner read activity_log".
  useEffect(() => { if (view === "aktivitet" && isOwner) refreshActivityLog(); }, [view, isOwner]);

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
  // valgte craft-materialer (kun relevant ved salg), og logger til Discord. De lokale
  // state-opdateringer (optimistisk UI) sker FØRST, synkront — men funktionen er
  // async og venter på de faktiske DB-kald, så kaldere (beginSaveTrade/finalizeTrade)
  // kan vente på HELE forløbet og vide, om det reelt lykkedes, før "gemmer"-
  // tilstanden slukkes igen (se savingTrade).
  const commitTrade = async (trade, craftChoices) => {
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
    // Skranke-varer påvirker kassen anderledes end almindelige køb: vi udbetaler kunden
    // "sum" (grundværdi × procent) af egen kasse, men får hele grundværdien tilbage fra
    // spillets skranke bagefter — så det er kun AVANCEN (grundværdi minus det kunden
    // fik), der reelt rører den kontantbeholdning, vi tracker her, ikke hele beløbet.
    // (Se tradeStockLines/tradeCounterLines/tradeCashDelta — delt med feasibility-tjekket
    // i beginSaveTrade, så de to steder aldrig kan komme til at regne forskelligt.)
    const stockLines = tradeStockLines(trade);
    const counterLines = tradeCounterLines(trade);
    const cashDelta = tradeCashDelta(trade);

    // craft-materialer valgt i "Craftede du disse?" — for hver opskrift med craft-antal
    // > 0 skal råmaterialerne trækkes OG den færdige vare lægges til dens eget lager
    // (samme som craft_item gør på Crafting-siden). Salgets normale lagertræk herunder
    // (stockLines) trækker bagefter det solgte antal fra samme vare — ellers ville en
    // vare man lige har craftet til salget gå i minus.
    const craftJobs = []; // [{ outputMatId, qty, consumed: [{ material_id, qty }] }]
    const craftNeedByMat = {}; // råmateriale-id -> samlet behov på tværs af opskrifterne
    let craftLookupFailed = false;
    Object.entries(craftChoices || {}).forEach(([recipeId, rawQty]) => {
      const qty = Math.max(0, Math.floor(+rawQty) || 0);
      if (qty <= 0) return;
      const recipe = recipes.find((r) => String(r.id) === String(recipeId));
      if (!recipe) { craftLookupFailed = true; return; }
      const consumed = recipe.mats.map((rm) => ({ material_id: rm.materialId, qty: rm.qty * qty }));
      consumed.forEach((c) => { craftNeedByMat[c.material_id] = (craftNeedByMat[c.material_id] || 0) + c.qty; });
      craftJobs.push({ outputMatId: recipe.outputMaterialId, qty: qty * (recipe.outputQty || 1), consumed });
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
    try {
      // cashDelta gemmes MED handlen (se 8-edit-sale.sql) så en senere "Ret beløb"
      // eller "Fortryd handel" altid kan tage udgangspunkt i, hvad denne handel
      // FAKTISK flyttede kassen med — uden at skulle genberegne det fra varelinjerne.
      await insertSale({ ...trade, cashDelta });
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
    } catch (e) {
      // Databaseskrivningen fejlede reelt (netværk, midlertidig afbrydelse m.m.) — den
      // lokale skærm viser stadig handlen som gemt (optimistisk UI ovenfor), men den er
      // IKKE sikkert gemt i databasen. Vis det tydeligt i stedet for at svælge fejlen
      // stille, så personalet ved at kigge efter/prøve igen, i stedet for en falsk tryghed.
      flashTradeError(
        "⚠ Handlen kunne IKKE gemmes i databasen (netværksfejl eller lignende) — lager/kasse på denne enhed kan være ude af trit med resten. Genindlæs siden og tjek Dagbogen; gennemfør handlen igen, hvis den ikke findes der."
      );
    }
  };

  // Tryk på "Gem salg & kvittering" / "Gem handel & kvittering". Bygger handlen ud fra
  // kurven. KØB bogføres stadig med det samme, som hidtil (kvitteringen er bare en
  // visning bagefter). SALG bogføres INTET endnu — handlen afventer i stedet "Craftede
  // du disse?" (hvis relevant) og bekræftelse i kvitteringen (finalizeTrade/cancelTrade).
  const beginSaveTrade = () => {
    if (lines.length === 0 || savingTrade) return;
    saveCustPhoneNow();
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

    // Punkt: bekræft store beløb. Rører ikke selve gem-logikken herunder — kun en
    // ekstra "er du sikker?"-bekræftelse FØR den uændrede køb/salg-logik køres.
    if (trade.total > BIG_TRADE_CONFIRM_THRESHOLD) {
      const ok = window.confirm(
        `Handlens totalbeløb er ${fmt(trade.total)} ${config.currency} — over grænsen på ${fmt(BIG_TRADE_CONFIRM_THRESHOLD)} ${config.currency}.\n\n` +
        `Er du sikker på, at du vil gemme denne handel?`
      );
      if (!ok) return;
    }

    if (tradeMode === "buy") {
      setSavingTrade(true);
      commitTrade(trade, {}).finally(() => setSavingTrade(false));
      setReceipt(trade);
      setCart({}); setCustId(""); setCounterItems([]); setShowCounterForm(false);
      return;
    }

    // Salg: intet bogført endnu. "Craftede du disse?" vises kun for linjer, der matcher
    // en opskrifts færdigvare — matchet på vare-ID (samme robuste match som craftet
    // selv bruger), ikke på navn.
    setPendingTrade(trade);
    setPendingCraftChoices({});
    const matches = trade.lines
      .map((l) => ({ recipe: recipes.find((r) => r.outputMaterialId === l.id), soldQty: l.qty }))
      .filter((m) => m.recipe)
      .map((m) => ({ ...m, name: (materials.find((mm) => mm.id === m.recipe.outputMaterialId) || {}).name || m.recipe.outputName }));
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
    setSavingTrade(false);
  };

  // Kvitteringens "Færdig" (kun for salg, der afventer bekræftelse): bogfør hele
  // handlen nu — salg, lager, kasse og craft-materialer samlet.
  const finalizeTrade = () => {
    if (!pendingTrade || savingTrade) return;
    const trade = pendingTrade, craftChoices = pendingCraftChoices;
    setSavingTrade(true);
    commitTrade(trade, craftChoices).finally(() => setSavingTrade(false));
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
      {tradeError && (
        <button onClick={() => setTradeError("")}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-bold text-sm shadow-lg text-left"
          style={{ background: RED, color: "white", maxWidth: 420 }}>{tradeError}</button>
      )}
      {rowActionErr && (
        <button onClick={() => setRowActionErr("")}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-bold text-sm shadow-lg text-left"
          style={{ background: RED, color: "white", maxWidth: 420 }}>⚠ {rowActionErr}</button>
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
          <button onClick={() => { setView(view === "vagt" ? "beregner" : "vagt"); setShowSettings(false); }}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "vagt" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <Clock size={16} /> Vagt
          </button>
          {canManageStore && (
            <button onClick={() => { setView(view === "ansatte" ? "beregner" : "ansatte"); setShowSettings(false); }}
              className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
              style={view === "ansatte" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
              <Users size={16} /> Ansatte
            </button>
          )}
          {canManageStore && (
            <button onClick={() => { setView(view === "medarbejdere" ? "beregner" : "medarbejdere"); setShowSettings(false); }}
              className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
              style={view === "medarbejdere" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
              <Wallet size={16} /> Medarbejdere
            </button>
          )}
          {canViewLeaderboard && (
            <button onClick={() => { setView(view === "leaderboard" ? "beregner" : "leaderboard"); setShowSettings(false); }}
              className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
              style={view === "leaderboard" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
              <Trophy size={16} /> Leaderboard
            </button>
          )}
          {isOwner && (
            <button onClick={() => { setView(view === "aktivitet" ? "beregner" : "aktivitet"); setShowSettings(false); }}
              className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
              style={view === "aktivitet" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
              <Activity size={16} /> Aktivitet
            </button>
          )}
          <button onClick={() => { setView(view === "log" ? "beregner" : "log"); setShowSettings(false); }}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "log" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <BarChart3 size={16} /> Dagbog
          </button>
          <button onClick={() => { setView(view === "topvarer" ? "beregner" : "topvarer"); setShowSettings(false); }}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "topvarer" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <TrendingUp size={16} /> Top-varer
          </button>
          <button onClick={() => { setView(view === "stamkunder" ? "beregner" : "stamkunder"); setShowSettings(false); }}
            className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full font-black text-sm"
            style={view === "stamkunder" ? { background: GOLD, color: INK } : { background: "rgba(245,179,1,.15)", color: GOLD }}>
            <Star size={16} /> Stamkunder
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
          canManage={canManageStore} onDeleteCustomer={handleDeleteCustomer}
          phones={customerPhones}
          onSavePhone={async (custIdVal, phone) => {
            setCustomerPhones((prev) => ({ ...prev, [custIdVal]: phone }));
            try { await saveCustomerPhone(custIdVal, phone); } catch (e) {}
          }} />
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
        <Crafting materials={materials} inventory={inventory} wide={wide} onCraft={handleCraft}
          recipes={recipes} canManageStore={canManageStore}
          onCreateRecipe={handleCreateRecipe} onUpdateRecipe={handleUpdateRecipe} onDeleteRecipe={handleDeleteRecipe} />
      ) : view === "ansatte" && !showSettings && canManageStore ? (
        <StaffAdmin staffList={staffList} refresh={refreshStaff} myId={profile.id} wide={wide} canFullyManage={isOwner} />
      ) : view === "medarbejdere" && !showSettings && canManageStore ? (
        <StaffOverview sales={sales} shiftLog={shiftLog} shiftLogLoading={shiftLogLoading} staffList={staffList} cur={cur} wide={wide} />
      ) : view === "leaderboard" && !showSettings && canViewLeaderboard ? (
        <LeaderboardAdmin sales={sales} cur={cur} wide={wide} settings={lbSettings} canManage={canManageStore}
          onSave={async (patch) => {
            setLbSettings((prev) => ({ ...(prev || {}), ...patch }));
            await saveLeaderboardSettings(patch);
          }} />
      ) : view === "aktivitet" && !showSettings && isOwner ? (
        <ActivityLogView entries={activityLog} loading={activityLogLoading} cur={cur} wide={wide} />
      ) : view === "log" && !showSettings ? (
        <SalesLog sales={sales} cur={cur} wide={wide} onClear={() => { if (isOwner) saveSales([]); }} role={profile.role}
          onReverse={handleReverseTrade} onEditCustomer={handleEditTradeCustomer} onEditAmount={handleEditTradeAmount} />
      ) : view === "topvarer" && !showSettings ? (
        <TopMarginItems sales={sales} config={config} cur={cur} wide={wide} />
      ) : view === "stamkunder" && !showSettings ? (
        <TopCustomers sales={sales} config={config} cur={cur} wide={wide} />
      ) : view === "vagt" && !showSettings ? (
        <ShiftView profile={profile} activeShifts={activeShifts} shiftLog={shiftLog} shiftLogLoading={shiftLogLoading}
          staffList={staffList} canManageStore={canManageStore} isOwner={isOwner} wide={wide} err={shiftErr}
          onClockIn={handleClockIn} onClockOut={handleClockOut}
          onCloseShift={handleCloseShift} onEditShift={handleEditShift} />
      ) : showSettings ? (
        <PriceSettings config={config} save={saveConfig} close={() => { setShowSettings(false); editingRef.current = false; }} wide={wide}
          visibility={materialVisibility} onTogglePublic={handleTogglePublic}
          images={materialImages} onSetImage={handleSetMaterialImage} />
      ) : (
        <div className={wide ? "flex gap-5 px-8 pt-6 items-start" : "px-3 pt-3 space-y-2"}>
          <div className={wide ? "flex-1 min-w-0 space-y-3" : "space-y-2"}>
          <DailyOverview sales={sales} materials={materials} cash={cash} cur={cur} wide={wide} />
          {/* Samme "Din vagt"-kort som Vagt-fanen (ShiftStatusCard) — genbrug, ikke en ny
              mekanik. Placeret her, lige før kassen/Køb-Sælg-skiftet, så man ser det og
              husker at stemple ind, FØR man begynder at handle. */}
          <ShiftStatusCard profile={profile} activeShifts={activeShifts} wide={wide} err={shiftErr}
            onClockIn={handleClockIn} onClockOut={handleClockOut} />
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
            <button onClick={() => { setScanCalibrate(false); setShowScan(true); }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-sm border-2 border-dashed"
              style={wide ? { borderColor: GOLD, color: GOLD, background: "rgba(245,179,1,.08)" } : { borderColor: GOLD_D, color: GOLD_D, background: "#fdf3e7" }}>
              <Camera size={16} /> Scan bakke (læs varer fra screenshot)
            </button>
          )}
          {tradeMode === "buy" && canManageStore && (
            <button onClick={() => { setScanCalibrate(true); setShowScan(true); }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold text-xs border border-dashed"
              style={wide ? { borderColor: "#3a3a3a", color: "#9ca3af" } : { borderColor: "#d6d3d1", color: "#78716c" }}
              title="Ret antal-tal 100% korrekt på en scannet bakke og gem dem som skabeloner, så Scan bakke læser tal mere præcist fremover">
              <Camera size={13} /> Kalibrér cifre (forbedr tal-læsning)
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
                    <label className="text-[10px] uppercase tracking-widest font-bold mt-2 block" style={{ color: "#9ca3af" }}>Telefon — valgfri</label>
                    <input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} onBlur={saveCustPhoneNow}
                      placeholder="fx 555-0100"
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
                      <button onClick={() => beginSaveTrade()} disabled={savingTrade}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-black text-base disabled:opacity-50"
                        style={{ background: tradeMode === "sell" ? GREEN : GOLD, color: tradeMode === "sell" ? "white" : INK }}>
                        <Save size={18} /> {savingTrade ? "Gemmer…" : (tradeMode === "sell" ? "Gem salg & kvittering" : "Gem handel & kvittering")}
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
        <ReceiptModal trade={receipt} config={config} pending={!!pendingTrade} saving={savingTrade}
          onConfirm={finalizeTrade} onCancel={cancelTrade} onClose={() => setReceipt(null)} />
      ) : craftCheck ? (
        <CraftCheckModal matches={craftCheck.matches} onDecide={handleCraftDecision} />
      ) : null}
      {showScan && (
        <ScanTrayModal materials={materials} calibrationMode={scanCalibrate} onApply={applyScannedItems}
          onClose={() => { setShowScan(false); setScanCalibrate(false); }} />
      )}

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
              <button onClick={() => beginSaveTrade()} disabled={savingTrade}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-white disabled:opacity-50" style={{ background: INK }}>
                <Save size={16} /> {savingTrade ? "Gemmer…" : "Gem"}
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
  // "levels && levels.length" (ikke bare "levels ||") — en TOM liste (fx hvis alle
  // niveauer er slettet i Rediger) er stadig "truthy" og ville ellers give ls = [],
  // så cur forblev undefined og commitTrade crashede på .cur.name for ALLE handler.
  const ls = [...(levels && levels.length ? levels : [{ name: "Bronze", min: 0 }])].sort((a, b) => a.min - b.min);
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

// Leaderboard-konkurrence: samme "køb + salg lagt sammen"-logik som Kunder-siden
// (buildCustomers ovenfor), men afgrænset til konkurrenceperioden i stedet for al
// historik. startMs/endMs er null/undefined for en åben start/slut.
function buildLeaderboardRanking(sales, startMs, endMs) {
  const map = {};
  sales.forEach((t) => {
    const id = (t.custId || "").trim();
    if (!id) return;
    if (startMs && t.at < startMs) return;
    if (endMs && t.at > endMs) return;
    map[id] = (map[id] || 0) + (t.total || 0);
  });
  return Object.entries(map)
    .map(([custId, total]) => ({ custId, total }))
    .sort((a, b) => b.total - a.total);
}

// Telefonnummer på en kunde — kun synligt/redigerbart bag login her på kundeprofilen.
// Kommer ALDRIG med i den offentlige leaderboard (get_public_leaderboard() rører
// aldrig "customers"-tabellen, og PublicLeaderboard.jsx henter den slet ikke).
// key={custId} på kaldsstedet nulstiller inputfeltet, når man skifter kunde.
function CustomerPhoneEditor({ dk, box, sub, phone, onSave }) {
  const [value, setValue] = useState(phone || "");
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const dirty = value.trim() !== (phone || "").trim();

  const save = async () => {
    setBusy(true);
    try {
      await onSave(value.trim());
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500);
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border p-4 mb-3" style={box}>
      <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Telefonnummer</div>
      <div className="flex items-center gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ikke noteret" inputMode="tel"
          className="flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm"
          style={dk ? { borderColor: "#3a3a3a", background: PANEL, color: "white" } : { borderColor: "#d6d3d1" }} />
        {dirty && (
          <button disabled={busy} onClick={save} className="px-3 py-2 rounded-lg font-bold text-xs shrink-0" style={{ background: GOLD, color: INK }}>
            {savedFlash ? "Gemt!" : (busy ? "Gemmer…" : "Gem")}
          </button>
        )}
      </div>
      <div className="text-[10px] mt-1" style={{ color: sub }}>Kun synligt her, bag login — vises aldrig på den offentlige leaderboard-side.</div>
    </div>
  );
}

function Customers({ sales, config, cur, wide, openCust, setOpenCust, canManage, onDeleteCustomer, phones, onSavePhone }) {
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
        <CustomerPhoneEditor key={c.id} dk={dk} box={box} sub={sub}
          phone={phones?.[c.id] || ""} onSave={(phone) => onSavePhone(c.id, phone)} />
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
            return (
              <div key={t.id} className="rounded-xl border p-3" style={box}>
                <div className="flex justify-between">
                  <span className="text-[11px]" style={{ color: sub }}>{fmtDateDK(t.at)} · {fmtTimeDK(t.at)}</span>
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
function Crafting({ materials, inventory, wide, onCraft, recipes, canManageStore, onCreateRecipe, onUpdateRecipe, onDeleteRecipe }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const wrap = "pb-10 " + (dk ? "px-8 pt-6 mx-auto " : "px-3 pt-3 ") + (dk ? "text-white" : "");
  const wrapStyle = dk ? { maxWidth: PAGE_MAX } : {};
  const cats = [...new Set(recipes.map((r) => r.cat))];

  const [qtyByRecipe, setQtyByRecipe] = useState({});
  const [busyRecipe, setBusyRecipe] = useState(null);
  const [msgByRecipe, setMsgByRecipe] = useState({}); // recipe.id -> { type: "ok"|"err", text }
  const [showManager, setShowManager] = useState(false);

  const doCraft = async (r, rows, maxTotal, displayName) => {
    const qty = Math.min(Math.max(1, Math.floor(+qtyByRecipe[r.id] || 1)), maxTotal);
    const matsStr = rows.map((row) => `${row.req.qty * qty}× ${row.mat ? row.mat.name : row.req.name}`).join(", ");
    const totalOut = qty * (r.outputQty || 1);
    const confirmed = window.confirm(
      `Craft ${qty}× ${displayName}? Dette trækker ${matsStr} fra lageret og lægger ${totalOut}× ${displayName} til.`
    );
    if (!confirmed) return;

    setBusyRecipe(r.id);
    setMsgByRecipe((prev) => ({ ...prev, [r.id]: null }));
    try {
      await onCraft(r, qty);
      setMsgByRecipe((prev) => ({ ...prev, [r.id]: { type: "ok", text: `✓ Craftede ${totalOut}× ${displayName}` } }));
    } catch (e) {
      setMsgByRecipe((prev) => ({ ...prev, [r.id]: { type: "err", text: e.message || "Craft fejlede." } }));
    } finally {
      setBusyRecipe(null);
      setTimeout(() => setMsgByRecipe((prev) => ({ ...prev, [r.id]: null })), 5000);
    }
  };

  return (
    <div className={wrap} style={wrapStyle}>
      <div className="text-xs mb-4 flex items-start justify-between gap-3">
        <div style={{ color: sub }}>
          Viser om I har nok materialer på lager til hver opskrift. Tryk "Craft" for at trække materialerne fra det delte lager og lægge den færdige vare til.
        </div>
        {canManageStore && (
          <button onClick={() => setShowManager((v) => !v)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[11px]"
            style={{ background: showManager ? GOLD : "rgba(245,179,1,.15)", color: showManager ? INK : (dk ? GOLD : BLUE) }}>
            <Pencil size={12} /> {showManager ? "Luk opskriftsredigering" : "Administrer opskrifter"}
          </button>
        )}
      </div>

      {canManageStore && showManager && (
        <RecipeManager materials={materials} recipes={recipes} wide={wide}
          onCreate={onCreateRecipe} onUpdate={onUpdateRecipe} onDelete={onDeleteRecipe} />
      )}

      {cats.map((cat) => (
        <div key={cat} className="mb-5">
          <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: dk ? GOLD : BLUE }}>{cat}</div>
          <div className={wide ? "grid gap-3" : "space-y-2"} style={wide ? { gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" } : {}}>
            {recipes.filter((r) => r.cat === cat).map((r) => {
              const displayName = (materials.find((m) => m.id === r.outputMaterialId) || {}).name || r.outputName;
              const rows = r.mats.map((req) => {
                const mat = materials.find((m) => m.id === req.materialId);
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
                <div key={r.id} className="rounded-xl border p-3" style={{ ...box, background: cardBg, borderColor: statusColor }}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-black" style={{ color: dk ? "white" : INK }}>{displayName}</div>
                    <div className="flex items-center gap-1 text-[11px] font-bold shrink-0" style={{ color: sub }}>
                      <Clock size={12} /> {r.time || 0}s
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
                          <span style={{ color: ORANGE, fontWeight: 700 }}>Ukendt materiale: {row.req.name || row.req.materialId}</span>
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
                          value={qtyByRecipe[r.id] ?? 1}
                          onChange={(e) => {
                            const v = Math.min(Math.max(1, Math.floor(+e.target.value) || 1), maxTotal);
                            setQtyByRecipe((prev) => ({ ...prev, [r.id]: v }));
                          }}
                          className="w-16 text-center rounded-lg border py-2 text-sm font-bold"
                          style={{ borderColor: dk ? "#444" : "#d6d3d1", background: dk ? "#111" : "white", color: dk ? "white" : INK }} />
                        <button onClick={() => doCraft(r, rows, maxTotal, displayName)} disabled={busyRecipe === r.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-black text-sm disabled:opacity-50"
                          style={{ background: GREEN, color: "white" }}>
                          <Hammer size={14} /> {busyRecipe === r.id ? "Crafter…" : "Craft"}
                        </button>
                      </div>
                    </div>
                  )}
                  {msgByRecipe[r.id] && (
                    <div className="text-[11px] font-bold mt-2" style={{ color: msgByRecipe[r.id].type === "ok" ? (dk ? "#4ade80" : GREEN) : "#f87171" }}>
                      {msgByRecipe[r.id].text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {recipes.length === 0 && (
        <div className="text-sm" style={{ color: sub }}>
          Ingen opskrifter endnu. {canManageStore ? 'Tryk "Administrer opskrifter" ovenfor for at oprette den første.' : "Spørg en ejer/manager om at oprette opskrifter."}
        </div>
      )}
    </div>
  );
}

/* ── Opret/rediger/slet opskrifter (kun ejer/manager) — færdigvare og hvert
   materiale VÆLGES fra en dropdown af eksisterende varer (aldrig fri tekst),
   så "har jeg nok på lager"-tjekket i Crafting-visningen ovenfor altid rammer
   den rigtige vare. ── */
function RecipeManager({ materials, recipes, wide, onCreate, onUpdate, onDelete }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const inp = "rounded-lg border px-2 py-2 text-sm w-full " + (dk ? "" : "border-stone-300 bg-white");
  const inpStyle = dk ? { borderColor: "#3a3a3a", background: PANEL, color: "white" } : {};

  const emptyForm = { outputMaterialId: "", outputQty: 1, cat: "", time: "", mats: [{ materialId: "", qty: "" }] };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const cats = [...new Set(recipes.map((r) => r.cat).filter(Boolean))];
  const sortedMaterials = [...materials].sort((a, b) => a.name.localeCompare(b.name, "da"));

  const startEdit = (r) => {
    setErr("");
    setEditingId(r.id);
    setForm({
      outputMaterialId: r.outputMaterialId,
      outputQty: r.outputQty,
      cat: r.cat,
      time: r.time || "",
      mats: r.mats.length ? r.mats.map((m) => ({ materialId: m.materialId, qty: m.qty })) : [{ materialId: "", qty: "" }],
    });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setErr(""); };

  const setMatRow = (i, field, val) =>
    setForm((f) => { const mats = [...f.mats]; mats[i] = { ...mats[i], [field]: val }; return { ...f, mats }; });
  const addMatRow = () => setForm((f) => ({ ...f, mats: [...f.mats, { materialId: "", qty: "" }] }));
  const delMatRow = (i) => setForm((f) => ({ ...f, mats: f.mats.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    setErr("");
    const outMat = materials.find((m) => m.id === form.outputMaterialId);
    if (!outMat) { setErr("Vælg en færdigvare."); return; }
    const cleanMats = form.mats
      .filter((m) => m.materialId && +m.qty > 0)
      .map((m) => {
        const mat = materials.find((mm) => mm.id === m.materialId);
        return { materialId: m.materialId, name: mat ? mat.name : "", qty: +m.qty };
      });
    if (cleanMats.length === 0) { setErr("Tilføj mindst ét materiale."); return; }
    const payload = {
      outputMaterialId: outMat.id,
      outputName: outMat.name,
      outputQty: Math.max(1, +form.outputQty || 1),
      cat: (form.cat || "").trim() || "Andet",
      time: +form.time || 0,
      mats: cleanMats,
    };
    setBusy(true);
    try {
      if (editingId) await onUpdate(editingId, payload);
      else await onCreate(payload);
      cancelEdit();
    } catch (e) {
      setErr(e.message || "Kunne ikke gemme opskriften.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r) => {
    const displayName = (materials.find((m) => m.id === r.outputMaterialId) || {}).name || r.outputName;
    if (!window.confirm(`Slet opskriften "${displayName}"? Dette kan ikke fortrydes.`)) return;
    try {
      await onDelete(r.id);
      if (editingId === r.id) cancelEdit();
    } catch (e) {
      setErr(e.message || "Kunne ikke slette opskriften.");
    }
  };

  return (
    <div className="rounded-xl border p-4 mb-6" style={box}>
      <div className="font-black text-sm mb-3" style={{ color: dk ? GOLD : BLUE }}>
        {editingId ? "Rediger opskrift" : "Opret ny opskrift"}
      </div>
      {err && <div className="text-[12px] font-bold mb-2" style={{ color: RED }}>{err}</div>}

      <div className="grid gap-2 mb-1" style={{ gridTemplateColumns: wide ? "2fr 1fr 1fr 1fr" : "1fr" }}>
        <div>
          <div className="text-[11px] font-bold mb-1" style={{ color: sub }}>Færdigvare</div>
          <select value={form.outputMaterialId} onChange={(e) => setForm((f) => ({ ...f, outputMaterialId: e.target.value }))}
            className={inp} style={inpStyle}>
            <option value="">— vælg vare —</option>
            {sortedMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[11px] font-bold mb-1" style={{ color: sub }}>Antal pr. craft</div>
          <input type="number" inputMode="numeric" min={1} value={form.outputQty}
            onChange={(e) => setForm((f) => ({ ...f, outputQty: e.target.value }))}
            className={inp} style={inpStyle} />
        </div>
        <div>
          <div className="text-[11px] font-bold mb-1" style={{ color: sub }}>Kategori</div>
          <input list="recipe-cats" value={form.cat} onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))}
            placeholder="fx Våben & Udstyr" className={inp} style={inpStyle} />
          <datalist id="recipe-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <div className="text-[11px] font-bold mb-1" style={{ color: sub }}>Craft-tid (sek., valgfri)</div>
          <input type="number" inputMode="numeric" min={0} value={form.time}
            onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            className={inp} style={inpStyle} />
        </div>
      </div>

      <div className="text-[11px] font-bold mb-1 mt-3" style={{ color: sub }}>Materialer</div>
      <div className="space-y-2">
        {form.mats.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={row.materialId} onChange={(e) => setMatRow(i, "materialId", e.target.value)}
              className={inp + " flex-1"} style={inpStyle}>
              <option value="">— vælg materiale —</option>
              {sortedMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" inputMode="numeric" min={0} value={row.qty} onChange={(e) => setMatRow(i, "qty", e.target.value)}
              placeholder="antal" className="rounded-lg border px-2 py-2 text-sm w-24" style={inpStyle} />
            <button onClick={() => delMatRow(i)} className="p-2 rounded-lg" style={{ color: RED }} aria-label="Fjern materiale">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addMatRow} className="mt-2 text-xs font-bold flex items-center gap-1" style={{ color: dk ? GOLD : BLUE }}>
        <Plus size={14} /> Tilføj materiale
      </button>

      <div className="flex gap-2 mt-4">
        <button disabled={busy} onClick={submit}
          className="flex-1 py-2.5 rounded-lg font-black text-sm disabled:opacity-50" style={{ background: GREEN, color: "white" }}>
          {busy ? "Gemmer…" : editingId ? "Gem ændringer" : "Opret opskrift"}
        </button>
        {editingId && (
          <button onClick={cancelEdit} className="px-4 py-2.5 rounded-lg font-bold text-sm border"
            style={{ borderColor: dk ? "#444" : "#d6d3d1", color: sub }}>Annuller</button>
        )}
      </div>

      {recipes.length > 0 && (
        <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${dk ? "#333" : "#e7e5e4"}` }}>
          <div className="text-[11px] font-bold mb-2" style={{ color: sub }}>Alle opskrifter ({recipes.length})</div>
          <div className="space-y-1.5">
            {recipes.map((r) => {
              const outMat = materials.find((m) => m.id === r.outputMaterialId);
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded-lg"
                  style={{ background: dk ? "#111" : "#faf9f7" }}>
                  <div className="min-w-0 truncate">
                    <span className="font-bold" style={{ color: dk ? "white" : INK }}>
                      {outMat ? outMat.name : `${r.outputName} (varen er slettet)`}
                    </span>
                    <span className="ml-2 text-[11px]" style={{ color: sub }}>{r.cat}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(r)} className="p-1.5 rounded" style={{ color: dk ? GOLD : BLUE }} aria-label="Rediger opskrift">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(r)} className="p-1.5 rounded" style={{ color: RED }} aria-label="Slet opskrift">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Ansatte (login-administration) ── Oprette/slette konti og ændre navn/rolle/
   kodeord kræver stadig EJER (canFullyManage — går gennem den sikre manage-staff
   Edge Function, som selv håndhæver "kun ejer" med service_role, se
   supabase/functions/manage-staff/index.ts, UÆNDRET). Manager må se denne side og
   rette Discord-ID pr. ansat (gemmes direkte i "profiles.discord_id" — se
   16-profiles-discord-id.sql: en RLS-policy tillader ejer/manager at UPDATE'e
   profiles-rækker, og et kolonne-niveau-grant begrænser den skrivning til PRÆCIS
   "discord_id"-kolonnen, så en manager aldrig kan ændre navn/rolle/username ad den
   vej, uanset hvad klienten sender). */
function StaffAdmin({ staffList, refresh, myId, wide, canFullyManage }) {
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
  const [editForm, setEditForm] = useState({ name: "", role: "ansat", password: "", discordId: "" });

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
  const startEdit = (p) => {
    setEditing(p.id);
    setEditForm({ name: p.name, role: p.role, password: "", discordId: p.discord_id || "" });
    setErr("");
  };
  const submitEdit = async (id) => {
    setBusy(true); setErr("");
    try {
      if (canFullyManage) {
        await updateStaff(id, { name: editForm.name, role: editForm.role, password: editForm.password || undefined });
      }
      await setDiscordId(id, editForm.discordId.trim());
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
      {!canFullyManage && (
        <div className="text-[11px] mb-2" style={{ color: sub }}>
          Som manager kan du tilføje/rette Discord-ID pr. ansat. Oprettelse/sletning af konti samt ændring af navn, rolle og kodeord kræver ejer.
        </div>
      )}
      {err && <div className="text-xs font-semibold mb-2" style={{ color: RED }}>{err}</div>}
      <div className="space-y-2 mb-4">
        {staffList.map((p) => (
          <div key={p.id} className="rounded-xl border p-3" style={box}>
            {editing === p.id ? (
              <div className="space-y-2">
                {canFullyManage && (
                  <>
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
                  </>
                )}
                <div>
                  <input value={editForm.discordId} onChange={(e) => setEditForm({ ...editForm, discordId: e.target.value })}
                    placeholder="Discord bruger-ID (valgfrit)" className={inp + " w-full"} style={inpStyle} />
                  <div className="text-[10px] mt-1" style={{ color: sub }}>
                    Discord bruger-ID (højreklik på dit navn i Discord → Kopiér bruger-ID, kræver Udviklertilstand)
                  </div>
                </div>
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
                  <div className="text-[11px]" style={{ color: sub }}>
                    @{p.username} · {p.role}{p.discord_id ? <> · Discord: <code>{p.discord_id}</code></> : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(p)} className="text-xs font-bold px-2 py-1" style={{ color: dk ? GOLD : BLUE }}>Rediger</button>
                  {canFullyManage && p.id !== myId && (
                    <button onClick={() => remove(p.id)} className="p-1" style={{ color: dk ? "#666" : "#d6d3d1" }}><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {canFullyManage && (
        <>
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
        </>
      )}
    </div>
  );
}

/* ── Leaderboard-konkurrence (styring — kun ejer/manager, se toggleSettings-mønster) ──
   Den offentlige side, kunderne ser (uden login), er PublicLeaderboard.jsx — en helt
   separat fil monteret af main.jsx på ruten /leaderboard, som aldrig importerer noget
   herfra. Denne komponent er kun den interne styring + forhåndsvisning. */
const toLocalDatetimeInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function LeaderboardAdmin({ sales, cur, wide, settings, onSave, canManage }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const inp = "rounded-lg border px-3 py-2 text-sm w-full " + (dk ? "" : "border-stone-300 bg-white");
  const inpStyle = dk ? { borderColor: "#3a3a3a", background: PANEL, color: "white" } : {};
  const wrap = "pb-10 " + (dk ? "px-8 pt-6 mx-auto " : "px-3 pt-3 ") + (dk ? "text-white" : "");
  const wrapStyle = dk ? { maxWidth: PAGE_MAX } : {};

  const [form, setForm] = useState({
    name: settings?.name || "Konkurrence",
    start_at: toLocalDatetimeInput(settings?.start_at),
    end_at: toLocalDatetimeInput(settings?.end_at),
    active: !!settings?.active,
    prize_pool: settings?.prize_pool ? String(settings.prize_pool) : "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setForm({
      name: settings?.name || "Konkurrence",
      start_at: toLocalDatetimeInput(settings?.start_at),
      end_at: toLocalDatetimeInput(settings?.end_at),
      active: !!settings?.active,
      prize_pool: settings?.prize_pool ? String(settings.prize_pool) : "",
    });
  }, [settings?.name, settings?.start_at, settings?.end_at, settings?.active, settings?.prize_pool]);

  const save = async () => {
    setBusy(true); setErr("");
    try {
      await onSave({
        name: form.name.trim() || "Konkurrence",
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        active: form.active,
        prize_pool: Math.max(0, +form.prize_pool || 0),
      });
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) { setErr("Kunne ikke gemme — prøv igen."); }
    setBusy(false);
  };

  // Ansatte må ikke redigere, så de har ingen "form" i gang — ranglisten for dem
  // regnes altid direkte ud fra de gemte indstillinger (settings), ikke fra formularen.
  const ranking = canManage
    ? buildLeaderboardRanking(
        sales,
        form.start_at ? new Date(form.start_at).getTime() : null,
        form.end_at ? new Date(form.end_at).getTime() : null
      )
    : buildLeaderboardRanking(
        sales,
        settings?.start_at ? new Date(settings.start_at).getTime() : null,
        settings?.end_at ? new Date(settings.end_at).getTime() : null
      );
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/leaderboard` : "/leaderboard";

  return (
    <div className={wrap} style={wrapStyle}>
      <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Leaderboard-konkurrence</div>
      {canManage && err && <div className="text-xs font-semibold mb-2" style={{ color: RED }}>{err}</div>}

      {canManage ? (
        <div className="rounded-xl border p-4 space-y-3 mb-4" style={box}>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: sub }}>Konkurrence-navn</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} style={inpStyle} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: sub }}>Præmiepulje ({cur})</label>
            <input type="number" min="0" step="1" inputMode="numeric" value={form.prize_pool}
              onChange={(e) => setForm({ ...form, prize_pool: e.target.value })}
              placeholder="fx 1000000" className={inp} style={inpStyle} />
            <div className="text-[11px] mt-1" style={{ color: sub }}>Vises stort på den offentlige side — vinderen (nr. 1) tager det hele.</div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: sub }}>Start</label>
              <input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} className={inp} style={inpStyle} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: sub }}>Slut</label>
              <input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} className={inp} style={inpStyle} />
            </div>
          </div>
          <button onClick={() => setForm({ ...form, active: !form.active })}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-bold text-sm text-left"
            style={form.active ? { background: GREEN, color: "white" } : { background: dk ? "#2a2a2a" : "#f5f5f4", color: sub }}>
            <span>Konkurrence er {form.active ? "AKTIV — synlig på den offentlige side" : "inaktiv — skjult for offentligheden"}</span>
            <span className="inline-flex items-center shrink-0 w-9 h-5 rounded-full relative ml-2" style={{ background: form.active ? "rgba(255,255,255,.35)" : (dk ? "#444" : "#d6d3d1") }}>
              <span className="absolute w-4 h-4 top-0.5 rounded-full bg-white" style={{ left: form.active ? 18 : 2 }} />
            </span>
          </button>
          <button disabled={busy} onClick={save} className="w-full py-2.5 rounded-lg font-black text-sm" style={{ background: GOLD, color: INK }}>
            <Save size={15} className="inline mr-1" /> {savedFlash ? "Gemt!" : "Gem indstillinger"}
          </button>
          <div className="text-[11px] break-all" style={{ color: sub }}>
            Offentligt link (ingen login nødvendig): <span className="font-mono" style={{ color: dk ? GOLD : BLUE }}>{publicUrl}</span>
          </div>
        </div>
      ) : (
        // Ansat: skrivebeskyttet oversigt — samme oplysninger, ingen felter eller knapper at ændre noget med.
        <div className="rounded-xl border p-4 space-y-2 mb-4" style={box}>
          <div className="flex items-center justify-between">
            <span className="font-bold" style={{ color: dk ? "white" : INK }}>{settings?.name || "Konkurrence"}</span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={settings?.active ? { background: GREEN, color: "white" } : { background: dk ? "#2a2a2a" : "#f5f5f4", color: sub }}>
              {settings?.active ? "AKTIV" : "Inaktiv"}
            </span>
          </div>
          <div className="text-sm" style={{ color: sub }}>
            Præmiepulje: <span className="font-black" style={{ color: dk ? GOLD : BLUE }}>{fmt(settings?.prize_pool || 0)} {cur}</span>
          </div>
          {(settings?.start_at || settings?.end_at) && (
            <div className="text-[11px]" style={{ color: sub }}>
              Periode: {settings?.start_at ? new Date(settings.start_at).toLocaleString() : "—"} til {settings?.end_at ? new Date(settings.end_at).toLocaleString() : "—"}
            </div>
          )}
        </div>
      )}

      <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>
        {canManage ? `Forhåndsvisning af rangliste (${ranking.length})` : `Rangliste (${ranking.length})`}
      </div>
      <div className="space-y-1.5">
        {ranking.length === 0 && (
          <div className="text-sm py-6 text-center" style={{ color: sub }}>Ingen handler i den valgte periode endnu.</div>
        )}
        {ranking.map((r, i) => (
          <div key={r.custId} className="flex items-center justify-between rounded-xl border px-3 py-2.5" style={box}>
            <div className="flex items-center gap-2">
              <span className="font-black w-6 text-center" style={{ color: i === 0 ? GOLD : sub }}>{i + 1}</span>
              <span className="font-bold" style={{ color: dk ? "white" : INK }}>{r.custId}</span>
            </div>
            <span className="font-black" style={{ color: dk ? GOLD : BLUE }}>{fmt(r.total)} {cur}</span>
          </div>
        ))}
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
function ScanTrayModal({ materials, onApply, onClose, calibrationMode }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [fieldsCount, setFieldsCount] = useState(0); // antal felter OCR'en vurderede var udfyldte — bruges til uoverensstemmelses-tjekket nedenfor
  const [calibMsg, setCalibMsg] = useState(""); // status efter "Gem som skabeloner" i kalibreringstilstand
  const fileInputRef = useRef(null);

  const loadImage = (fileOrBlob) => {
    if (!fileOrBlob) return;
    setImgFile(fileOrBlob);
    setRows(null);
    setErr("");
    setCalibMsg("");
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
      const parsed = await scanTrayImage(imgSrc, worker, materials, setProgress);
      if (parsed.items.length === 0) { setErr("Fandt ingen udfyldte felter eller læselige varenavne i billedet. Prøv et tydeligere/nærmere screenshot af bakken."); setScanning(false); await worker.terminate(); return; }
      setFieldsCount(parsed.fieldsCount);
      setCalibMsg("");
      setRows(parsed.items.map((p) => {
        const match = bestMaterialMatch(p.name, materials);
        return {
          raw: p.raw, materialId: match ? match.material.id : "", qty: p.qty, originalQty: p.qty,
          qtyUncertain: !!p.qtyUncertain, digitBitmaps: p.digitBitmaps || [], checked: true,
        };
      }));
    } catch (e) {
      setErr("OCR fejlede: " + (e?.message || String(e)));
    }
    if (worker) { try { await worker.terminate(); } catch (e) {} }
    setScanning(false);
  };

  const updateRow = (i, patch) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const matchedCount = rows ? rows.filter((r) => r.materialId).length : 0;

  // Almindeligt flow: lær KUN af en linje, hvis brugeren rent faktisk har ÆNDRET antallet
  // (dvs. rettet en fejllæsning) — aldrig af tal der bare accepteres uden ændring, da de kan
  // være forkerte. Bruges onBlur (ikke onChange), så vi lærer af det FÆRDIGE tal brugeren har
  // tastet, ikke af hvert enkelt mellemliggende ciffer undervejs. Kalibreringstilstand har sin
  // egen eksplicitte "Gem som skabeloner"-handling nedenfor i stedet.
  const onQtyBlur = (row) => {
    if (calibrationMode) return;
    if (row.qty === row.originalQty) return;
    learnDigitTemplatesFromRow(row);
  };

  // Kalibreringstilstand: brugeren har rettet ALLE linjer til at være 100% korrekte og
  // trykker "Gem som skabeloner" — her bruges hver linjes AKTUELLE (bekræftede) antal som
  // facit, uanset om den enkelte linje blev ændret eller ej.
  const saveAllAsTemplates = () => {
    let digitsSaved = 0, linesUsed = 0;
    (rows || []).forEach((r) => {
      const n = learnDigitTemplatesFromRow(r);
      if (n > 0) { digitsSaved += n; linesUsed++; }
    });
    const covered = Object.keys(loadDigitTemplates()).sort().join(" ");
    setCalibMsg(digitsSaved > 0
      ? `Gemte ${digitsSaved} ciffer-skabelon${digitsSaved === 1 ? "" : "er"} fra ${linesUsed} linje${linesUsed === 1 ? "" : "r"}. Skabeloner dækker nu: ${covered || "ingen"}.`
      : "Kunne ikke udlede skabeloner fra nogen af linjerne — badgets cifre blev nok ikke splittet korrekt. Prøv et tydeligere screenshot.");
  };

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
          <div className="text-white font-black flex items-center gap-2">
            <Camera size={18} style={{ color: GOLD }} /> {calibrationMode ? "Kalibrér cifre" : "Scan bakke"}
          </div>
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
                {calibrationMode
                  ? `Fandt ${rows.length} linje${rows.length === 1 ? "" : "r"}. Ret hvert antal til det er 100% korrekt, og tryk "Gem som skabeloner" nedenfor.`
                  : `Fandt ${rows.length} linje${rows.length === 1 ? "" : "r"} — ${matchedCount} matchede automatisk. Tjek og ret gerne før du lægger dem i kurven.`}
              </div>
              {fieldsCount > rows.length && (
                <div className="text-xs font-bold" style={{ color: RED }}>
                  ⚠ Billedet så ud til at have {fieldsCount} udfyldte felter, men kun {rows.length} kunne læses som varelinjer — tjek billedet for de{" "}
                  {fieldsCount - rows.length} manglende.
                </div>
              )}
              <div className="space-y-2">
                {rows.map((r, i) => {
                  const unmatched = !r.materialId;
                  const uncertainQty = !!r.qtyUncertain;
                  return (
                    <div key={i} className="rounded-lg border p-2.5"
                      style={{
                        borderColor: unmatched ? "#f3c9c6" : uncertainQty ? GOLD : "#e7e5e4",
                        borderWidth: uncertainQty && !unmatched ? 2 : 1,
                        background: unmatched ? "#fdf4f3" : uncertainQty ? "#fffbea" : "white",
                      }}>
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
                          onBlur={() => onQtyBlur(r)}
                          className="w-16 rounded-lg border px-2 py-1.5 text-sm font-bold text-center"
                          style={{ borderColor: uncertainQty ? GOLD_D : "#d6d3d1", borderWidth: uncertainQty ? 2 : 1 }} />
                      </div>
                      {uncertainQty && (
                        <div className="text-[10px] font-bold mt-1" style={{ color: GOLD_D }}>⚠ usikkert antal — tjek tallet</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {calibrationMode && calibMsg && (
                <div className="text-xs font-bold" style={{ color: GREEN }}>{calibMsg}</div>
              )}
              <div className="flex gap-2 pt-1">
                {calibrationMode ? (
                  <button onClick={saveAllAsTemplates} className="flex-1 py-2.5 rounded-xl font-black text-sm" style={{ background: GOLD, color: INK }}>
                    <Check size={16} className="inline mr-1" /> Gem som skabeloner
                  </button>
                ) : (
                  <button onClick={apply} className="flex-1 py-2.5 rounded-xl font-black text-sm" style={{ background: GREEN, color: "white" }}>
                    <Check size={16} className="inline mr-1" /> Læg i kurv
                  </button>
                )}
                <button onClick={() => { setImgSrc(null); setImgFile(null); setRows(null); setErr(""); setCalibMsg(""); }}
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
function ReceiptModal({ trade, config, pending, saving, onConfirm, onCancel, onClose }) {
  const cur = config.currency;
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
          <div className="text-[11px] text-stone-400 mt-0.5">Kvittering · {fmtDateDK(trade.at)} {fmtTimeDK(trade.at)}</div>
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
          <button onClick={pending ? onConfirm : onClose} disabled={pending && saving}
            className="px-4 py-2.5 rounded-xl font-black text-white disabled:opacity-50" style={{ background: INK }}>
            {pending && saving ? "Gemmer…" : "Færdig"}
          </button>
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
    Object.fromEntries(matches.map((m) => [m.recipe.id, m.soldQty]))
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
            <div key={m.recipe.id} className="flex items-center justify-between gap-3 pb-3 border-b border-stone-100 last:border-0 last:pb-0">
              <div className="min-w-0">
                <div className="font-bold text-sm text-stone-900 truncate">{m.name}</div>
                <div className="text-[11px] text-stone-500">Solgt: {m.soldQty} stk.</div>
              </div>
              <input type="number" inputMode="numeric" min={0} value={qtyMap[m.recipe.id] ?? 0}
                onChange={(e) => setQty(m.recipe.id, e.target.value)}
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
// Inline "Rediger kunde-ID" på en enkelt handel i Dagbogen — ren tekst-opdatering,
// rører ALDRIG kasse eller lager (se handleEditTradeCustomer i App). Toggle-mønster:
// vis kun en lille knap, indtil man klikker den, så listen ikke fyldes med åbne felter.
function TradeCustIdEditor({ dk, custId, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(custId || "");
  const [busy, setBusy] = useState(false);
  const sub = dk ? "#9ca3af" : "#78716c";

  if (!editing) {
    return (
      <button onClick={() => { setValue(custId || ""); setEditing(true); }}
        className="text-[11px] font-bold flex items-center gap-1" style={{ color: dk ? GOLD : BLUE }}>
        <Pencil size={11} /> {custId ? "Rediger kunde-ID" : "Tilføj kunde-ID"}
      </button>
    );
  }
  const commit = async () => {
    setBusy(true);
    try { await onSave(value); } finally { setBusy(false); setEditing(false); }
  };
  return (
    <div className="flex items-center gap-1.5">
      <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Kunde-ID"
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="w-28 rounded-lg border px-2 py-1 text-xs font-bold"
        style={dk ? { borderColor: "#444", background: "#111", color: "white" } : { borderColor: "#d6d3d1" }} />
      <button disabled={busy} onClick={commit} className="p-1 rounded" style={{ color: GREEN }} aria-label="Gem kunde-ID"><Check size={14} /></button>
      <button onClick={() => setEditing(false)} className="p-1 rounded" style={{ color: sub }} aria-label="Annullér"><X size={14} /></button>
    </div>
  );
}

// Inline "Ret beløb" på en enkelt handel — bekræftelsen ("Ret beløb fra A til B? …")
// vises af handleEditTradeAmount i App, FØR databasekaldet, så man altid ser gammelt
// og nyt beløb tydeligt inden kassen justeres.
function TradeAmountEditor({ dk, cur, total, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(Math.round(total)));
  const [busy, setBusy] = useState(false);
  const sub = dk ? "#9ca3af" : "#78716c";

  if (!editing) {
    return (
      <button onClick={() => { setValue(String(Math.round(total))); setEditing(true); }}
        className="text-[11px] font-bold flex items-center gap-1" style={{ color: dk ? GOLD : BLUE }}>
        <Pencil size={11} /> Ret beløb
      </button>
    );
  }
  const commit = async () => {
    setBusy(true);
    try { await onSave(value); } finally { setBusy(false); setEditing(false); }
  };
  return (
    <div className="flex items-center gap-1.5">
      <input autoFocus type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="w-24 rounded-lg border px-2 py-1 text-xs font-bold"
        style={dk ? { borderColor: "#444", background: "#111", color: "white" } : { borderColor: "#d6d3d1" }} />
      <span className="text-[10px]" style={{ color: sub }}>{cur}</span>
      <button disabled={busy} onClick={commit} className="p-1 rounded" style={{ color: GREEN }} aria-label="Gem beløb"><Check size={14} /></button>
      <button onClick={() => setEditing(false)} className="p-1 rounded" style={{ color: sub }} aria-label="Annullér"><X size={14} /></button>
    </div>
  );
}

function SalesLog({ sales, cur, wide, onClear, onReverse, onEditCustomer, onEditAmount, role }) {
  const [period, setPeriod] = useState("dag"); // dag | uge | måned | alt
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  // "Fortryd handel" og "Ret beløb" må kun bruges af ejer/manager — samme rolle-tjek
  // som databasen nu også kræver for direkte UPDATE/DELETE på "sales" (se
  // 13-restrict-write-access.sql), så UI'en ikke viser knapper, en "ansat" reelt
  // ikke kan bruge.
  const canManage = role === "ejer" || role === "manager";
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
                  {fmtDateDK(t.at)} · {fmtTimeDK(t.at)}
                  {t.sellerName && ` · af ${t.sellerName}`}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black tabular-nums" style={{ color: isGain ? (dk ? "#4ade80" : GREEN) : (dk ? "#f87171" : RED) }}>{amountPrefix}{fmt(netAmount)} {cur}</span>
                  {canManage && (
                    <button onClick={() => onReverse(t)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold"
                      style={{ color: RED, background: dk ? "rgba(192,57,43,.15)" : "#fdf0ef" }}>
                      <RotateCcw size={13} /> Fortryd
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs mt-1" style={{ color: sub }}>
                {t.custId ? `ID ${t.custId} · ` : ""}{t.lines.map((l) => `${l.qty}× ${l.name}`).join(" · ")}
                {t.points ? ` · +${t.points}p` : ""}
              </div>
              <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: `1px solid ${dk ? "#2a2a2a" : "#f0efed"}` }}>
                <TradeCustIdEditor dk={dk} custId={t.custId} onSave={(v) => onEditCustomer(t, v)} />
                {canManage && <TradeAmountEditor dk={dk} cur={cur} total={t.total} onSave={(v) => onEditAmount(t, v)} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Vagtstempling ── Status ligger i "shifts"-tabellen i databasen (se
   14-shifts.sql og loadActiveShifts/loadShiftLog i supabase-store.js), ikke kun i
   denne komponents lokale state — den holder derfor ved genindlæsning og går igen
   på tværs af enheder. "Hvem er på vagt nu" (activeShifts) er synlig for ALLE
   roller; den fulde vagtlog/rapport (shiftLog, med periode-filter — samme
   dag/7 dage/30 dage/alt-mønster som Dagbogen ovenfor) og Ret/Luk-vagt er kun
   for hhv. ejer+manager og ejer, samme rolle-tjek som databasens RLS/RPC'er
   allerede håndhæver (se canManageStore/isOwner i App). */
// "Din vagt"-kortet: stempl ind/ud for DEN INDLOGGEDE bruger. Status kommer
// udelukkende fra "activeShifts" (indlæst i App fra "shifts"-tabellen i
// databasen, se loadActiveShiftsFn) og skrives via de samme onClockIn/onClockOut
// (handleClockIn/handleClockOut i App, som kalder clock_in()/clock_out() i
// databasen). Denne ÉNE komponent genbruges BÅDE på Hjem og i Vagt-fanen — det
// er ikke to separate kort/mekanikker, så et klik ét sted slår øjeblikkeligt
// igennem det andet, næste gang activeShifts genindlæses (samme poll som resten
// af Hjem).
function ShiftStatusCard({ profile, activeShifts, wide, err, onClockIn, onClockOut }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const [busy, setBusy] = useState(false);
  const myShift = activeShifts.find((s) => s.userId === profile.id);
  const fmtHM = fmtTimeDK; // dansk tid (Europe/Copenhagen), ikke browserens/serverens egen tidszone

  const doClockIn = async () => { setBusy(true); try { await onClockIn(); } finally { setBusy(false); } };
  const doClockOut = async () => { setBusy(true); try { await onClockOut(); } finally { setBusy(false); } };

  return (
    <div>
      {err && (
        <div className="mb-2 px-3 py-2 rounded-lg text-sm font-bold" style={{ background: "rgba(192,57,43,.15)", color: RED }}>{err}</div>
      )}
      <div className="rounded-xl border p-4 flex items-center justify-between gap-3 flex-wrap" style={box}>
        <div>
          <div className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: dk ? GOLD : BLUE }}>Din vagt</div>
          {myShift ? (
            <div className="text-sm font-bold" style={{ color: dk ? "#4ade80" : GREEN }}>● På vagt siden kl. {fmtHM(myShift.clockIn)}</div>
          ) : (
            <div className="text-sm" style={{ color: sub }}>Ikke på vagt</div>
          )}
        </div>
        {myShift ? (
          <button disabled={busy} onClick={doClockOut} className="px-4 py-2.5 rounded-full font-black text-sm"
            style={{ background: RED, color: "white", opacity: busy ? .6 : 1 }}>Stempl ud</button>
        ) : (
          <button disabled={busy} onClick={doClockIn} className="px-4 py-2.5 rounded-full font-black text-sm"
            style={{ background: GREEN, color: "white", opacity: busy ? .6 : 1 }}>Stempl ind</button>
        )}
      </div>
    </div>
  );
}

function ShiftView({ profile, activeShifts, shiftLog, shiftLogLoading, staffList, canManageStore, isOwner, wide, err, onClockIn, onClockOut, onCloseShift, onEditShift }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const [period, setPeriod] = useState("dag"); // dag | uge | måned | alt — samme som Dagbog
  const [editingId, setEditingId] = useState(null);
  const [expandedDays, setExpandedDays] = useState(() => new Set());
  const toggleDay = (key) => setExpandedDays((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const fmtHM = fmtTimeDK; // dansk tid (Europe/Copenhagen), ikke browserens/serverens egen tidszone

  const now = Date.now();
  const cutoff = period === "dag" ? new Date().setHours(0, 0, 0, 0)
    : period === "uge" ? now - 7 * 86400000
    : period === "måned" ? now - 30 * 86400000
    : 0;
  const inPeriod = shiftLog.filter((s) => s.clockIn >= cutoff);

  const perEmployee = {};
  inPeriod.forEach((s) => {
    if (!perEmployee[s.userId]) perEmployee[s.userId] = { name: s.name, count: 0, ms: 0 };
    perEmployee[s.userId].count += 1;
    perEmployee[s.userId].ms += (s.clockOut || now) - s.clockIn;
  });
  const empRows = Object.values(perEmployee).sort((a, b) => b.ms - a.ms);
  const fmtDur = (ms) => {
    const totalMin = Math.max(0, Math.round(ms / 60000));
    return `${Math.floor(totalMin / 60)}t ${totalMin % 60}m`;
  };

  // "Vagter i perioden" grupperet pr. medarbejder PR. DAG (dansk tid) — ren
  // omgruppering af "inPeriod" til visning, rører ikke selve vagt-dataen. "shiftLog"
  // er allerede sorteret nyeste-først (loadShiftLog), så rækkefølgen af grupperne
  // (efter det FØRSTE — dvs. seneste — møde med hver medarbejder+dag) forbliver
  // nyeste dag øverst, uden en ekstra sortering her.
  const dayGroups = [];
  const dayGroupIndex = {};
  inPeriod.forEach((s) => {
    const dayKey = dayKeyDK(s.clockIn);
    const key = s.userId + "|" + dayKey;
    if (!dayGroupIndex[key]) {
      const g = { key, userId: s.userId, name: s.name, dayLabel: fmtDateDK(s.clockIn), shifts: [] };
      dayGroupIndex[key] = g;
      dayGroups.push(g);
    }
    dayGroupIndex[key].shifts.push(s);
  });
  dayGroups.forEach((g) => {
    g.shifts.sort((a, b) => a.clockIn - b.clockIn);
    g.ms = g.shifts.reduce((a, s) => a + (s.clockOut || now) - s.clockIn, 0);
  });

  return (
    <div className={"pb-10 " + (dk ? "px-8 pt-6 mx-auto text-white" : "px-3 pt-3")} style={dk ? { maxWidth: 900 } : {}}>
      <div className="mb-3">
        <ShiftStatusCard profile={profile} activeShifts={activeShifts} wide={wide} err={err} onClockIn={onClockIn} onClockOut={onClockOut} />
      </div>

      <div className="rounded-xl border p-4 mb-3" style={box}>
        <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>
          Hvem er på vagt nu ({activeShifts.length})
        </div>
        {activeShifts.length === 0 ? (
          <div className="text-sm" style={{ color: sub }}>Ingen på vagt lige nu.</div>
        ) : (
          <div className="space-y-1.5">
            {activeShifts.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span style={{ color: dk ? "white" : INK, fontWeight: s.userId === profile.id ? 700 : 400 }}>
                  {s.name}{s.userId === profile.id ? " (dig)" : ""}
                </span>
                <span style={{ color: sub }}>siden kl. {fmtHM(s.clockIn)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {canManageStore && (
        <>
          <div className="flex rounded-lg overflow-hidden border text-xs font-black mb-3" style={{ borderColor: dk ? "#3a3a3a" : "#d6d3d1" }}>
            {[["dag", "I dag"], ["uge", "7 dage"], ["måned", "30 dage"], ["alt", "Alt"]].map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)} className="flex-1 py-2"
                style={period === v ? { background: GOLD, color: INK } : { background: dk ? PANEL : "white", color: sub }}>{l}</button>
            ))}
          </div>

          <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Pr. medarbejder</div>
          {shiftLogLoading ? (
            <div className="text-sm py-4 text-center" style={{ color: sub }}>Henter…</div>
          ) : empRows.length === 0 ? (
            <div className="text-sm py-4 text-center mb-2" style={{ color: sub }}>Ingen vagter i denne periode.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {empRows.map((r) => (
                <div key={r.name} className="rounded-xl border p-3 flex items-center justify-between" style={box}>
                  <span className="font-bold" style={{ color: dk ? "white" : INK }}>{r.name}</span>
                  <span className="text-sm" style={{ color: sub }}>{r.count} vagt{r.count === 1 ? "" : "er"} · {fmtDur(r.ms)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Vagter i perioden</div>
          {!shiftLogLoading && dayGroups.length === 0 && (
            <div className="text-sm py-6 text-center" style={{ color: sub }}>Ingen vagter i denne periode.</div>
          )}
          <div className="space-y-2">
            {dayGroups.map((g) => (
              <ShiftDayGroup key={g.key} group={g} dk={dk} box={box} sub={sub} isOwner={isOwner}
                expanded={expandedDays.has(g.key)} onToggle={() => toggleDay(g.key)}
                editingId={editingId} onStartEdit={setEditingId} onCancelEdit={() => setEditingId(null)}
                onCloseShift={onCloseShift}
                onSaveEdit={async (shiftId, ci, co) => { await onEditShift(shiftId, ci, co); setEditingId(null); }} />
            ))}
          </div>

          {/* Eksport-værktøj til dokumentation (fx til kommunen) — læser UDELUKKENDE den
              allerede indlæste "shiftLog" (samme kun-ejer/manager-data som rapporten
              ovenfor, se "manager read all shifts"-RLS-policyen i 14-shifts.sql). Ingen
              nyt DB-kald, ingen skrivning — ren visning + CSV-download i browseren. */}
          <div className="mt-6">
            <ShiftExport staffList={staffList} shiftLog={shiftLog} shiftLogLoading={shiftLogLoading} dk={dk} box={box} sub={sub} />
          </div>
        </>
      )}
    </div>
  );
}

// Én linje pr. medarbejder PR. DAG — foldet sammen som standard (antal vagter den
// dag + samlet tid). Klik for at folde ud og se de enkelte vagter (ShiftLogRow
// herunder, uændret — "Ret"/"Luk vagt" virker præcis som før, bare inde i den
// udfoldede dag). Ren omgruppering af visningen, ingen egen data/skrivning.
function ShiftDayGroup({ group, dk, box, sub, isOwner, expanded, onToggle, editingId, onStartEdit, onCancelEdit, onSaveEdit, onCloseShift }) {
  const fmtDur = (ms) => {
    const totalMin = Math.max(0, Math.round(ms / 60000));
    return `${Math.floor(totalMin / 60)}t ${totalMin % 60}m`;
  };
  return (
    <div className="rounded-xl border overflow-hidden" style={box}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-3 text-left">
        <div>
          <div className="font-bold" style={{ color: dk ? "white" : INK }}>{group.name}</div>
          <div className="text-xs" style={{ color: sub }}>
            {group.dayLabel} · {group.shifts.length} vagt{group.shifts.length === 1 ? "" : "er"} · {fmtDur(group.ms)}
          </div>
        </div>
        <ChevronDown size={16} style={{ color: sub, transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
      </button>
      {expanded && (
        <div className="p-3 pt-0 space-y-2">
          {group.shifts.map((s) => (
            <ShiftLogRow key={s.id} shift={s} dk={dk} box={dk ? { background: "#141414", borderColor: "#2a2a2a" } : { background: "#fafaf9", borderColor: "#e7e5e4" }} sub={sub} isOwner={isOwner}
              editing={editingId === s.id} onStartEdit={() => onStartEdit(s.id)} onCancelEdit={onCancelEdit}
              onCloseShift={onCloseShift}
              onSaveEdit={(ci, co) => onSaveEdit(s.id, ci, co)} />
          ))}
        </div>
      )}
    </div>
  );
}

// En enkelt vagt i rapporten — "Ret" (ejer) åbner to dato/tid-felter og gemmer via
// edit_shift (retter BÅDE ind- og ud-tid atomisk i databasen); "Luk vagt" (ejer) sætter
// blot ud-tiden til nu på en glemt, stadig åben vagt, via close_shift.
function ShiftLogRow({ shift, dk, box, sub, isOwner, editing, onStartEdit, onCancelEdit, onSaveEdit, onCloseShift }) {
  const toLocalInput = (ms) => {
    const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  };
  const [ciVal, setCiVal] = useState(toLocalInput(shift.clockIn));
  const [coVal, setCoVal] = useState(shift.clockOut ? toLocalInput(shift.clockOut) : "");

  const isOpen = !shift.clockOut;
  const durMin = Math.max(0, Math.round(((shift.clockOut || Date.now()) - shift.clockIn) / 60000));
  const durTxt = `${Math.floor(durMin / 60)}t ${durMin % 60}m`;
  const inputStyle = { borderColor: dk ? "#3a3a3a" : "#d6d3d1", background: dk ? "#141414" : "white", color: dk ? "white" : INK };

  return (
    <div className="rounded-xl border p-3" style={box}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-bold" style={{ color: dk ? "white" : INK }}>{shift.name}</div>
          <div className="text-xs" style={{ color: sub }}>
            {fmtDateDK(shift.clockIn)} · {fmtTimeDK(shift.clockIn)}
            {" → "}
            {isOpen ? <span style={{ color: dk ? "#facc15" : "#b45309", fontWeight: 700 }}>pågår</span> : fmtTimeDK(shift.clockOut)}
            {" · "}{durTxt}
          </div>
        </div>
        {isOwner && !editing && (
          <div className="flex items-center gap-2">
            {isOpen && (
              <button onClick={() => onCloseShift(shift)} className="text-[11px] font-bold px-2 py-1 rounded-md"
                style={{ color: dk ? "#facc15" : "#b45309", background: dk ? "rgba(250,204,21,.12)" : "#fdf6e3" }}>Luk vagt</button>
            )}
            <button onClick={onStartEdit} className="text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1"
              style={{ color: dk ? GOLD : BLUE, background: dk ? "rgba(245,179,1,.12)" : BLUE_T }}>
              <Pencil size={11} /> Ret
            </button>
          </div>
        )}
      </div>
      {editing && (
        <div className="mt-3 pt-3 flex flex-wrap items-end gap-2" style={{ borderTop: `1px solid ${dk ? "#2a2a2a" : "#f0efed"}` }}>
          <div>
            <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Ind</div>
            <input type="datetime-local" value={ciVal} onChange={(e) => setCiVal(e.target.value)}
              className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Ud</div>
            <input type="datetime-local" value={coVal} onChange={(e) => setCoVal(e.target.value)}
              className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle} />
          </div>
          <button onClick={() => onSaveEdit(new Date(ciVal).getTime(), coVal ? new Date(coVal).getTime() : null)}
            className="px-3 py-1.5 rounded-full font-black text-xs" style={{ background: GOLD, color: INK }}>Gem</button>
          <button onClick={onCancelEdit} className="px-3 py-1.5 rounded-full font-black text-xs" style={{ background: dk ? "#2a2a2a" : "#f0efed", color: sub }}>Annuller</button>
        </div>
      )}
    </div>
  );
}

// Eksport-værktøj til vagtdata (kun ejer/manager — se canManageStore i ShiftView, som
// er den ENESTE, der renderer denne komponent). Ren visning + CSV-download i browseren:
// læser UDELUKKENDE "shiftLog" (allerede indlæst via loadShiftLog, begrænset af
// "manager read all shifts"-RLS-policyen i 14-shifts.sql), ingen nyt DB-kald og INGEN
// skrivning nogen steder — kan aldrig ændre en vagt, kassen, lageret eller en handel.
// Én linje pr. VAGT (ikke slået sammen pr. dag) — konsekvent samme visning på skærmen
// og i den downloadede CSV, så de to altid stemmer overens.
function ShiftExport({ staffList, shiftLog, shiftLogLoading, dk, box, sub }) {
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const monthAgoStr = () => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [empId, setEmpId] = useState("alle");
  const [fromDate, setFromDate] = useState(monthAgoStr());
  const [toDate, setToDate] = useState(todayStr());

  const fmtHM = fmtTimeDK; // dansk tid (Europe/Copenhagen), ikke browserens/serverens egen tidszone
  const fmtDate = fmtDateDK; // dansk tid (Europe/Copenhagen), ikke browserens/serverens egen tidszone
  // "t:mm" (timer:minutter) — samme format for BÅDE hver enkelt vagt og totalen
  // nederst, som ønsket ("total timer:minutter").
  const fmtDuration = (ms) => {
    const totalMin = Math.max(0, Math.round(ms / 60000));
    return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
  };
  const inputStyle = { borderColor: dk ? "#3a3a3a" : "#d6d3d1", background: dk ? "#141414" : "white", color: dk ? "white" : INK };

  // "Fra"/"Til" tolkes som HELE dage i lokal tid (00:00:00 til 23:59:59.999), så en
  // vagt, der starter sidst på "til"-dagen, ikke falder udenfor ved en kant-fejl.
  const fromMs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : -Infinity;
  const toMs = toDate ? new Date(toDate + "T23:59:59.999").getTime() : Infinity;

  const rows = shiftLog
    .filter((s) => empId === "alle" || s.userId === empId)
    .filter((s) => s.clockIn >= fromMs && s.clockIn <= toMs)
    .sort((a, b) => a.clockIn - b.clockIn);

  const now = Date.now();
  const totalMs = rows.reduce((a, s) => a + ((s.clockOut || now) - s.clockIn), 0);
  const employeeName = empId === "alle" ? "Alle" : ((staffList.find((p) => p.id === empId) || {}).name || "Ukendt");

  const exportCsv = () => {
    const sep = ";"; // Danske Excel-opsætninger bruger typisk semikolon som listeseparator
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const line = (cols) => cols.map(esc).join(sep);
    const lines = [
      line(["Medarbejder", "Dato", "Ind", "Ud", "Varighed (t:mm)"]),
      ...rows.map((s) => line([
        s.name, fmtDate(s.clockIn), fmtHM(s.clockIn),
        s.clockOut ? fmtHM(s.clockOut) : "pågår",
        fmtDuration((s.clockOut || now) - s.clockIn),
      ])),
      line(["", "", "", "Total", fmtDuration(totalMs)]),
    ];
    // ﻿ (BOM) sikrer at æ/ø/å vises korrekt, når filen åbnes direkte i Excel.
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const safe = (s) => s.replace(/[^\p{L}\p{N}_-]+/gu, "_");
    const a = document.createElement("a");
    a.href = url;
    a.download = `vagt_${safe(employeeName)}_${fromDate || "start"}_${toDate || "slut"}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border p-4" style={box}>
      <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: dk ? GOLD : BLUE }}>
        Eksportér vagtdata (fx til dokumentation)
      </div>
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Medarbejder</div>
          <select value={empId} onChange={(e) => setEmpId(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle}>
            <option value="alle">Alle medarbejdere</option>
            {staffList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Fra dato</div>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Til dato</div>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle} />
        </div>
        <button onClick={exportCsv} disabled={rows.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-sm disabled:opacity-50"
          style={{ background: GOLD, color: INK }}>
          <Download size={15} /> Eksportér (CSV)
        </button>
      </div>

      {shiftLogLoading ? (
        <div className="text-sm py-4 text-center" style={{ color: sub }}>Henter…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm py-4 text-center" style={{ color: sub }}>Ingen vagter i den valgte periode.</div>
      ) : (
        <>
          <div className="space-y-1.5 max-h-72 overflow-y-auto mb-3 pr-1">
            {rows.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-sm py-1"
                style={{ borderBottom: `1px solid ${dk ? "#2a2a2a" : "#f0efed"}` }}>
                <span className="min-w-0 truncate" style={{ color: dk ? "white" : INK }}>
                  {empId === "alle" ? `${s.name} · ` : ""}{fmtDate(s.clockIn)}
                </span>
                <span className="shrink-0 tabular-nums" style={{ color: sub }}>
                  {fmtHM(s.clockIn)}–{s.clockOut ? fmtHM(s.clockOut) : "pågår"} · {fmtDuration((s.clockOut || now) - s.clockIn)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 font-black text-sm" style={{ borderTop: `2px solid ${dk ? "#333" : "#e7e5e4"}` }}>
            <span style={{ color: dk ? "white" : INK }}>{rows.length} vagt{rows.length === 1 ? "" : "er"} i alt</span>
            <span style={{ color: dk ? GOLD : GOLD_D }}>Total: {fmtDuration(totalMs)} timer</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Medarbejder-oversigt (kun ejer/manager — se canManageStore-tjekket i App, som er
   den ENESTE, der renderer denne komponent) ──
   Sammenholder vagttimer med handler PR. MEDARBEJDER, til brug for løn/bonus. Ren
   visning + CSV-eksport, samme mønster som ShiftExport ovenfor — INGEN skrivning
   nogen steder, kan aldrig ændre en vagt, en handel, kassen eller lageret. Læser
   udelukkende data der allerede er hentet i App: "sales" (RLS: "authenticated read
   sales" — alle handler, uanset rolle) og "shiftLog" (RLS: "manager read all
   shifts" — kun ejer/manager, se 14-shifts.sql). Ingen nye databasekald.

   "Handler i alt" tæller køb OG salg for medarbejderen — matchet via sellerId
   (= profile.id for den, der var logget ind, da handlen blev gemt, se
   beginSaveTrade). "Avance/overskud" er summen af sales.profit i perioden, som
   allerede er korrekt beregnet for BÅDE køb og salg ved selve handlen (modsat
   Top-varer-siden, der estimerer ud fra NUVÆRENDE priser) — her er tallet derfor
   det faktiske, historiske overskud, ikke et estimat. "Timer på vagt" tæller kun
   AFSLUTTEDE vagter (clock_out sat) — en vagt, der stadig pågår, tæller ikke med
   endnu, som ønsket. */
function StaffOverview({ sales, shiftLog, shiftLogLoading, staffList, cur, wide }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const monthAgoStr = () => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(monthAgoStr());
  const [toDate, setToDate] = useState(todayStr());
  const [sortBy, setSortBy] = useState("profit"); // profit | perHour

  const inputStyle = { borderColor: dk ? "#3a3a3a" : "#d6d3d1", background: dk ? "#141414" : "white", color: dk ? "white" : INK };
  // "t:mm" (timer:minutter) — samme format som ShiftExport, for genkendelighed.
  const fmtDuration = (ms) => {
    const totalMin = Math.max(0, Math.round(ms / 60000));
    return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
  };

  // "Fra"/"Til" tolkes som HELE dage i lokal tid — samme konvention som ShiftExport,
  // så de to sider altid stemmer overens ved samme valgte periode.
  const fromMs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : -Infinity;
  const toMs = toDate ? new Date(toDate + "T23:59:59.999").getTime() : Infinity;

  const rows = staffList.map((p) => {
    const shifts = shiftLog.filter((s) => s.userId === p.id && s.clockOut != null && s.clockIn >= fromMs && s.clockIn <= toMs);
    const hoursMs = shifts.reduce((a, s) => a + (s.clockOut - s.clockIn), 0);
    const hoursDecimal = hoursMs / 3600000;

    const trades = sales.filter((t) => t.sellerId === p.id && t.at >= fromMs && t.at <= toMs);
    const revenue = trades.filter((t) => t.type === "sell").reduce((a, t) => a + t.total, 0);
    const purchases = trades.filter((t) => t.type === "buy").reduce((a, t) => a + t.total, 0);
    const profit = trades.reduce((a, t) => a + t.profit, 0);
    const perHour = hoursDecimal > 0 ? profit / hoursDecimal : null;

    return { id: p.id, name: p.name, hoursMs, tradeCount: trades.length, revenue, purchases, profit, perHour };
  }).sort((a, b) => sortBy === "perHour"
    ? (b.perHour ?? -Infinity) - (a.perHour ?? -Infinity)
    : b.profit - a.profit
  );

  const totals = rows.reduce((a, r) => ({
    hoursMs: a.hoursMs + r.hoursMs, tradeCount: a.tradeCount + r.tradeCount,
    revenue: a.revenue + r.revenue, purchases: a.purchases + r.purchases, profit: a.profit + r.profit,
  }), { hoursMs: 0, tradeCount: 0, revenue: 0, purchases: 0, profit: 0 });
  const totalHoursDecimal = totals.hoursMs / 3600000;
  const totalPerHour = totalHoursDecimal > 0 ? totals.profit / totalHoursDecimal : null;

  const exportCsv = () => {
    const sep = ";"; // Danske Excel-opsætninger bruger typisk semikolon som listeseparator
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const line = (cols) => cols.map(esc).join(sep);
    const lines = [
      line(["Medarbejder", "Timer på vagt (t:mm)", "Handler i alt", "Omsætning", "Indkøb", "Avance/overskud", "Avance pr. time"]),
      ...rows.map((r) => line([
        r.name, fmtDuration(r.hoursMs), r.tradeCount, fmt(r.revenue), fmt(r.purchases), fmt(r.profit),
        r.perHour == null ? "-" : fmt(r.perHour),
      ])),
      line(["Total", fmtDuration(totals.hoursMs), totals.tradeCount, fmt(totals.revenue), fmt(totals.purchases), fmt(totals.profit),
        totalPerHour == null ? "-" : fmt(totalPerHour)]),
    ];
    // ﻿ (BOM) sikrer at æ/ø/å vises korrekt, når filen åbnes direkte i Excel.
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medarbejderoversigt_${fromDate || "start"}_${toDate || "slut"}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={"pb-10 " + (dk ? "px-8 pt-6 mx-auto text-white" : "px-3 pt-3")} style={dk ? { maxWidth: PAGE_MAX } : {}}>
      <div className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: dk ? GOLD : BLUE }}>Medarbejder-oversigt</div>
      <div className="text-[11px] mb-3" style={{ color: sub }}>
        Timer på vagt holdt op mod handler og avance, pr. medarbejder — til løn og bonus. Kun læsning; ændrer intet.
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Fra dato</div>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Til dato</div>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle} />
        </div>
        <div className="flex rounded-lg overflow-hidden border text-xs font-black" style={{ borderColor: dk ? "#3a3a3a" : "#d6d3d1" }}>
          {[["profit", "Avance"], ["perHour", "Avance/time"]].map(([v, l]) => (
            <button key={v} onClick={() => setSortBy(v)} className="px-3 py-2"
              style={sortBy === v ? { background: GOLD, color: INK } : { background: dk ? PANEL : "white", color: sub }}>{l}</button>
          ))}
        </div>
        <button onClick={exportCsv} disabled={rows.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-sm disabled:opacity-50 ml-auto"
          style={{ background: GOLD, color: INK }}>
          <Download size={15} /> Eksportér (CSV)
        </button>
      </div>

      {shiftLogLoading ? (
        <div className="text-sm py-6 text-center" style={{ color: sub }}>Henter…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: sub }}>Ingen medarbejdere fundet.</div>
      ) : (
        <div className="space-y-2 mb-4">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border p-3" style={box}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold" style={{ color: dk ? "white" : INK }}>{r.name}</span>
                <span className="font-black tabular-nums" style={{ color: r.profit >= 0 ? (dk ? "#4ade80" : GREEN) : (dk ? "#f87171" : RED) }}>
                  {fmt(r.profit)} {cur}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]" style={{ color: sub }}>
                <div>Timer på vagt: <span className="font-bold tabular-nums" style={{ color: dk ? "white" : INK }}>{fmtDuration(r.hoursMs)}</span></div>
                <div>Handler i alt: <span className="font-bold tabular-nums" style={{ color: dk ? "white" : INK }}>{r.tradeCount}</span></div>
                <div>Omsætning: <span className="font-bold tabular-nums" style={{ color: dk ? "white" : INK }}>{fmt(r.revenue)} {cur}</span></div>
                <div>Indkøb: <span className="font-bold tabular-nums" style={{ color: dk ? "white" : INK }}>{fmt(r.purchases)} {cur}</span></div>
                <div className="col-span-2">Avance pr. time: <span className="font-black tabular-nums" style={{ color: dk ? GOLD : GOLD_D }}>{r.perHour == null ? "-" : `${fmt(r.perHour)} ${cur}/t`}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex items-center justify-between pt-2 font-black text-sm flex-wrap gap-1" style={{ borderTop: `2px solid ${dk ? "#333" : "#e7e5e4"}` }}>
          <span style={{ color: dk ? "white" : INK }}>{rows.length} medarbejder{rows.length === 1 ? "" : "e"} · {fmtDuration(totals.hoursMs)} timer i alt</span>
          <span style={{ color: dk ? GOLD : GOLD_D }}>
            Total avance: {fmt(totals.profit)} {cur}{totalPerHour != null ? ` · ${fmt(totalPerHour)} ${cur}/t` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// Danske labels for hver "action"-værdi, der kan stå i activity_log.action (se
// 19-activity-log.sql — det er UDELUKKENDE disse koder, security definer-funktionerne
// og manage-staff Edge Function'en nogensinde skriver).
const ACTIVITY_LABELS = {
  price_changed: "Prisændring",
  material_deleted: "Slettet vare",
  cash_corrected: "Kasse rettet",
  sale_reversed: "Handel fortrudt",
  sale_amount_edited: "Beløb rettet",
  sale_customer_edited: "Kunde-ID rettet",
  customer_deleted: "Kunde slettet",
  shift_closed: "Vagt lukket",
  shift_edited: "Vagt rettet",
  discord_id_set: "Discord-ID sat",
  staff_created: "Medarbejder oprettet",
  staff_updated: "Medarbejder rettet",
  staff_deleted: "Medarbejder slettet",
};
// Bygger den korte "detaljer"-linje for én log-hændelse, ud fra dens gemte
// "details"-jsonb (se hver funktions "perform log_activity(...)"-kald i
// 19-activity-log.sql for hvad hvert felt betyder).
function describeActivity(e, cur) {
  const d = e.details || {};
  const dkTime = (iso) => (iso ? `${fmtDateDK(new Date(iso).getTime())} ${fmtTimeDK(new Date(iso).getTime())}` : "?");
  switch (e.action) {
    case "price_changed": {
      const parts = [];
      if (d.old_price !== undefined) parts.push(`Køb: ${fmt(d.old_price)} → ${fmt(d.new_price)} ${cur}`);
      if (d.old_sell !== undefined) parts.push(`Salg: ${fmt(d.old_sell)} → ${fmt(d.new_sell)} ${cur}`);
      return `${d.name || d.material_id || "?"} — ${parts.join(" · ")}`;
    }
    case "material_deleted":
      return `${d.name || d.material_id || "?"}`;
    case "cash_corrected":
      return `${fmt(d.old_amount)} → ${fmt(d.new_amount)} ${cur}`;
    case "sale_reversed":
      return `Handel #${d.sale_id} (${d.type === "sell" ? "salg" : "køb"}${d.cust_id ? ", kunde " + d.cust_id : ""}) — ${fmt(d.total)} ${cur}, oprindelig sælger: ${d.seller_name || "?"}`;
    case "sale_amount_edited":
      return `Handel #${d.sale_id}${d.cust_id ? " (kunde " + d.cust_id + ")" : ""}: ${fmt(d.old_total)} → ${fmt(d.new_total)} ${cur}`;
    case "sale_customer_edited":
      return `Handel #${d.sale_id}: "${d.old_cust_id || "—"}" → "${d.new_cust_id || "—"}"`;
    case "customer_deleted":
      return `${d.cust_id} (${d.sales_deleted ?? 0} handler slettet)`;
    case "shift_closed":
      return `${d.target_name || "?"} — ud-tid sat til ${dkTime(d.clock_out)}`;
    case "shift_edited":
      return `${d.target_name || "?"} — ind: ${dkTime(d.old_clock_in)} → ${dkTime(d.new_clock_in)}, ud: ${d.old_clock_out ? dkTime(d.old_clock_out) : "pågår"} → ${d.new_clock_out ? dkTime(d.new_clock_out) : "pågår"}`;
    case "discord_id_set":
      return `${d.target_name || "?"}: "${d.old_discord_id || "—"}" → "${d.new_discord_id || "—"}"`;
    case "staff_created":
      return `${d.target_name || "?"} (rolle: ${d.role || "?"})`;
    case "staff_updated": {
      const bits = [];
      if (d.new_name && d.new_name !== d.old_name) bits.push(`navn: "${d.old_name || "?"}" → "${d.new_name}"`);
      if (d.new_role && d.new_role !== d.old_role) bits.push(`rolle: "${d.old_role || "?"}" → "${d.new_role}"`);
      if (d.password_changed) bits.push("kodeord ændret");
      return `${d.old_name || d.new_name || "?"} — ${bits.length ? bits.join(", ") : "ingen synlige ændringer"}`;
    }
    case "staff_deleted":
      return `${d.target_name || "?"} (rolle: ${d.role || "?"})`;
    default:
      return JSON.stringify(d);
  }
}

/* ── Aktivitets-log / audit trail (KUN ejer — se isOwner-tjekket i App, som er den
   ENESTE, der renderer denne komponent) ──
   Ren visning — INGEN redigering, sletning eller anden skrivning nogen steder. Selve
   linjerne ("hvem"/"hvad"/"detaljer"/"hvornår") er allerede skrevet server-side, inde i
   de relevante security definer-funktioner og manage-staff Edge Function'en (se
   19-activity-log.sql) — denne komponent læser blot "entries" (hentet via
   loadActivityLog i App, begrænset af RLS-policyen "owner read activity_log" til kun
   rollen "ejer") og filtrerer/viser dem. Nyeste øverst (allerede sorteret sådan af
   loadActivityLog). Genbruger periode-knapperne (I dag/7 dage/30 dage/Alt) + fra/til-
   dato-vælgeren fra hhv. ShiftView og ShiftExport/StaffOverview ovenfor. */
function ActivityLogView({ entries, loading, cur, wide }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const inputStyle = { borderColor: dk ? "#3a3a3a" : "#d6d3d1", background: dk ? "#141414" : "white", color: dk ? "white" : INK };

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const daysAgoStr = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const [period, setPeriod] = useState("alt"); // dag | uge | måned | alt — kun til at fremhæve den aktive knap
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actorFilter, setActorFilter] = useState("alle");
  const [actionFilter, setActionFilter] = useState("alle");

  const applyPreset = (p) => {
    setPeriod(p);
    if (p === "dag") { const d = todayStr(); setFromDate(d); setToDate(d); }
    else if (p === "uge") { setFromDate(daysAgoStr(7)); setToDate(todayStr()); }
    else if (p === "måned") { setFromDate(daysAgoStr(30)); setToDate(todayStr()); }
    else { setFromDate(""); setToDate(""); }
  };

  const fromMs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : -Infinity;
  const toMs = toDate ? new Date(toDate + "T23:59:59.999").getTime() : Infinity;

  const withMs = entries.map((e) => ({ ...e, atMs: new Date(e.at).getTime() }));
  const actorNames = [...new Set(withMs.map((e) => e.actor_name).filter(Boolean))].sort();
  const actionsPresent = [...new Set(withMs.map((e) => e.action))];

  const rows = withMs
    .filter((e) => e.atMs >= fromMs && e.atMs <= toMs)
    .filter((e) => actorFilter === "alle" || e.actor_name === actorFilter)
    .filter((e) => actionFilter === "alle" || e.action === actionFilter);

  return (
    <div className={"pb-10 " + (dk ? "px-8 pt-6 mx-auto text-white" : "px-3 pt-3")} style={dk ? { maxWidth: PAGE_MAX } : {}}>
      <div className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: dk ? GOLD : BLUE }}>Aktivitets-log</div>
      <div className="text-[11px] mb-3" style={{ color: sub }}>
        Hvem gjorde hvad hvornår — pris-ændringer, kasse-rettelser, fortrudte/rettede handler, slettede kunder/varer, vagt-rettelser og medarbejder-/rolle-ændringer. Kun læsning; ændrer intet. Kun synlig for ejeren.
      </div>

      <div className="flex rounded-lg overflow-hidden border text-xs font-black mb-3" style={{ borderColor: dk ? "#3a3a3a" : "#d6d3d1" }}>
        {[["dag", "I dag"], ["uge", "7 dage"], ["måned", "30 dage"], ["alt", "Alt"]].map(([v, l]) => (
          <button key={v} onClick={() => applyPreset(v)} className="flex-1 py-2"
            style={period === v ? { background: GOLD, color: INK } : { background: dk ? PANEL : "white", color: sub }}>{l}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Fra dato</div>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPeriod(""); }}
            className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Til dato</div>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPeriod(""); }}
            className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Medarbejder</div>
          <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle}>
            <option value="alle">Alle</option>
            {actorNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sub }}>Handlingstype</div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm" style={inputStyle}>
            <option value="alle">Alle</option>
            {actionsPresent.map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a] || a}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-sm py-6 text-center" style={{ color: sub }}>Henter…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: sub }}>Ingen hændelser i den valgte periode.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="rounded-xl border p-3" style={box}>
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <span className="font-bold" style={{ color: dk ? GOLD : GOLD_D }}>{ACTIVITY_LABELS[e.action] || e.action}</span>
                <span className="text-[11px] tabular-nums" style={{ color: sub }}>{fmtDateDK(e.atMs)} · {fmtTimeDK(e.atMs)}</span>
              </div>
              <div className="text-sm" style={{ color: dk ? "white" : INK }}>{describeActivity(e, cur)}</div>
              <div className="text-[11px] mt-1" style={{ color: sub }}>Af: {e.actor_name || "Ukendt"}</div>
            </div>
          ))}
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="text-[11px] mt-3 text-center" style={{ color: sub }}>{rows.length} hændelse{rows.length === 1 ? "" : "r"} i den valgte periode.</div>
      )}
    </div>
  );
}

/* ── Top-varer efter avance (kun læsning) ──
   Avancen pr. solgt vare (salgspris minus kostpris) lagt sammen pr. varenavn, for
   SALG-handler ("Sælg til kunde") i den valgte periode. Historiske salg gemmer ikke
   kostprisen fra dengang handlen blev lavet (kun "sum"/"sellSum" på linjen) — derfor
   bruges den NUVÆRENDE kostpris fra prislisten som estimat (se disclaimeren i UI'en).
   Skranke-varer indgår ikke (de er ikke en del af det almindelige materiale-sortiment). */
function TopMarginItems({ sales, config, cur, wide }) {
  const [period, setPeriod] = useState("dag"); // dag | uge | måned | alt — samme som Dagbog
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";

  const now = Date.now();
  const cutoff = period === "dag" ? new Date().setHours(0, 0, 0, 0)
    : period === "uge" ? now - 7 * 86400000
    : period === "måned" ? now - 30 * 86400000
    : 0;
  const inPeriod = sales.filter((t) => t.at >= cutoff && t.type === "sell");

  const agg = {};
  inPeriod.forEach((t) => {
    (t.lines || []).forEach((l) => {
      if (l.isCounter) return;
      const key = l.name;
      if (!agg[key]) agg[key] = { name: key, qty: 0, revenue: 0, cost: 0 };
      const mat = findMaterialByName(config.materials, key);
      const unitCost = mat ? (mat.price || 0) : 0;
      agg[key].qty += l.qty || 0;
      agg[key].revenue += l.sum || 0;
      agg[key].cost += unitCost * (l.qty || 0);
    });
  });
  const rows = Object.values(agg)
    .map((r) => ({ ...r, margin: r.revenue - r.cost }))
    .sort((a, b) => b.margin - a.margin);

  return (
    <div className={"pb-10 " + (dk ? "px-8 pt-6 mx-auto text-white" : "px-3 pt-3")} style={dk ? { maxWidth: 900 } : {}}>
      <div className="flex rounded-lg overflow-hidden border text-xs font-black mb-3" style={{ borderColor: dk ? "#3a3a3a" : "#d6d3d1" }}>
        {[["dag", "I dag"], ["uge", "7 dage"], ["måned", "30 dage"], ["alt", "Alt"]].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)} className="flex-1 py-2"
            style={period === v ? { background: GOLD, color: INK } : { background: dk ? PANEL : "white", color: sub }}>{l}</button>
        ))}
      </div>
      <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: dk ? GOLD : BLUE }}>Top-varer efter avance</div>
      <div className="text-[11px] mb-3 px-0.5" style={{ color: sub }}>
        Avancen er beregnet ud fra de NUVÆRENDE kostpriser i prislisten (historiske salg gemmer ikke kostprisen fra dengang) — tallene er derfor et estimat, ikke et regnskabsmæssigt facit.
      </div>
      {rows.length === 0 && <div className="text-sm py-6 text-center" style={{ color: sub }}>Ingen salg i denne periode.</div>}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.name} className="rounded-xl border p-3 flex items-center justify-between gap-2" style={box}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-6 text-center font-black text-xs shrink-0" style={{ color: dk ? "#666" : "#a8a29e" }}>{i + 1}</div>
              <div className="min-w-0">
                <div className="font-bold truncate" style={{ color: dk ? "white" : INK }}>{r.name}</div>
                <div className="text-[11px]" style={{ color: sub }}>{fmt(r.qty)} stk. solgt · omsætning {fmt(r.revenue)} {cur}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-black tabular-nums" style={{ color: r.margin >= 0 ? (dk ? "#4ade80" : GREEN) : (dk ? "#f87171" : RED) }}>{fmt(r.margin)} {cur}</div>
              <div className="text-[10px]" style={{ color: sub }}>avance (est.)</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Stamkunder (kun læsning) ──
   Top-liste over kunder efter samlet beløb (buildCustomers sorterer allerede sådan),
   med antal handler og point pr. kunde. Genbruger visningsdesignet fra Kunder-siden
   (samme kort-stil, niveau-badge osv.), men er en ren visning uden nogen handlinger,
   der kan ændre data (ingen slet-knap, ingen redigering). */
function TopCustomers({ sales, config, cur, wide }) {
  const dk = wide;
  const box = dk ? { background: PANEL, borderColor: "#333" } : { background: "white", borderColor: "#e7e5e4" };
  const sub = dk ? "#9ca3af" : "#78716c";
  const custs = buildCustomers(sales);
  const wrap = "pb-10 " + (dk ? "px-8 pt-6 mx-auto " : "px-3 pt-3 ") + (dk ? "text-white" : "");
  const wrapStyle = dk ? { maxWidth: PAGE_MAX } : {};

  return (
    <div className={wrap} style={wrapStyle}>
      <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: dk ? GOLD : BLUE }}>Stamkunder — top efter samlet beløb</div>
      {custs.length === 0 && <div className="text-sm py-6 text-center" style={{ color: sub }}>Ingen kunder endnu.</div>}
      <div className="space-y-2">
        {custs.map((c, i) => {
          const { cur: lvl } = levelFor(c.points, config.levels);
          return (
            <div key={c.id} className="w-full rounded-xl border p-3 flex items-center justify-between gap-2" style={box}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 text-center font-black text-xs shrink-0" style={{ color: dk ? "#666" : "#a8a29e" }}>{i + 1}</div>
                <div className="min-w-0">
                  <div className="font-black truncate" style={{ color: dk ? "white" : INK }}>{c.id}</div>
                  <div className="text-[11px]" style={{ color: sub }}>{c.trades.length} handler · {c.points} point</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black" style={{ background: dk ? "rgba(245,179,1,.15)" : "#fdf3e7", color: dk ? GOLD : GOLD_D }}>{lvl.name}</span>
                <span className="font-black tabular-nums" style={{ color: dk ? GOLD : INK }}>{fmt(c.total)} {cur}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Indstillinger: butik, valuta, materialer ── */
// Billede-URL pr. vare til den offentlige prisliste. Samme "lokal kladde + dirty-Gem-
// knap"-mønster som CustomerPhoneEditor ovenfor — holder brugerens indtastning isoleret
// fra baggrunds-genindlæsning af "images", og gemmer kun når man selv trykker Gem.
function MaterialImageEditor({ dk, url, onSave }) {
  const [value, setValue] = useState(url || "");
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const dirty = value.trim() !== (url || "").trim();
  const inp = "rounded-lg border px-2 py-2 text-sm " + (dk ? "" : "border-stone-300 bg-white");
  const inpStyle = dk ? { borderColor: "#3a3a3a", background: PANEL, color: "white" } : {};
  const lab = dk ? { color: "#9ca3af" } : { color: "#78716c" };

  const save = async () => {
    setBusy(true);
    try {
      await onSave(value.trim());
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500);
    } finally { setBusy(false); }
  };

  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[11px] shrink-0" style={lab}>Billede-URL</span>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://… (valgfrit)"
        className={inp + " flex-1 min-w-0"} style={inpStyle} />
      {dirty && (
        <button disabled={busy} onClick={save} className="px-2.5 py-1.5 rounded-lg font-bold text-xs shrink-0" style={{ background: GOLD, color: INK }}>
          {savedFlash ? "Gemt!" : (busy ? "…" : "Gem")}
        </button>
      )}
    </label>
  );
}

function PriceSettings({ config, save, close, wide, visibility, onTogglePublic, images, onSetImage }) {
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
              <button onClick={() => { if (levels.length > 1) setLevels(levels.filter((_, j) => j !== i)); }}
                disabled={levels.length <= 1} title={levels.length <= 1 ? "Mindst ét niveau skal blive stående" : "Slet niveau"}
                className="p-1" style={{ color: dk ? "#666" : "#d6d3d1", opacity: levels.length <= 1 ? .35 : 1 }}><Trash2 size={15} /></button>
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
              <label className="flex items-center gap-2 pt-1.5" style={{ borderTop: `1px solid ${dk ? "#333" : "#f0efed"}` }}>
                <input type="checkbox" checked={!!visibility?.[m.id]}
                  onChange={(e) => onTogglePublic(m.id, e.target.checked)}
                  className="w-4 h-4 rounded shrink-0" />
                <span className="text-[11px] font-bold" style={lab}>
                  Vis offentligt på <span style={{ color: dk ? GOLD : GOLD_D }}>/priser</span>
                </span>
              </label>
              <MaterialImageEditor dk={dk} url={images?.[m.id]} onSave={(url) => onSetImage(m.id, url)} />
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
      <div className="text-[11px]" style={dk ? { color: "#6b7280" } : { color: "#a8a29e" }}>Standardpriserne bruges automatisk — under en handel kan du stadig rette prisen pr. materiale uden at ændre standarden. Rækkefølgen her styrer rækkefølgen i listen. "Vis offentligt" og "Billede-URL" gemmes hver for sig, med det samme (rører ikke "Gem alt").</div>
    </div>
  );
}
