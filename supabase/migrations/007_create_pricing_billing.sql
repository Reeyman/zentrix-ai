CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  monthly_price_cents BIGINT,
  yearly_price_cents BIGINT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  trial_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
  feature_key TEXT NOT NULL,
  feature_value_json JSONB NOT NULL DEFAULT 'null'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  plan_id UUID REFERENCES plans(id) ON DELETE RESTRICT NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused')),
  trial_start_at TIMESTAMP WITH TIME ZONE,
  trial_end_at TIMESTAMP WITH TIME ZONE,
  current_period_start_at TIMESTAMP WITH TIME ZONE,
  current_period_end_at TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider_event_id TEXT,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider_invoice_id TEXT,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  invoice_url TEXT,
  hosted_invoice_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  metric_key TEXT NOT NULL,
  quantity BIGINT NOT NULL DEFAULT 0,
  period_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source TEXT NOT NULL DEFAULT 'app',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  feature_key TEXT NOT NULL,
  feature_value_json JSONB NOT NULL DEFAULT 'null'::jsonb,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS billing_customer_id TEXT;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS current_subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);
CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON plans(sort_order);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON plan_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_events_workspace_id ON billing_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription_id ON billing_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_workspace_id ON usage_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_metric_key ON usage_records(metric_key);
CREATE INDEX IF NOT EXISTS idx_feature_overrides_workspace_id ON feature_overrides(workspace_id);
CREATE INDEX IF NOT EXISTS idx_feature_overrides_feature_key ON feature_overrides(feature_key);
CREATE INDEX IF NOT EXISTS idx_organizations_plan_id ON organizations(plan_id);
CREATE INDEX IF NOT EXISTS idx_organizations_current_subscription_id ON organizations(current_subscription_id);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_select_policy ON plans;
CREATE POLICY plans_select_policy ON plans
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS plan_features_select_policy ON plan_features;
CREATE POLICY plan_features_select_policy ON plan_features
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS subscriptions_select_policy ON subscriptions;
CREATE POLICY subscriptions_select_policy ON subscriptions
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS subscriptions_insert_policy ON subscriptions;
CREATE POLICY subscriptions_insert_policy ON subscriptions
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS subscriptions_update_policy ON subscriptions;
CREATE POLICY subscriptions_update_policy ON subscriptions
  FOR UPDATE USING (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS billing_events_select_policy ON billing_events;
CREATE POLICY billing_events_select_policy ON billing_events
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS billing_events_insert_policy ON billing_events;
CREATE POLICY billing_events_insert_policy ON billing_events
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS invoices_select_policy ON invoices;
CREATE POLICY invoices_select_policy ON invoices
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS invoices_insert_policy ON invoices;
CREATE POLICY invoices_insert_policy ON invoices
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS invoices_update_policy ON invoices;
CREATE POLICY invoices_update_policy ON invoices
  FOR UPDATE USING (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS usage_records_select_policy ON usage_records;
CREATE POLICY usage_records_select_policy ON usage_records
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS usage_records_insert_policy ON usage_records;
CREATE POLICY usage_records_insert_policy ON usage_records
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS feature_overrides_select_policy ON feature_overrides;
CREATE POLICY feature_overrides_select_policy ON feature_overrides
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS feature_overrides_insert_policy ON feature_overrides;
CREATE POLICY feature_overrides_insert_policy ON feature_overrides
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS feature_overrides_update_policy ON feature_overrides;
CREATE POLICY feature_overrides_update_policy ON feature_overrides
  FOR UPDATE USING (can_manage_organization(workspace_id));

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plan_features_updated_at ON plan_features;
CREATE TRIGGER update_plan_features_updated_at
  BEFORE UPDATE ON plan_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_overrides_updated_at ON feature_overrides;
CREATE TRIGGER update_feature_overrides_updated_at
  BEFORE UPDATE ON feature_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO plans (code, name, description, monthly_price_cents, yearly_price_cents, currency, is_public, sort_order, trial_days)
VALUES
  ('starter', 'Starter', 'For small teams getting control over campaigns and performance.', 4900, 47000, 'EUR', TRUE, 1, 14),
  ('professional', 'Professional', 'For growing teams that need AI-powered insights and deeper optimization.', 14900, 143000, 'EUR', TRUE, 2, 14),
  ('enterprise', 'Enterprise', 'For organizations that need scale, governance, API access, and tailored support.', NULL, NULL, 'EUR', TRUE, 3, 0)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  yearly_price_cents = EXCLUDED.yearly_price_cents,
  currency = EXCLUDED.currency,
  is_public = EXCLUDED.is_public,
  sort_order = EXCLUDED.sort_order,
  trial_days = EXCLUDED.trial_days;

DELETE FROM plan_features
WHERE plan_id IN (SELECT id FROM plans WHERE code IN ('starter', 'professional', 'enterprise'));

WITH seeded_features AS (
  SELECT p.id AS plan_id, feature_key, feature_value_json
  FROM plans p
  JOIN (
    VALUES
      ('starter', 'max_workspaces', '1'::jsonb),
      ('starter', 'max_users', '3'::jsonb),
      ('starter', 'campaign_management', 'true'::jsonb),
      ('starter', 'campaign_tracking', 'true'::jsonb),
      ('starter', 'budget_management', 'true'::jsonb),
      ('starter', 'real_time_dashboards', 'true'::jsonb),
      ('starter', 'performance_tracking', 'true'::jsonb),
      ('starter', 'audience_segmentation', '"basic"'::jsonb),
      ('starter', 'analytics_level', '"standard"'::jsonb),
      ('starter', 'custom_reports', 'false'::jsonb),
      ('starter', 'trend_analysis', 'false'::jsonb),
      ('starter', 'ai_copy_generation', 'false'::jsonb),
      ('starter', 'image_suggestions', 'false'::jsonb),
      ('starter', 'ab_prediction', 'false'::jsonb),
      ('starter', 'creative_optimization', 'false'::jsonb),
      ('starter', 'api_access', '"none"'::jsonb),
      ('starter', 'advanced_permissions', '"none"'::jsonb),
      ('starter', 'priority_support', 'false'::jsonb),
      ('starter', 'custom_sla', 'false'::jsonb),
      ('starter', 'guided_onboarding', 'true'::jsonb),
      ('starter', 'demo_mode', 'true'::jsonb),
      ('professional', 'max_workspaces', '3'::jsonb),
      ('professional', 'max_users', '10'::jsonb),
      ('professional', 'campaign_management', 'true'::jsonb),
      ('professional', 'campaign_tracking', 'true'::jsonb),
      ('professional', 'budget_management', 'true'::jsonb),
      ('professional', 'real_time_dashboards', 'true'::jsonb),
      ('professional', 'performance_tracking', 'true'::jsonb),
      ('professional', 'audience_segmentation', '"advanced"'::jsonb),
      ('professional', 'analytics_level', '"advanced"'::jsonb),
      ('professional', 'custom_reports', 'true'::jsonb),
      ('professional', 'trend_analysis', 'true'::jsonb),
      ('professional', 'ai_copy_generation', 'true'::jsonb),
      ('professional', 'image_suggestions', 'true'::jsonb),
      ('professional', 'ab_prediction', 'true'::jsonb),
      ('professional', 'creative_optimization', 'true'::jsonb),
      ('professional', 'api_access', '"metered_optional"'::jsonb),
      ('professional', 'advanced_permissions', '"limited"'::jsonb),
      ('professional', 'priority_support', 'true'::jsonb),
      ('professional', 'custom_sla', 'false'::jsonb),
      ('professional', 'guided_onboarding', 'true'::jsonb),
      ('professional', 'demo_mode', 'true'::jsonb),
      ('enterprise', 'max_workspaces', '"unlimited"'::jsonb),
      ('enterprise', 'max_users', '"unlimited"'::jsonb),
      ('enterprise', 'campaign_management', 'true'::jsonb),
      ('enterprise', 'campaign_tracking', 'true'::jsonb),
      ('enterprise', 'budget_management', 'true'::jsonb),
      ('enterprise', 'real_time_dashboards', 'true'::jsonb),
      ('enterprise', 'performance_tracking', 'true'::jsonb),
      ('enterprise', 'audience_segmentation', '"advanced"'::jsonb),
      ('enterprise', 'analytics_level', '"enterprise"'::jsonb),
      ('enterprise', 'custom_reports', 'true'::jsonb),
      ('enterprise', 'trend_analysis', 'true'::jsonb),
      ('enterprise', 'ai_copy_generation', 'true'::jsonb),
      ('enterprise', 'image_suggestions', 'true'::jsonb),
      ('enterprise', 'ab_prediction', 'true'::jsonb),
      ('enterprise', 'creative_optimization', 'true'::jsonb),
      ('enterprise', 'api_access', '"full"'::jsonb),
      ('enterprise', 'advanced_permissions', '"full"'::jsonb),
      ('enterprise', 'priority_support', 'true'::jsonb),
      ('enterprise', 'custom_sla', 'true'::jsonb),
      ('enterprise', 'guided_onboarding', 'true'::jsonb),
      ('enterprise', 'demo_mode', 'true'::jsonb)
  ) AS feature_map(plan_code, feature_key, feature_value_json)
    ON feature_map.plan_code = p.code
)
INSERT INTO plan_features (plan_id, feature_key, feature_value_json)
SELECT plan_id, feature_key, feature_value_json
FROM seeded_features;

UPDATE organizations
SET plan_id = (SELECT id FROM plans WHERE code = 'starter')
WHERE plan_id IS NULL;
