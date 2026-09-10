// ============================================================
//  MIRROR PAWN — Supabase data-lag til appen
//  Login, roller, config, salg og hændelser (som botten poster
//  til Discord). Se GUIDE.md for opsætning.
// ============================================================
import { supabase, SUPABASE_URL } from "./supabase-client.js";

// Brugernavne er tekniske Supabase-konti bag kulisserne — appen
// oversætter altid brugernavn -> en teknisk "e-mail", som brugeren
// aldrig ser eller skal kende.
const EMAIL_DOMAIN = "mirrorpawn.internal";
const toEmail = (username) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;

// ---- Login / session ----
export async function signIn(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  });
  if (error) throw error;
  return data.session;
}
export async function signOut() {
  await supabase.auth.signOut();
}
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

// ---- Profiler (navn + rolle) ----
export async function loadMyProfile(userId) {
  const { data, error } = await supabase
    .from("profiles").select("id, username, name, role").eq("id", userId).single();
  if (error) throw error;
  return data;
}
export async function loadAllProfiles() {
  const { data, error } = await supabase
    .from("profiles").select("id, username, name, role, created_at").order("created_at");
  if (error) throw error;
  return data || [];
}

// ---- Ansatte-administration (kun ejer — via sikker Edge Function) ----
async function callManageStaff(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(`${SUPABASE_URL}/functions/v1/manage-staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || "Ukendt fejl fra serveren.");
  return json;
}
export const createStaff = (username, password, name, role) =>
  callManageStaff("create", { username, password, name, role });
export const updateStaff = (id, patch) => callManageStaff("update", { id, ...patch });
export const deleteStaff = (id) => callManageStaff("delete", { id });

// ---- Config (butik, priser, kategorier, niveauer) ----
export async function loadConfig() {
  const { data, error } = await supabase.from("config").select("data").eq("id", 1).single();
  if (error) throw error;
  return data?.data ?? null;
}
export async function saveConfig(data) {
  const { error } = await supabase
    .from("config").update({ data, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw error;
}

// ---- Salg ----
export async function loadSales(limit = 500) {
  const { data, error } = await supabase
    .from("sales").select("*").order("at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}
export async function insertSale(trade) {
  // trade: { at, custId, lines, total, sellTotal, profit, points, sellerId, sellerName, commission }
  const row = {
    at: new Date(trade.at).toISOString(),
    cust_id: trade.custId || null,
    lines: trade.lines,
    total: trade.total,
    sell_total: trade.sellTotal,
    profit: trade.profit,
    points: trade.points,
    seller_id: trade.sellerId || null,
    seller_name: trade.sellerName || null,
    commission: trade.commission || 0,
  };
  const { data, error } = await supabase.from("sales").insert(row).select().single();
  if (error) throw error;
  return data;
}

// ---- Hændelser (botten poster dem) ----
export async function logEvent(kind, payload) {
  const { error } = await supabase.from("events").insert({ kind, payload });
  if (error) throw error;
}

export const supabaseReady = true;
