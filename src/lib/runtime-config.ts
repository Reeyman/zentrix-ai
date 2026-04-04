const SUPABASE_URL_PLACEHOLDERS = [
  'your-project-id.supabase.co',
  'demo.supabase.co',
  'xjgkzlmvqzjxabcde.supabase.co',
]

const SUPABASE_KEY_PLACEHOLDERS = [
  'your-anon-key-here',
  'your-service-role-key-here',
  'demo-key',
]

const OPENAI_KEY_PLACEHOLDERS = [
  'your-openai-api-key-here',
  'paste-your-real-openai-api-key-here',
]

function normalizeEnvValue(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function containsPlaceholder(value: string, placeholders: string[]) {
  const normalized = value.toLowerCase()
  return placeholders.some((placeholder) => normalized.includes(placeholder.toLowerCase()))
}

export function getSupabaseBrowserConfig() {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!url || !anonKey) {
    return null
  }

  if (containsPlaceholder(url, SUPABASE_URL_PLACEHOLDERS) || containsPlaceholder(anonKey, SUPABASE_KEY_PLACEHOLDERS)) {
    return null
  }

  return { url, anonKey }
}

export function getSupabaseAdminConfig() {
  const browserConfig = getSupabaseBrowserConfig()
  const serviceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!browserConfig || !serviceRoleKey) {
    return null
  }

  if (containsPlaceholder(serviceRoleKey, SUPABASE_KEY_PLACEHOLDERS)) {
    return null
  }

  return {
    ...browserConfig,
    serviceRoleKey,
  }
}

export function hasSupabaseBrowserConfig() {
  return Boolean(getSupabaseBrowserConfig())
}

export function hasSupabaseAdminConfig() {
  return Boolean(getSupabaseAdminConfig())
}

export function getOpenAIConfig() {
  const apiKey = normalizeEnvValue(process.env.OPENAI_API_KEY)

  if (!apiKey || containsPlaceholder(apiKey, OPENAI_KEY_PLACEHOLDERS) || !apiKey.startsWith('sk-')) {
    return null
  }

  return {
    apiKey,
    model: normalizeEnvValue(process.env.OPENAI_MODEL) ?? 'gpt-4o-mini',
  }
}

export function hasOpenAIConfig() {
  return Boolean(getOpenAIConfig())
}
