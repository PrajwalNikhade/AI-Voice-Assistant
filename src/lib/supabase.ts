import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith("https://") &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 10
  );
}

// Client-safe Supabase instance (browser or server)
export const supabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

// Server-side privileged Supabase instance (server only)
export function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;
  const keyToUse = supabaseServiceKey || supabaseAnonKey;
  return createClient(supabaseUrl, keyToUse, {
    auth: { persistSession: false },
  });
}
