// ============================================================
//  MIRROR PAWN — Supabase data-lag til appen
//  Erstatter window.storage. Læser/skriver config, salg og
//  skriver hændelser (som botten poster til Discord).
//
//  Sæt dine to offentlige værdier her (fra Supabase →
//  Project Settings → API):
// ============================================================
const SUPABASE_URL  = "https://pfjsxrexbxbhzqvuolwj.supabase.co";       // fx https://abcd.supabase.co
const SUPABASE_ANON = "sb_publishable_OFx0Ekrn6CJ33jHjmcDXeQ_WXeOvMNW";   // den lange "anon public"-nøgle

const H = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
};

async function rest(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { ...H, ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.status === 204 ? null : r.json();
}

// ---- Config (butik, priser, kategorier, niveauer) ----
export async function loadConfig() {
  const rows = await rest(`config?id=eq.1&select=data`);
  return rows?.[0]?.data ?? null;
}
export async function saveConfig(data) {
  await rest(`config?id=eq.1`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
  });
}

// ---- Salg ----
export async function loadSales(limit = 500) {
  return rest(`sales?order=at.desc&limit=${limit}`);
}
export async function insertSale(trade) {
  // trade: { at, custId, lines, total, sellTotal, profit, points }
  const row = {
    at: new Date(trade.at).toISOString(),
    cust_id: trade.custId || null,
    lines: trade.lines,
    total: trade.total,
    sell_total: trade.sellTotal,
    profit: trade.profit,
    points: trade.points,
  };
  const [saved] = await rest(`sales`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  return saved;
}

// ---- Hændelser (botten poster dem) ----
export async function logEvent(kind, payload) {
  await rest(`events`, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ kind, payload }),
  });
}

export const supabaseReady =
  SUPABASE_URL !== "PROJEKT-URL-HER" && SUPABASE_ANON !== "ANON-PUBLIC-KEY-HER";
