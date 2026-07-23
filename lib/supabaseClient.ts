import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";
import { DEMO, demoClient, demoProfileFor, getDemoRole } from "./demo";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// True when real Supabase credentials are provided via env vars (always true in
// dev demo mode, which uses an in-memory stand-in instead of a real backend).
export const configured =
  DEMO || (!!url && !!anon && !url.includes("YOUR-PROJECT") && !anon.includes("YOUR-ANON"));

// The browser client. In demo mode this is a tiny in-memory stand-in so the real
// pages render sample data with no login. Null when not configured.
export const supabase: SupabaseClient | null = DEMO
  ? (demoClient as SupabaseClient)
  : configured
  ? createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function homeFor(role: string | undefined | null): string {
  if (role === "student") return "/student";
  if (role === "teacher") return "/teacher";
  return "/advisor";
}

export async function getMyProfile(): Promise<Profile | null> {
  if (DEMO) return demoProfileFor(getDemoRole());
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  if (!u || !u.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (error) {
    console.error("getMyProfile", error);
    return null;
  }
  return (data as Profile) || null;
}
