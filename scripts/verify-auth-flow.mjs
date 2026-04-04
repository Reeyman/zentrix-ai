const baseUrl = (process.env.APP_BASE_URL ?? 'http://localhost:3000').trim().replace(/\/$/, '')
const email = process.env.AUTH_VERIFY_EMAIL?.trim() ?? ''
const password = process.env.AUTH_VERIFY_PASSWORD?.trim() ?? ''

function withTimestamp(path) {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}ts=${Date.now()}`
}

async function request(path, init = {}) {
  return fetch(`${baseUrl}${withTimestamp(path)}`, {
    redirect: 'manual',
    ...init,
    headers: {
      'Cache-Control': 'no-cache',
      ...(init.headers ?? {}),
    },
  })
}

async function readJson(response) {
  const text = await response.text()

  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

function fail(message, details) {
  const error = new Error(message)
  error.details = details
  throw error
}

function extractCookieHeader(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers)
  const cookieValues = typeof getSetCookie === 'function'
    ? getSetCookie()
    : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : [])

  return cookieValues
    .filter(Boolean)
    .map((value) => value.split(';', 1)[0])
    .join('; ')
}

async function main() {
  const apiWorkspaceResponse = await request('/api/workspace')
  const apiWorkspacePayload = await readJson(apiWorkspaceResponse)

  if (apiWorkspaceResponse.status !== 401) {
    fail('Unauthenticated workspace API should return 401.', {
      status: apiWorkspaceResponse.status,
      body: apiWorkspacePayload,
    })
  }

  const appOverviewResponse = await request('/app/overview')
  const loginLocation = appOverviewResponse.headers.get('location') ?? ''

  if (appOverviewResponse.status < 300 || appOverviewResponse.status >= 400 || !loginLocation.startsWith('/login')) {
    fail('Unauthenticated app overview should redirect to /login.', {
      status: appOverviewResponse.status,
      location: loginLocation,
    })
  }

  const summary = {
    baseUrl,
    unauthenticatedApiStatus: apiWorkspaceResponse.status,
    unauthenticatedAppRedirect: loginLocation,
  }

  if (!email || !password) {
    console.log(JSON.stringify({
      ...summary,
      authenticatedVerification: 'skipped',
      reason: 'Set AUTH_VERIFY_EMAIL and AUTH_VERIFY_PASSWORD to verify the authenticated flow.',
    }, null, 2))
    console.log('Auth smoke test passed for unauthenticated protection.')
    return
  }

  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const loginPayload = await readJson(loginResponse)

  if (!loginResponse.ok || !loginPayload?.success) {
    fail('Authenticated login verification failed.', {
      status: loginResponse.status,
      body: loginPayload,
    })
  }

  const cookieHeader = extractCookieHeader(loginResponse)

  if (!cookieHeader) {
    fail('Login verification did not return session cookies.')
  }

  const authenticatedWorkspaceResponse = await request('/api/workspace', {
    headers: {
      Cookie: cookieHeader,
    },
  })
  const authenticatedWorkspacePayload = await readJson(authenticatedWorkspaceResponse)

  if (!authenticatedWorkspaceResponse.ok || !authenticatedWorkspacePayload?.success) {
    fail('Authenticated workspace verification failed.', {
      status: authenticatedWorkspaceResponse.status,
      body: authenticatedWorkspacePayload,
    })
  }

  console.log(JSON.stringify({
    ...summary,
    authenticatedVerification: 'passed',
    workspaceMode: authenticatedWorkspacePayload.data?.mode ?? null,
    currentWorkspace: authenticatedWorkspacePayload.data?.currentWorkspace?.name ?? null,
    currentUser: authenticatedWorkspacePayload.data?.currentUser?.email ?? null,
  }, null, 2))
  console.log('Auth smoke test passed.')
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Auth smoke test failed.')

  if (error && typeof error === 'object' && 'details' in error && error.details) {
    console.error(JSON.stringify(error.details, null, 2))
  }

  process.exitCode = 1
}
