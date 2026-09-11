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
// Sletter en kunde ved at slette alle dennes handler (kunder er udledt af salgshistorikken)
export async function deleteCustomer(custId) {
  const { error } = await supabase.from("sales").delete().eq("cust_id", custId);
  if (error) throw error;
}
export async function insertSale(trade) {
  // trade: { at, custId, lines, total, sellTotal, profit, points, sellerId, sellerName, commission, type }
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
    type: trade.type || "buy",
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

// ---- Lager ----
export async function loadInventory() {
  const { data, error } = await supabase.from("inventory").select("material_id, qty");
  if (error) throw error;
  const map = {};
  (data || []).forEach((r) => { map[r.material_id] = +r.qty; });
  return map;
}
// Tæller lageret op/ned atomisk (fx +qty ved køb, -qty ved salg)
export async function adjustInventory(materialId, delta) {
  const { data, error } = await supabase.rpc("adjust_inventory", { p_material_id: materialId, p_delta: delta });
  if (error) throw error;
  return +data;
}
// Sætter lagerantallet direkte (bruges til opstart/manuel rettelse)
export async function setInventoryQty(materialId, qty) {
  const { error } = await supabase
    .from("inventory")
    .upsert({ material_id: materialId, qty, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---- Crafting ----
// Trækker de forbrugte materialer fra lageret og lægger den craftede vare til —
// alt sammen i én atomisk DB-transaktion (se funktionen craft_item i schema-filen).
// Hvis der ikke længere er nok af et materiale (fx en kollega har solgt i mellemtiden),
// ruller databasen automatisk hele operationen tilbage og kaster en fejl i stedet for
// at trække lageret i minus.
export async function craftItem(consumed, outputMaterialId, outputQty) {
  // consumed: [{ material_id, qty }, ...]
  const { error } = await supabase.rpc("craft_item", {
    p_consumed: consumed,
    p_output_id: outputMaterialId,
    p_output_qty: outputQty,
  });
  if (error) throw error;
}

// Trækker KUN de forbrugte materialer fra lageret — lægger ingen færdigvare til.
// Bruges til "craftede du disse?"-tjekket efter et salg, hvor varen allerede er
// solgt (og derfor ikke skal lægges til lageret igen).
export async function consumeCraftMaterials(consumed) {
  // consumed: [{ material_id, qty }, ...]
  const { error } = await supabase.rpc("craft_consume", { p_consumed: consumed });
  if (error) throw error;
}

// ---- Kontantbeholdning (kassen) ----
export async function loadCash() {
  const { data, error } = await supabase.from("cash_balance").select("amount").eq("id", 1).single();
  if (error) throw error;
  return +(data?.amount ?? 0);
}
// Justerer kassen atomisk (fx -total ved køb, +total ved salg)
export async function adjustCash(delta) {
  const { data, error } = await supabase.rpc("adjust_cash", { p_delta: delta });
  if (error) throw error;
  return +data;
}
// Sætter kassen direkte (bruges til at indtaste startbeløb)
export async function setCash(amount) {
  const { error } = await supabase
    .from("cash_balance")
    .upsert({ id: 1, amount, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export const supabaseReady = true;
