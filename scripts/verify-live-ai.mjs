import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);

  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env.local');

const baseUrl = (process.env.APP_BASE_URL ?? 'http://localhost:3000').trim().replace(/\/$/, '');
const prompt = (process.env.AI_VERIFY_PROMPT ?? 'Analyze current workspace performance and provide recommendations').trim();
const email = process.env.AUTH_VERIFY_EMAIL?.trim() ?? '';
const password = process.env.AUTH_VERIFY_PASSWORD?.trim() ?? '';
const autoSignup = /^(1|true)$/i.test(process.env.AUTH_VERIFY_AUTO_SIGNUP ?? '');

function withTimestamp(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}ts=${Date.now()}`;
}

async function requestJson(path, init = {}, cookieHeader = '') {
  const response = await fetch(`${baseUrl}${withTimestamp(path)}`, {
    ...init,
    headers: {
      'Cache-Control': 'no-cache',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return { response, text, data };
}

function fail(message, details) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function extractCookieHeader(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const cookieValues = typeof getSetCookie === 'function'
    ? getSetCookie()
    : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);

  return cookieValues
    .filter(Boolean)
    .map((value) => value.split(';', 1)[0])
    .join('; ');
}

function createAutoSignupCredentials() {
  const uniquePart = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  return {
    email: `liveai${uniquePart}@gmail.com`,
    password: `Verify-${uniquePart}-Aa1!`,
  };
}

function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

async function createConfirmedAutoSignupCredentials() {
  const credentials = createAutoSignupCredentials();
  const supabaseAdminConfig = getSupabaseAdminConfig();

  if (!supabaseAdminConfig) {
    fail('Live AI auto-signup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment or .env.local.');
  }

  const supabase = createClient(supabaseAdminConfig.url, supabaseAdminConfig.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabase.auth.admin.createUser({
    email: credentials.email,
    password: credentials.password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Live AI Verifier',
    },
  });

  if (error) {
    fail('Live AI verification admin user creation failed.', {
      status: error.status ?? null,
      body: error.message,
    });
  }

  return credentials;
}

async function loginWithCredentials(credentials) {
  const loginResult = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!loginResult.response.ok || !loginResult.data?.success) {
    fail('Live AI verification login failed.', {
      status: loginResult.response.status,
      body: loginResult.data ?? loginResult.text,
    });
  }

  const cookieHeader = extractCookieHeader(loginResult.response);

  if (!cookieHeader) {
    fail('Live AI verification login did not return session cookies.');
  }

  return cookieHeader;
}

async function loginAndGetCookieHeader() {
  if (!email || !password) {
    if (autoSignup) {
      const credentials = await createConfirmedAutoSignupCredentials();
      return loginWithCredentials(credentials);
    }

    return '';
  }

  return loginWithCredentials({ email, password });
}

async function main() {
  const cookieHeader = await loginAndGetCookieHeader();
  const workspaceResult = await requestJson('/api/workspace', {}, cookieHeader);

  if (workspaceResult.response.status === 401 && !cookieHeader) {
    fail('Authentication is required for live AI verification. Set AUTH_VERIFY_EMAIL and AUTH_VERIFY_PASSWORD, or rerun with AUTH_VERIFY_AUTO_SIGNUP=true.');
  }

  if (!workspaceResult.response.ok || !workspaceResult.data?.success) {
    fail('Workspace verification failed.', {
      status: workspaceResult.response.status,
      body: workspaceResult.data ?? workspaceResult.text,
    });
  }

  const workspacePayload = workspaceResult.data.data;
  const workspaceId = workspacePayload?.currentWorkspace?.id;
  const workspaceName = workspacePayload?.currentWorkspace?.name;

  if (!workspaceId || !workspaceName) {
    fail('Workspace payload is missing the current workspace.', workspacePayload);
  }

  if (workspacePayload.mode !== 'connected') {
    fail('Workspace is not in connected mode.', {
      mode: workspacePayload.mode,
      workspace: workspacePayload.currentWorkspace,
    });
  }

  const overviewResult = await requestJson('/api/overview', {
    headers: {
      'x-workspace-id': workspaceId,
    },
  }, cookieHeader);

  if (!overviewResult.response.ok || !overviewResult.data?.success) {
    fail('Overview verification failed.', {
      status: overviewResult.response.status,
      body: overviewResult.data ?? overviewResult.text,
    });
  }

  const aiResult = await requestJson('/api/ai/recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-workspace-id': workspaceId,
    },
    body: JSON.stringify({
      prompt,
      workspaceId,
    }),
  }, cookieHeader);

  if (!aiResult.response.ok || !aiResult.data?.success) {
    fail('AI verification request failed.', {
      status: aiResult.response.status,
      body: aiResult.data ?? aiResult.text,
    });
  }

  const aiPayload = aiResult.data.data;
  const summary = {
    baseUrl,
    workspaceId,
    workspaceName,
    workspaceMode: workspacePayload.mode,
    currentUser: workspacePayload.currentUser?.email ?? null,
    overviewUserCount: Array.isArray(overviewResult.data.data?.users) ? overviewResult.data.data.users.length : 0,
    overviewCampaignCount: Array.isArray(overviewResult.data.data?.campaigns) ? overviewResult.data.data.campaigns.length : 0,
    analysisMode: aiPayload?.analysisMode ?? null,
    usingRealAI: aiPayload?.usingRealAI ?? null,
    model: aiPayload?.model ?? null,
    recommendationCount: Array.isArray(aiPayload?.recommendations) ? aiPayload.recommendations.length : 0,
    averageConfidence: aiPayload?.averageConfidence ?? null,
    fallbackReason: aiPayload?.fallbackReason ?? null,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (aiPayload?.analysisMode !== 'live' || aiPayload?.usingRealAI !== true || aiPayload?.model === 'heuristic-fallback') {
    fail('Live AI verification failed. The application is still using fallback analysis.', summary);
  }

  console.log('Live AI verification passed.');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Live AI verification failed.');

  if (error && typeof error === 'object' && 'details' in error && error.details) {
    console.error(JSON.stringify(error.details, null, 2));
  }

  process.exitCode = 1;
}
