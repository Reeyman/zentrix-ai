import { createClient } from "@supabase/supabase-js"

import { getSupabaseBrowserConfig } from "@/lib/runtime-config"

const supabaseConfig = getSupabaseBrowserConfig()

export const supabase = supabaseConfig
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null
