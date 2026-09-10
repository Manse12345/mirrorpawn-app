// ============================================================
//  MIRROR PAWN — Supabase-klient (login + database)
//  Sæt dine to offentlige værdier her (fra Supabase →
//  Project Settings → API):
// ============================================================
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://pfjsxrexbxbhzqvuolwj.supabase.co";
const SUPABASE_ANON = "sb_publishable_OFx0Ekrn6CJ33jHjmcDXeQ_WXeOvMNW";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
