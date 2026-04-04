import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { getSupabaseBrowserConfig } from "@/lib/runtime-config";

export function createSupabaseMiddlewareClient(request: NextRequest) {
  const config = getSupabaseBrowserConfig();

  if (!config) {
    throw new Error("Supabase browser configuration is missing or invalid");
  }

  return createClient(
    config.url,
    config.anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
