import { NextRequest, NextResponse } from "next/server";
import { createInternalApiErrorResponse } from '@/lib/api-utils'
import { getAnalyticsSnapshot, getWorkspaceIdFromHeaders, listWorkspaceBilling, listWorkspaceIntegrations } from "@/lib/server-app-data";
import { getOpenAIConfig } from "@/lib/runtime-config";

type AIRecommendation = {
  id: string;
  title: string;
  summary: string;
  confidence: string;
  impact: string;
  risk: string;
  bucket: string;
  bucketLabel: string;
  rationale: string[];
};

const bucketLabels: Record<string, string> = {
  high: 'High impact',
  medium: 'Medium impact',
  low: 'Low impact',
  watch: 'Watchlist',
  review: 'Needs review',
};

function normalizePrompt(value: unknown) {
  if (typeof value !== 'string') {
    return 'Analyze current advertising performance and provide optimization recommendations';
  }

  const trimmed = value.trim();
  return trimmed || 'Analyze current advertising performance and provide optimization recommendations';
}

function extractPercentLabel(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function buildFallbackRecommendations(input: {
  workspaceName: string;
  campaigns: Array<{
    id: string;
    name: string;
    channel: string;
    status: string;
    spend: number;
    budget: number;
    roas: number;
    budgetUtilization: number;
  }>;
  integrations: Array<{ name: string; status: string }>;
  invoices: Array<{ id: string; status: string; due: string }>;
}): AIRecommendation[] {
  const activeCampaigns = input.campaigns.filter((campaign) => campaign.status === 'active');
  const highestRoas = [...activeCampaigns].sort((left, right) => right.roas - left.roas)[0];
  const lowestRoas = [...activeCampaigns].sort((left, right) => left.roas - right.roas)[0];
  const warningIntegrations = input.integrations.filter((integration) => integration.status === 'Warning');
  const unpaidInvoices = input.invoices.filter((invoice) => invoice.status !== 'Paid');

  const recommendations: AIRecommendation[] = [];

  if (highestRoas) {
    recommendations.push({
      id: `ai-${highestRoas.id}`,
      title: `Scale ${highestRoas.name}`,
      summary: `${highestRoas.name} is the strongest active campaign in ${input.workspaceName}. Reallocating incremental budget toward this ${highestRoas.channel.toLowerCase()} motion should improve blended efficiency.`,
      confidence: `${Math.max(82, Math.round(highestRoas.roas * 18))}% confidence`,
      impact: `+${Math.max(8, Math.round(highestRoas.roas * 4))}% projected ROAS`,
      risk: 'Low risk',
      bucket: 'high',
      bucketLabel: bucketLabels.high,
      rationale: [
        `${highestRoas.name} is currently delivering ${highestRoas.roas.toFixed(1)}x ROAS`,
        `Budget utilization is ${highestRoas.budgetUtilization}% against the allocated cap`,
        `The campaign is already active, so scaling does not require a new launch cycle`,
      ],
    });
  }

  if (lowestRoas && lowestRoas.id !== highestRoas?.id) {
    recommendations.push({
      id: `ai-watch-${lowestRoas.id}`,
      title: `Audit ${lowestRoas.name}`,
      summary: `${lowestRoas.name} is the weakest active campaign in the current portfolio. Review targeting, creative freshness, and budget pacing before further spend is committed.`,
      confidence: `${Math.max(76, 90 - Math.round(lowestRoas.roas * 5))}% confidence`,
      impact: 'Protects blended efficiency',
      risk: 'Needs review',
      bucket: 'review',
      bucketLabel: bucketLabels.review,
      rationale: [
        `${lowestRoas.name} is delivering ${lowestRoas.roas.toFixed(1)}x ROAS with ${lowestRoas.budgetUtilization}% budget utilization`,
        `The campaign remains active, so underperformance can continue compounding without intervention`,
        `A focused review can determine whether to refresh creative, narrow audiences, or pause spend`,
      ],
    });
  }

  if (warningIntegrations.length) {
    recommendations.push({
      id: 'ai-integrations-review',
      title: 'Stabilize warning integrations',
      summary: `${warningIntegrations.length} integrations are reporting warning status. Resolve connector health before relying on automated optimizations that depend on fresh data.`,
      confidence: '84% confidence',
      impact: 'Protects data quality',
      risk: 'Needs review',
      bucket: 'review',
      bucketLabel: bucketLabels.review,
      rationale: [
        `${warningIntegrations.map((integration) => integration.name).join(', ')} require follow-up`,
        'Recommendation quality drops when connector syncs are stale or degraded',
        'Clearing integration warnings reduces the risk of acting on incomplete signals',
      ],
    });
  }

  if (unpaidInvoices.length) {
    recommendations.push({
      id: 'ai-billing-control',
      title: 'Review pending billing items before automation changes',
      summary: `${unpaidInvoices.length} invoices still need attention. Keep finance in the loop before activating spend changes that could alter invoice timing or approval routing.`,
      confidence: '80% confidence',
      impact: 'Controls operational risk',
      risk: 'Monitor',
      bucket: 'watch',
      bucketLabel: bucketLabels.watch,
      rationale: [
        `${unpaidInvoices[0]?.id ?? 'At least one invoice'} remains unresolved`,
        'Budget shifts can change billing expectations and approval timing',
        'Reviewing finance exposure first reduces the chance of downstream exceptions',
      ],
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: 'ai-baseline',
      title: `Maintain the current ${input.workspaceName} baseline`,
      summary: 'No urgent anomalies were detected in the available workspace signals. Continue monitoring delivery, connector health, and billing posture while collecting more data.',
      confidence: '74% confidence',
      impact: 'Keeps the workspace stable',
      risk: 'Low risk',
      bucket: 'low',
      bucketLabel: bucketLabels.low,
      rationale: [
        'No active campaign stands out as critically underperforming',
        'No connector or billing alerts were strong enough to force intervention',
        'Additional signal volume will improve the next recommendation cycle',
      ],
    });
  }

  return recommendations.slice(0, 4);
}

function buildAnalysisContext(input: {
  workspaceName: string;
  mode: string;
  campaigns: Array<{
    id: string;
    name: string;
    channel: string;
    status: string;
    spend: number;
    budget: number;
    roas: number;
    budgetUtilization: number;
  }>;
  channels: Array<{
    channel: string;
    campaigns: number;
    activeCampaigns: number;
    spend: number;
    budget: number;
    roas: number;
  }>;
  openAuditItems: number;
  warningIntegrations: string[];
  unpaidInvoices: string[];
}) {
  return JSON.stringify(input, null, 2);
}

function extractJsonPayload(content: string) {
  const candidates = [content.trim()];
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(content.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return JSON.parse(candidate);
    } catch {
    }
  }

  return null;
}

