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
    .from("profiles").select("id, username, name, role, created_at, discord_id").order("created_at");
  if (error) throw error;
  return data || [];
}
// Retter KUN "discord_id", via den sikre set_discord_id()-funktion (security definer,
// se 19-activity-log.sql) — ejer/manager-tjekket sker NU inde i selve funktionen, som
// også logger ændringen til activity_log (gammelt → nyt Discord-ID). "profiles" har
// ikke længere nogen direkte klient-skrivevej overhovedet. Går UDENOM manage-staff Edge
// Function med vilje — den forbliver "kun ejer" og uændret; denne funktion rører aldrig
// navn/rolle/username/kodeord, kun Discord-ID'et.
export async function setDiscordId(userId, discordId) {
  const { error } = await supabase.rpc("set_discord_id", { p_user_id: userId, p_discord_id: discordId || null });
  if (error) throw error;
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
// Gemmer via save_config() (security definer, se 19-activity-log.sql) i stedet for en
// rå UPDATE — funktionen gør PRÆCIS det samme (gemmer "data" uændret), men
// sammenligner først den gamle og nye "materials"-liste og logger pris-/salgspris-
// ændringer og slettede varer til activity_log. Ejer/manager-tjekket sker nu inde i
// funktionen; "config" har ikke længere nogen direkte klient-skrivevej.
export async function saveConfig(data) {
  const { error } = await supabase.rpc("save_config", { p_data: data });
  if (error) throw error;
}

// ---- Salg ----
// "reversed" (se 5-undo-trade.sql) er handler der er fortrudt via Dagbogens
// "Fortryd handel"-knap — de holdes i databasen for sporbarhed, men filtreres altid
// væk her, så de forsvinder fra ALT der bygger på loadSales (Dagbog, Kunder, Top-varer,
// Stamkunder, point/niveau — som alle er udledt af den liste, denne funktion returnerer).
export async function loadSales(limit = 500) {
  const { data, error } = await supabase
    .from("sales").select("*").eq("reversed", false).order("at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

// Fortryder en handel ATOMISK i databasen: modregner kassen, lægger/trækker lageret
// tilbage for handlens varelinjer, og markerer handlen "reversed" — se reverse_sale i
// 5-undo-trade.sql. Kaster en fejl (fanges i App), hvis handlen allerede er fortrudt
// eller ikke findes, så den ikke kan fortrydes to gange.
export async function reverseSale(saleId) {
  const { error } = await supabase.rpc("reverse_sale", { p_sale_id: saleId });
  if (error) throw error;
}

// Retter kunde-ID på en allerede gemt handel (fx glemt under selve handlen), via
// update_sale_customer() (security definer, se 19-activity-log.sql) i stedet for en rå
// UPDATE — ren tekst-opdatering, rører ALDRIG kasse eller lager, men logger nu
// gammelt → nyt kunde-ID til activity_log. Kunde-point/handler-tæller er udledt af
// salgshistorikken (se loadSales ovenfor), så handlen tæller automatisk med for den
// NYE kunde, som om den havde været der fra start.
export async function updateSaleCustomer(saleId, custId) {
  const { error } = await supabase.rpc("update_sale_customer", { p_sale_id: saleId, p_cust_id: custId || null });
  if (error) throw error;
}

// Retter beløbet ("total") på en handel ATOMISK i databasen: kassen justeres med
// PRÆCIS forskellen, profit/avance justeres tilsvarende, og handlens gemte
// cash_delta opdateres, så en SENERE "Fortryd handel" stadig rammer korrekt — se
// edit_sale_amount i 8-edit-sale.sql. Lageret røres ALDRIG. Kan kaldes igen på
// samme handel — regner altid fra den senest gemte total.
export async function editSaleAmount(saleId, newTotal) {
  const { error } = await supabase.rpc("edit_sale_amount", { p_sale_id: saleId, p_new_total: newTotal });
  if (error) throw error;
}
// Sletter en kunde ved at slette alle dennes handler (kunder er udledt af
// salgshistorikken), via delete_customer() (security definer, se
// 19-activity-log.sql) — sletter STADIG det samme som før (handler + evt. gemt
// telefonnummer), nu atomisk i én transaktion, og logger antallet af slettede
// handler til activity_log.
export async function deleteCustomer(custId) {
  const { error } = await supabase.rpc("delete_customer", { p_cust_id: custId });
  if (error) throw error;
}

// ---- Kunde-telefonnummer ----
// Kunder har ellers ingen egen tabel — de er udledt af sales.cust_id. Denne tabel
// gemmer UDELUKKENDE et telefonnummer pr. kunde-id, så man kan ringe til fx vinderen
// af en leaderboard-konkurrence. Samme RLS-niveau som resten af kundedata (kun
// authenticated) — nummeret indgår ALDRIG i get_public_leaderboard() eller nogen
// anden offentlig sti.
export async function loadCustomerPhones() {
  const { data, error } = await supabase.from("customers").select("id, phone");
  if (error) throw error;
  const map = {};
  (data || []).forEach((r) => { if (r.phone) map[r.id] = r.phone; });
  return map;
}
export async function saveCustomerPhone(custId, phone) {
  const { error } = await supabase
    .from("customers")
    .upsert({ id: custId, phone: phone || null, updated_at: new Date().toISOString() });
  if (error) throw error;
}
export async function insertSale(trade) {
  // trade: { at, custId, lines, total, sellTotal, profit, points, sellerId, sellerName, commission, type, cashDelta }
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
    // Præcis hvor meget DENNE handel flyttede kassen med ved bogføring (se
    // tradeCashDelta i App.jsx) — gemmes MED handlen, så reverse_sale() og
    // edit_sale_amount() (se 8-edit-sale.sql) altid kan tage udgangspunkt i, hvad der
    // faktisk skete, uden at skulle genberegne det fra varelinjerne.
    cash_delta: trade.cashDelta ?? 0,
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

// ---- Offentlig prisliste-synlighed pr. vare ----
// "vis_offentligt" gemmes som en kolonne på "inventory" (samme tabel, der allerede
// har én række pr. materiale — se 6-public-pricelist.sql) — ADSKILT fra selve
// lagerantallet ("qty"), så disse to funktioner aldrig rører loadInventory/
// adjustInventory/setInventoryQty ovenfor. Bruges af "Vis offentligt"-fluebenet i
// Rediger-fanen; den offentlige /priser-side læser ALDRIG denne tabel direkte — kun
// via get_public_pricelist()-RPC'en (se loadPublicPriceList nedenfor).
export async function loadMaterialVisibility() {
  const { data, error } = await supabase.from("inventory").select("material_id, vis_offentligt");
  if (error) throw error;
  const map = {};
  (data || []).forEach((r) => { map[r.material_id] = !!r.vis_offentligt; });
  return map;
}
export async function setMaterialVisibility(materialId, visible) {
  const { error } = await supabase
    .from("inventory")
    .upsert({ material_id: materialId, vis_offentligt: visible, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---- Billede-URL pr. vare til den offentlige prisliste ----
// Samme "inventory"-kolonne-mønster som vis_offentligt ovenfor — se
// 7-public-pricelist-upgrade.sql. Valgfrit: en tom/ikke-sat URL betyder blot at
// /priser viser sit ikon-fallback for varen i stedet for et billede.
export async function loadMaterialImages() {
  const { data, error } = await supabase.from("inventory").select("material_id, billede_url");
  if (error) throw error;
  const map = {};
  (data || []).forEach((r) => { if (r.billede_url) map[r.material_id] = r.billede_url; });
  return map;
}
export async function setMaterialImage(materialId, url) {
  const { error } = await supabase
    .from("inventory")
    .upsert({ material_id: materialId, billede_url: url || null, updated_at: new Date().toISOString() });
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
// Sætter kassen direkte (manuel rettelse, fx startbeløb eller optælling), via
// set_cash_manual() (security definer, se 19-activity-log.sql) i stedet for en rå
// upsert — logger gammelt → nyt beløb til activity_log. De AUTOMATISKE op-/nedtællinger
// ved hver handel går fortsat via adjustCash()/adjust_cash() ovenfor, uændret og ulogget.
export async function setCash(amount) {
  const { error } = await supabase.rpc("set_cash_manual", { p_new_amount: amount });
  if (error) throw error;
}

// ---- Aktivitets-log (audit trail), KUN for ejer — se 19-activity-log.sql ----
// RLS ("owner read activity_log") begrænser SELECT til rollen "ejer"; en anden rolle
// får blot en tom liste tilbage her (RLS filtrerer rækkerne væk), ikke en fejl. Selve
// linjerne skrives UDELUKKENDE server-side, inde i de relevante security definer-
// funktioner (og Edge Function'en manage-staff) — aldrig herfra.
export async function loadActivityLog(limit = 500) {
  const { data, error } = await supabase
    .from("activity_log").select("*").order("at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

// ---- Opslagstavle (interne beskeder til medarbejderne) — se 20-bulletin-board.sql ----
// Alle indloggede kan læse (RLS: "authenticated read bulletin_posts"). Skrivning
// (oprette/slette) sker KUN via de to sikre funktioner nedenfor — rolle-tjekket
// (ejer/manager) sker i selve funktionen, ikke kun i UI'en; "bulletin_posts" har
// ingen direkte klient-skrivevej overhovedet.
export async function loadBulletinPosts(limit = 5) {
  const { data, error } = await supabase
    .from("bulletin_posts").select("*").order("at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
export async function createBulletinPost(text) {
  const { data, error } = await supabase.rpc("create_bulletin_post", { p_text: text });
  if (error) throw error;
  return data;
}
export async function deleteBulletinPost(id) {
  const { error } = await supabase.rpc("delete_bulletin_post", { p_id: id });
  if (error) throw error;
}

// ---- Leaderboard-konkurrence ----
// Indstillinger (navn/periode/aktiv) styres af ejer/manager inde i appen — se
// LeaderboardAdmin i App.jsx. RLS på "leaderboard"-tabellen tillader kun ejer/manager
// at SKRIVE (tjekket i databasen, ikke kun i UI'en), men enhver indlogget kan læse.
export async function loadLeaderboardSettings() {
  const { data, error } = await supabase.from("leaderboard").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}
export async function saveLeaderboardSettings(patch) {
  // patch: { name, start_at, end_at, active, prize_pool }
  const { error } = await supabase
    .from("leaderboard").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw error;
}
// Offentlig, read-only rangliste — bruges af den login-fri /leaderboard-side.
// Går udelukkende via get_public_leaderboard()-RPC'en (security definer i databasen),
// som KUN returnerer konkurrence-navn/-periode/præmiepulje og kunde-id + beløb —
// aldrig priser, lager, kasse eller andre kundedata. Anon har ingen direkte adgang
// til nogen tabel; kun lov til at kalde denne ene funktion. Kræver ikke login.
export async function loadPublicLeaderboard() {
  const { data, error } = await supabase.rpc("get_public_leaderboard");
  if (error) throw error;
  return data; // { active, name?, start_at?, end_at?, prize_pool?, entries?: [{ cust_id, total }] }
}

// ---- Offentlig prisliste (login-fri) ----
// Bruges af den login-fri /priser-side. Går udelukkende via get_public_pricelist()-
// RPC'en (security definer i databasen — se 6-public-pricelist.sql og
// 7-public-pricelist-upgrade.sql), som KUN returnerer varenavn, købspris, salgspris,
// en "på lager"-boolean, en valgfri billede-URL og kategori-navn for varer markeret
// "vis offentligt" — aldrig det præcise lagerantal, kassen eller andre
// tabeller/kundedata. Anon har ingen direkte adgang til nogen tabel; kun lov til at
// kalde denne ene funktion. Kræver ikke login.
export async function loadPublicPriceList() {
  const { data, error } = await supabase.rpc("get_public_pricelist");
  if (error) throw error;
  return data || []; // [{ name, price, sell, in_stock, image_url, category }]
}

// ---- Crafting-opskrifter ----
// Opskrifterne ligger i "recipes"-tabellen (se 9-crafting-recipes.sql) — IKKE
// hardcodet i koden. Materialer refererer altid til en vare via dens ID (samme
// ID som i "inventory"/config.materials), aldrig via navn — det er derfor
// UI'en (RecipeManager i App.jsx) kun lader dig VÆLGE varer fra en dropdown i
// stedet for at skrive navnet: en fejlstavning kan så aldrig knække "har jeg
// nok på lager"-tjekket. Navnet gemmes kun som et visnings-fallback, hvis
// varen senere skulle blive slettet.
function mapRecipeRow(row) {
  return {
    id: row.id,
    outputMaterialId: row.output_material_id,
    outputName: row.output_name,
    outputQty: +row.output_qty,
    cat: row.cat,
    time: +row.time_seconds,
    mats: (row.materials || []).map((m) => ({ materialId: m.material_id, name: m.name, qty: +m.qty })),
  };
}
function toRecipeRow(recipe) {
  return {
    output_material_id: recipe.outputMaterialId,
    output_name: recipe.outputName,
    output_qty: recipe.outputQty,
    cat: recipe.cat,
    time_seconds: recipe.time || 0,
    materials: recipe.mats.map((m) => ({ material_id: m.materialId, name: m.name, qty: m.qty })),
  };
}
export async function loadRecipes() {
  const { data, error } = await supabase.from("recipes").select("*").order("cat").order("output_name");
  if (error) throw error;
  return (data || []).map(mapRecipeRow);
}
export async function createRecipe(recipe) {
  const { data, error } = await supabase.from("recipes").insert(toRecipeRow(recipe)).select().single();
  if (error) throw error;
  return mapRecipeRow(data);
}
export async function updateRecipe(id, recipe) {
  const { data, error } = await supabase
    .from("recipes")
    .update({ ...toRecipeRow(recipe), updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) throw error;
  return mapRecipeRow(data);
}
export async function deleteRecipe(id) {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;
}

// ---- Vagtstempling (clock in/out) ----
// Status ligger i "shifts"-tabellen i databasen (se 14-shifts.sql), ikke kun
// lokalt i appen — den holder derfor ved genindlæsning og går igen på tværs
// af enheder. AL skrivning sker via de sikre RPC-funktioner herunder
// (clock_in/clock_out/close_shift/edit_shift — alle "security definer" med
// public/anon-adgang eksplicit fjernet i SQL'en) — aldrig direkte INSERT/
// UPDATE på tabellen, som RLS'en også ville afvise, hvis man prøvede.
function mapShiftRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.profiles?.name || "Ukendt",
    clockIn: new Date(row.clock_in).getTime(),
    clockOut: row.clock_out ? new Date(row.clock_out).getTime() : null,
  };
}
// Alle ÅBNE vagter lige nu (ingen ud-tid endnu). Bruges til BÅDE "er jeg på
// vagt selv" (find egen række på user_id) og "Hvem er på vagt nu"-listen —
// synlig for alle indloggede (RLS: "authenticated read active shifts").
export async function loadActiveShifts() {
  const { data, error } = await supabase
    .from("shifts").select("id, user_id, clock_in, clock_out, profiles(name)")
    .is("clock_out", null).order("clock_in");
  if (error) throw error;
  return (data || []).map(mapShiftRow);
}
// Fuld vagtlog (åbne OG lukkede vagter) — kun ejer/manager kan læse den
// (RLS: "manager read all shifts"); en almindelig "ansat" får blot en tom
// liste tilbage her (RLS filtrerer rækkerne væk), ikke en fejl.
export async function loadShiftLog() {
  const { data, error } = await supabase
    .from("shifts").select("id, user_id, clock_in, clock_out, profiles(name)")
    .order("clock_in", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapShiftRow);
}
// Stempler DEN INDLOGGEDE bruger ind. Databasen forhindrer dobbelt-vagt
// atomisk (unikt index på "kun én åben vagt pr. bruger") — se clock_in() i
// 14-shifts.sql.
export async function clockIn() {
  const { error } = await supabase.rpc("clock_in");
  if (error) throw error;
}
// Stempler DEN INDLOGGEDE bruger ud af sin egen åbne vagt.
export async function clockOut() {
  const { error } = await supabase.rpc("clock_out");
  if (error) throw error;
}
// Lukker en glemt vagt ved at sætte ud-tid (default: nu) — KUN ejer, tjekket
// i selve databasen (se close_shift i 14-shifts.sql), ikke kun i UI'en.
export async function closeShift(shiftId, clockOutIso) {
  const { error } = await supabase.rpc("close_shift", {
    p_shift_id: shiftId, p_clock_out: clockOutIso || new Date().toISOString(),
  });
  if (error) throw error;
}
// Retter ind- og ud-tid på en vagt — KUN ejer, tjekket i databasen.
export async function editShift(shiftId, clockInIso, clockOutIso) {
  const { error } = await supabase.rpc("edit_shift", {
    p_shift_id: shiftId, p_clock_in: clockInIso, p_clock_out: clockOutIso || null,
  });
  if (error) throw error;
}

export const supabaseReady = true;
