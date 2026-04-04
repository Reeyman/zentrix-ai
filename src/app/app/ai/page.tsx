'use client';

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import PageShell from "../_ui/PageShell";
import KpiStrip from "../_ui/KpiStrip";
import { ActionToast, Section, Card, Divider, InsightList } from "../_ui/Primitives";
import WorkflowPanel from "@/components/workflows/WorkflowPanel";
import { buildAIRecommendationWorkflow } from "@/components/workflows/workflow-presets";

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

type AIAnalysisResult = {
  recommendations: AIRecommendation[];
  model: string;
  workspaceName: string;
  mode: string;
  analysisMode: string;
  averageConfidence: number;
  usingRealAI: boolean;
  fallbackReason?: string;
};

function getAverageConfidence(recommendations: AIRecommendation[]) {
  if (!recommendations.length) {
    return 0;
  }

  const total = recommendations.reduce((sum, recommendation) => {
    const match = recommendation.confidence.match(/(\d+(?:\.\d+)?)/);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);

  return Math.round(total / recommendations.length);
}

async function getAIRecommendations(workspaceId?: string): Promise<AIAnalysisResult> {
  try {
    const response = await fetch('/api/ai/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
      },
      body: JSON.stringify({
        prompt: 'Analyze current advertising performance and provide optimization recommendations'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get AI recommendations');
    }
    
    const payload = await response.json() as {
      success?: boolean;
      error?: string;
      data?: {
        recommendations?: AIRecommendation[];
        model?: string;
        workspaceName?: string;
        mode?: string;
        analysisMode?: string;
        averageConfidence?: number;
        usingRealAI?: boolean;
        fallbackReason?: string;
      };
    };

    if (!payload.success) {
      throw new Error(payload.error || 'Failed to get AI recommendations');
    }

    const recommendations = payload.data?.recommendations ?? [];

    return {
      recommendations,
      model: payload.data?.model ?? 'heuristic-fallback',
      workspaceName: payload.data?.workspaceName ?? 'Current workspace',
      mode: payload.data?.mode ?? 'demo',
      analysisMode: payload.data?.analysisMode ?? 'fallback',
      averageConfidence: typeof payload.data?.averageConfidence === 'number'
        ? payload.data.averageConfidence
        : getAverageConfidence(recommendations),
      usingRealAI: Boolean(payload.data?.usingRealAI),
      fallbackReason: payload.data?.fallbackReason,
    };
  } catch (error) {
    console.error('AI Error:', error);
    return {
      recommendations: fallbackRecommendations,
      model: 'heuristic-fallback',
      workspaceName: 'Current workspace',
      mode: 'demo',
      analysisMode: 'fallback',
      averageConfidence: getAverageConfidence(fallbackRecommendations),
      usingRealAI: false,
      fallbackReason: error instanceof Error ? error.message : 'Failed to get AI recommendations',
    };
  }
}

const fallbackRecommendations: AIRecommendation[] = [
  {
    id: "rec-1",
    title: "Shift 12% of display spend into high-intent retargeting",
    summary: "The model sees consistent ROAS lift in high-intent search and retargeting cohorts compared with broad display audiences.",
    confidence: "92% confidence",
    impact: "+18% projected ROAS",
    risk: "Low risk",
    bucket: "high",
    bucketLabel: "High impact",
    rationale: [
      "Retargeting cohorts outperformed display by 1.4x over the last 14 days",
      "Budget saturation remains below threshold on the winning segment",
      "Creative overlap risk is currently low and frequency is stable",
    ],
  },
  {
    id: "rec-2",
    title: "Require finance review before applying invoice-related automations",
    summary: "The AI detected upcoming billing rule changes that could alter invoice routing and recommends a two-step approval path.",
    confidence: "88% confidence",
    impact: "Controls risk exposure",
    risk: "Needs review",
    bucket: "review",
    bucketLabel: "Needs review",
    rationale: [
      "Recent billing edits affected escalation paths twice this week",
      "Automation touches finance-owned approval logic",
      "Manual sign-off reduces the chance of downstream exception handling",
    ],
  },
  {
    id: "rec-3",
    title: "Watch audience decay on social prospecting clusters",
    summary: "Performance remains acceptable, but reach quality is flattening and the model predicts fatigue if frequency climbs further.",
    confidence: "81% confidence",
    impact: "Prevents efficiency drift",
    risk: "Monitor",
    bucket: "watch",
    bucketLabel: "Watchlist",
    rationale: [
      "CTR flattened across the last three delivery windows",
      "Frequency is approaching the fatigue threshold for two segments",
      "A creative refresh would likely restore engagement before CPA degradation",
    ],
  },
];

export default function AIPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [items, setItems] = useState<AIRecommendation[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState('executive');

  const averageConfidence = analysis?.averageConfidence ?? getAverageConfidence(items);
  const workspaceModeLabel = analysis ? (analysis.mode === 'connected' ? 'Connected' : 'Demo') : 'Not run';
  const aiModeLabel = analysis ? (analysis.analysisMode === 'live' ? 'Live AI' : 'Fallback AI') : 'Idle';
  const modelLabel = analysis?.model ?? 'Not run';
  const statusValue = analysis ? (analysis.fallbackReason ? 'Attention' : 'Ready') : 'Idle';

  const kpis = [
    { label: "AI Recommendations", value: items.length.toString(), delta: isLoading ? "Loading..." : aiModeLabel },
    { label: "Workspace Mode", value: workspaceModeLabel, delta: analysis?.workspaceName ?? "Awaiting analysis" },
    { label: "Confidence", value: `${averageConfidence}%`, delta: analysis?.usingRealAI ? "live available" : "fallback active" },
    { label: "Model", value: modelLabel, delta: analysis?.usingRealAI ? "available" : analysis ? "stable" : "Awaiting run" },
    { label: "Status", value: statusValue, delta: analysis?.fallbackReason ? "warning" : analysis ? "stable" : "Awaiting run" },
  ];

  async function loadRecommendations() {
    setIsLoading(true);
    try {
      const nextAnalysis = await getAIRecommendations(workspaceId);
      setItems(nextAnalysis.recommendations);
      setAnalysis(nextAnalysis);
      setToastMessage(nextAnalysis.usingRealAI ? 'AI analysis completed with live OpenAI recommendations' : 'AI analysis completed using fallback recommendations');
    } catch (error) {
      setToastMessage('Failed to load AI recommendations');
      setItems(fallbackRecommendations);
      setAnalysis({
        recommendations: fallbackRecommendations,
        model: 'heuristic-fallback',
        workspaceName: 'Current workspace',
        mode: 'demo',
        analysisMode: 'fallback',
        averageConfidence: getAverageConfidence(fallbackRecommendations),
        usingRealAI: false,
        fallbackReason: error instanceof Error ? error.message : 'Failed to load AI recommendations',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleDismiss(id: string, title: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setToastMessage(`${title} was dismissed from the active AI queue.`);
  }

  return (
    <>
      <PageShell
        title="AI Center"
        subtitle="Machine learning insights, explainable recommendations, and governed activation"
        actions={<button className="btn" onClick={() => loadRecommendations()} disabled={isLoading}>
          {isLoading ? "Analyzing..." : "Run Analysis"}
        </button>}
        toolbar={(
          <>
            <div className="page-toolbar-group">
              <select 
                className="input topbar-select topbar-control-range"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
              >
                <option value="executive">Executive view</option>
                <option value="ops">Ops view</option>
                <option value="governance">Governance view</option>
              </select>
              <span className="toolbar-pill">{items.length} active recommendations</span>
              <span className="toolbar-pill">{workspaceModeLabel} workspace</span>
            </div>
            <div className="page-toolbar-meta">
              <span className="toolbar-pill">{analysis?.workspaceName ?? 'Workspace pending'}</span>
              <span className="toolbar-pill">{averageConfidence}% avg confidence</span>
              <span className="toolbar-pill">{aiModeLabel}</span>
              <span className="toolbar-pill">{modelLabel}</span>
            </div>
          </>
        )}
      >
        <Section>
          <KpiStrip items={kpis} />
        </Section>

        <Divider />

        <Section title="Workflow guidance">
          <WorkflowPanel
            {...buildAIRecommendationWorkflow({
              itemCount: items.length,
              averageConfidence,
              usingRealAI: Boolean(analysis?.usingRealAI),
              modelLabel,
              workspaceName: analysis?.workspaceName ?? "",
            })}
          />
        </Section>

        <Divider />

        <Section title="Model performance">
          <div className="grid-2">
            <Card title="Model performance">
              <InsightList
                items={[
                  `Workspace: ${analysis?.workspaceName ?? 'Run analysis to resolve workspace context'}`,
                  `Workspace mode: ${workspaceModeLabel}`,
                  `AI path: ${analysis ? (analysis.analysisMode === 'live' ? 'Live OpenAI model' : 'Heuristic fallback model') : 'Awaiting analysis run'}`,
                  `Serving model: ${modelLabel}`,
                ]}
              />
            </Card>
            <Card title="Impact metrics">
              <InsightList
                items={[
                  `Average confidence across active recommendations is ${averageConfidence}%`,
                  `${items.length} recommendations are currently queued for review or activation`,
                  analysis?.usingRealAI ? 'Live AI is currently serving model-backed recommendations' : 'Fallback analysis is active while live AI is unavailable',
                  analysis?.fallbackReason ? `Fallback reason: ${analysis.fallbackReason}` : 'No fallback condition detected in the latest run',
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Priority buckets">
          <div className="grid-2">
            <Card title="High impact">
              <InsightList
                items={[
                  "Budget shifts with immediate efficiency upside",
                  "Low-risk actions that do not require cross-functional review",
                  "Recommended for this sprint's performance window",
                ]}
              />
            </Card>
            <Card title="Needs review">
              <InsightList
                items={[
                  "Changes affecting billing, access, or approval workflows",
                  "Actions that need finance, security, or ops sign-off",
                  "Best routed through a governed activation path",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Recommendation queue">
          <div className="recommendation-grid">
            {items && items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="recommendation-card">
                  <div className="recommendation-head">
                    <div>
                      <span className={`priority-pill priority-pill-${item.bucket}`}>{item.bucketLabel}</span>
                      <h3 className="recommendation-title">{item.title}</h3>
                    </div>
                  </div>

                  <p className="recommendation-copy">{item.summary}</p>

                  <div className="recommendation-meta">
                    <span className="toolbar-pill">{item.confidence}</span>
                    <span className="toolbar-pill">{item.impact}</span>
                    <span className="toolbar-pill">{item.risk}</span>
                  </div>

                  <div className="detail-block" style={{ marginTop: 16 }}>
                    <div className="detail-block-title">Why the model recommends this</div>
                    <InsightList items={item.rationale} />
                  </div>

                  <div className="recommendation-actions" style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginTop: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ 
                        background: '#3b82f6', 
                        color: 'white', 
                        padding: '8px 16px', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => setToastMessage(`${item.title} was applied to the activation queue.`)}
                    >
                      Apply recommendation
                    </button>
                    <button 
                      className="btn" 
                      style={{ 
                        background: '#6b7280', 
                        color: 'white', 
                        padding: '8px 16px', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => setToastMessage(`${item.title} was sent for stakeholder review.`)}
                    >
                      Send to review
                    </button>
                    <button 
                      className="btn" 
                      style={{ 
                        background: '#6b7280', 
                        color: 'white', 
                        padding: '8px 16px', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => setToastMessage(`Rationale export prepared for ${item.title}.`)}
                    >
                      Export rationale
                    </button>
                    <button 
                      className="btn" 
                      style={{ 
                        background: '#ef4444', 
                        color: 'white', 
                        padding: '8px 16px', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                       onClick={() => handleDismiss(item.id, item.title)}
                     >
                       Dismiss
                     </button>
                   </div>

                  </div>
                ))
              ) : (
                <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  No recommendations available. Click &quot;Run Analysis&quot; to generate AI recommendations.
                </div>
              )}
            </div>
          </Section>
        </PageShell>

        <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
      </>
    );
  }