function normalizeRecommendations(payload: unknown, fallbackRecommendations: AIRecommendation[]) {
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { recommendations?: unknown[] } | null)?.recommendations)
      ? ((payload as { recommendations: unknown[] }).recommendations)
      : [];

  const normalized = rawItems
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      const title = typeof record?.title === 'string' ? record.title.trim() : '';
      const summary = typeof record?.summary === 'string' ? record.summary.trim() : '';
      if (!title || !summary) {
        return null;
      }

      const bucket = typeof record.bucket === 'string' && bucketLabels[record.bucket]
        ? record.bucket
        : 'review';
      const rationale = Array.isArray(record.rationale)
        ? record.rationale.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 4)
        : [];
      const confidence = typeof record.confidence === 'number'
        ? `${Math.round(record.confidence * 100)}% confidence`
        : typeof record.confidence === 'string'
          ? record.confidence
          : `${Math.max(70, 85 - index * 3)}% confidence`;

      return {
        id: typeof record.id === 'string' ? record.id : `ai-live-${index + 1}`,
        title,
        summary,
        confidence,
        impact: typeof record.impact === 'string' ? record.impact : 'Improves portfolio efficiency',
        risk: typeof record.risk === 'string' ? record.risk : 'Needs review',
        bucket,
        bucketLabel: typeof record.bucketLabel === 'string' ? record.bucketLabel : bucketLabels[bucket],
        rationale: rationale.length ? rationale : ['The model detected a signal pattern that warrants follow-up.'],
      } satisfies AIRecommendation;
    })
    .filter((item): item is AIRecommendation => Boolean(item));

  return normalized.length ? normalized.slice(0, 4) : fallbackRecommendations;
}

function getSafeOpenAIRequestFailureReason(status: number, responseText: string) {
  const normalizedText = responseText.toLowerCase()

  if (status === 401 || status === 403) {
    return 'The configured OpenAI credentials were rejected.'
  }

  if (status === 429 || normalizedText.includes('insufficient_quota') || normalizedText.includes('quota')) {
    return 'OpenAI billing or quota is unavailable for the configured account.'
  }

  if (status >= 500) {
    return 'The OpenAI service is temporarily unavailable.'
  }

  return 'The OpenAI request failed.'
}

function getSafeOpenAIFallbackReason(error: unknown) {
  if (!(error instanceof Error)) {
    return 'The AI model could not be reached.'
  }

  const message = error.message

  if (message === 'OpenAI API key is not configured') {
    return message
  }

  if (
    message === 'The configured OpenAI credentials were rejected.'
    || message === 'OpenAI billing or quota is unavailable for the configured account.'
    || message === 'The OpenAI service is temporarily unavailable.'
    || message === 'The OpenAI request failed.'
  ) {
    return message
  }

  if (message === 'No content was returned from OpenAI' || message === 'The OpenAI response could not be parsed as JSON') {
    return 'The OpenAI model returned an invalid response.'
  }

  return 'The AI model could not be reached.'
}

async function generateOpenAIRecommendations(input: {
  prompt: string;
  analysisContext: string;
  fallbackRecommendations: AIRecommendation[];
}) {
  const openAIConfig = getOpenAIConfig();

  if (!openAIConfig) {
    throw new Error('OpenAI API key is not configured');
  }

  const systemPrompt = `You are an expert advertising AI assistant. Analyze the advertising performance data and provide actionable recommendations.

Return a JSON object with a single top-level key named "recommendations".

Each recommendation must contain:
- id
- title
- summary
- confidence
- impact
- risk
- bucket
- bucketLabel
- rationale

Focus on:
- Budget optimization
- Creative performance
- Audience targeting
- Channel mix
- ROAS improvement
- Risk management

Be specific, data-driven, and actionable.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAIConfig.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `User request: ${input.prompt}\n\nWorkspace context:\n${input.analysisContext}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1400,
    }),
  });

  if (!response.ok) {
    throw new Error(getSafeOpenAIRequestFailureReason(response.status, await response.text()));
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    throw new Error('No content was returned from OpenAI');
  }

  const parsed = extractJsonPayload(content);
  if (!parsed) {
    throw new Error('The OpenAI response could not be parsed as JSON');
  }

  return {
    model: openAIConfig.model,
    recommendations: normalizeRecommendations(parsed, input.fallbackRecommendations),
  };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { prompt?: unknown; workspaceId?: unknown };
    const workspaceId = getWorkspaceIdFromHeaders(
      request.headers.get('x-workspace-id') ?? (typeof body.workspaceId === 'string' ? body.workspaceId : undefined),
    );
    const prompt = normalizePrompt(body.prompt);

    const [analyticsPayload, integrationsPayload, billingPayload] = await Promise.all([
      getAnalyticsSnapshot(workspaceId),
      listWorkspaceIntegrations(workspaceId),
      listWorkspaceBilling(workspaceId),
    ]);

    const fallbackRecommendations = buildFallbackRecommendations({
      workspaceName: analyticsPayload.currentWorkspace.name,
      campaigns: analyticsPayload.campaignPerformance.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        spend: campaign.spend,
        budget: campaign.budget,
        roas: campaign.roas,
        budgetUtilization: campaign.budgetUtilization,
      })),
      integrations: integrationsPayload.integrations.map((integration) => ({
        name: integration.name,
        status: integration.status,
      })),
      invoices: billingPayload.invoices.map((invoice) => ({
        id: invoice.id,
        status: invoice.status,
        due: invoice.due,
      })),
    });

    const analysisContext = buildAnalysisContext({
      workspaceName: analyticsPayload.currentWorkspace.name,
      mode: analyticsPayload.mode,
      campaigns: analyticsPayload.campaignPerformance.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        spend: campaign.spend,
        budget: campaign.budget,
        roas: campaign.roas,
        budgetUtilization: campaign.budgetUtilization,
      })),
      channels: analyticsPayload.channelPerformance.map((channel) => ({
        channel: channel.channel,
        campaigns: channel.campaigns,
        activeCampaigns: channel.activeCampaigns,
        spend: channel.spend,
        budget: channel.budget,
        roas: channel.roas,
      })),
      openAuditItems: analyticsPayload.events.filter((event) => event.result.toLowerCase() === 'open').length,
      warningIntegrations: integrationsPayload.integrations
        .filter((integration) => integration.status === 'Warning')
        .map((integration) => integration.name),
      unpaidInvoices: billingPayload.invoices
        .filter((invoice) => invoice.status !== 'Paid')
        .map((invoice) => `${invoice.id} (${invoice.due})`),
    });

    let recommendations = fallbackRecommendations;
    let model = 'heuristic-fallback';
    let usingRealAI = false;
    let fallbackReason: string | undefined;

    try {
      const result = await generateOpenAIRecommendations({
        prompt,
        analysisContext,
        fallbackRecommendations,
      });
      recommendations = result.recommendations;
      model = result.model;
      usingRealAI = true;
    } catch (error) {
      fallbackReason = getSafeOpenAIFallbackReason(error);
    }

    const averageConfidence = recommendations.length
      ? Math.round(recommendations.reduce((sum, recommendation) => sum + extractPercentLabel(recommendation.confidence), 0) / recommendations.length)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        timestamp: new Date().toISOString(),
        model,
        workspaceId: analyticsPayload.currentWorkspace.id,
        workspaceName: analyticsPayload.currentWorkspace.name,
        usingRealAI,
        mode: analyticsPayload.mode,
        analysisMode: usingRealAI ? 'live' : 'fallback',
        averageConfidence,
        fallbackReason,
      }
    });
  } catch (error: any) {
    return createInternalApiErrorResponse(error, 'Failed to generate AI recommendations')
  }
}
