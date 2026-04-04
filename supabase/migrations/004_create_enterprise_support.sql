CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_user_organization()
RETURNS TRIGGER AS $$
DECLARE
  new_organization_id UUID;
BEGIN
  INSERT INTO organizations (name, description)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Organization',
    'Default organization created automatically'
  )
  RETURNING id INTO new_organization_id;

  INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
  VALUES (NEW.id, new_organization_id, 'owner', NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_access_organization(target_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_organizations
    WHERE organization_id = target_organization_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_manage_organization(target_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_organizations
    WHERE organization_id = target_organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  ip_address TEXT DEFAULT 'Unknown IP' NOT NULL,
  user_agent TEXT DEFAULT 'Unknown client' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_workspace_id ON audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_select_policy ON audit_log;
CREATE POLICY audit_log_select_policy ON audit_log
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS audit_log_insert_policy ON audit_log;
CREATE POLICY audit_log_insert_policy ON audit_log
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

CREATE TABLE IF NOT EXISTS workspace_creatives (
  id TEXT PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  format TEXT NOT NULL,
  impressions BIGINT DEFAULT 0 NOT NULL,
  ctr NUMERIC(8,2) DEFAULT 0 NOT NULL,
  conversions INTEGER DEFAULT 0 NOT NULL,
  roas NUMERIC(8,2) DEFAULT 0 NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_creatives_workspace_id ON workspace_creatives(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_creatives_created_at ON workspace_creatives(created_at DESC);

ALTER TABLE workspace_creatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_creatives_select_policy ON workspace_creatives;
CREATE POLICY workspace_creatives_select_policy ON workspace_creatives
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS workspace_creatives_insert_policy ON workspace_creatives;
CREATE POLICY workspace_creatives_insert_policy ON workspace_creatives
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS workspace_creatives_update_policy ON workspace_creatives;
CREATE POLICY workspace_creatives_update_policy ON workspace_creatives
  FOR UPDATE USING (can_manage_organization(workspace_id));

CREATE TABLE IF NOT EXISTS workspace_roles (
  id TEXT PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  user_count INTEGER DEFAULT 0 NOT NULL,
  scope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  review_due TEXT NOT NULL DEFAULT 'Pending',
  approver TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_roles_workspace_id ON workspace_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_roles_created_at ON workspace_roles(created_at DESC);

ALTER TABLE workspace_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_roles_select_policy ON workspace_roles;
CREATE POLICY workspace_roles_select_policy ON workspace_roles
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS workspace_roles_insert_policy ON workspace_roles;
CREATE POLICY workspace_roles_insert_policy ON workspace_roles
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS workspace_roles_update_policy ON workspace_roles;
CREATE POLICY workspace_roles_update_policy ON workspace_roles
  FOR UPDATE USING (can_manage_organization(workspace_id));

CREATE TABLE IF NOT EXISTS workspace_role_approvals (
  id TEXT PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  change_summary TEXT NOT NULL,
  requester TEXT NOT NULL,
  approvers TEXT NOT NULL,
  due TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_role_approvals_workspace_id ON workspace_role_approvals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_role_approvals_created_at ON workspace_role_approvals(created_at DESC);

ALTER TABLE workspace_role_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_role_approvals_select_policy ON workspace_role_approvals;
CREATE POLICY workspace_role_approvals_select_policy ON workspace_role_approvals
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS workspace_role_approvals_insert_policy ON workspace_role_approvals;
CREATE POLICY workspace_role_approvals_insert_policy ON workspace_role_approvals
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS workspace_role_approvals_update_policy ON workspace_role_approvals;
CREATE POLICY workspace_role_approvals_update_policy ON workspace_role_approvals
  FOR UPDATE USING (can_manage_organization(workspace_id));

CREATE TABLE IF NOT EXISTS workspace_integrations (
  id TEXT PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Healthy',
  sync_label TEXT NOT NULL DEFAULT 'Just now',
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_integrations_workspace_id ON workspace_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_integrations_created_at ON workspace_integrations(created_at DESC);

ALTER TABLE workspace_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_integrations_select_policy ON workspace_integrations;
CREATE POLICY workspace_integrations_select_policy ON workspace_integrations
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS workspace_integrations_insert_policy ON workspace_integrations;
CREATE POLICY workspace_integrations_insert_policy ON workspace_integrations
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS workspace_integrations_update_policy ON workspace_integrations;
CREATE POLICY workspace_integrations_update_policy ON workspace_integrations
  FOR UPDATE USING (can_manage_organization(workspace_id));

CREATE TABLE IF NOT EXISTS workspace_invoices (
  id TEXT PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  amount_cents BIGINT DEFAULT 0 NOT NULL,
  amount_label TEXT NOT NULL DEFAULT '$0',
  status TEXT NOT NULL DEFAULT 'Pending',
  due_label TEXT NOT NULL DEFAULT 'Today',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_invoices_workspace_id ON workspace_invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invoices_created_at ON workspace_invoices(created_at DESC);

ALTER TABLE workspace_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_invoices_select_policy ON workspace_invoices;
CREATE POLICY workspace_invoices_select_policy ON workspace_invoices
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS workspace_invoices_insert_policy ON workspace_invoices;
CREATE POLICY workspace_invoices_insert_policy ON workspace_invoices
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS workspace_invoices_update_policy ON workspace_invoices;
CREATE POLICY workspace_invoices_update_policy ON workspace_invoices
  FOR UPDATE USING (can_manage_organization(workspace_id));

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('opportunity', 'alert', 'prediction')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_estimate JSONB DEFAULT '{}'::jsonb NOT NULL,
  confidence NUMERIC(5,4) DEFAULT 0 NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recommendations_workspace_id ON recommendations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_campaign_id ON recommendations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recommendations_select_policy ON recommendations;
CREATE POLICY recommendations_select_policy ON recommendations
  FOR SELECT USING (can_access_organization(workspace_id));

DROP POLICY IF EXISTS recommendations_insert_policy ON recommendations;
CREATE POLICY recommendations_insert_policy ON recommendations
  FOR INSERT WITH CHECK (can_manage_organization(workspace_id));

DROP POLICY IF EXISTS recommendations_update_policy ON recommendations;
CREATE POLICY recommendations_update_policy ON recommendations
  FOR UPDATE USING (can_manage_organization(workspace_id));

DROP TRIGGER IF EXISTS update_workspace_creatives_updated_at ON workspace_creatives;
CREATE TRIGGER update_workspace_creatives_updated_at
  BEFORE UPDATE ON workspace_creatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_roles_updated_at ON workspace_roles;
CREATE TRIGGER update_workspace_roles_updated_at
  BEFORE UPDATE ON workspace_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_role_approvals_updated_at ON workspace_role_approvals;
CREATE TRIGGER update_workspace_role_approvals_updated_at
  BEFORE UPDATE ON workspace_role_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_integrations_updated_at ON workspace_integrations;
CREATE TRIGGER update_workspace_integrations_updated_at
  BEFORE UPDATE ON workspace_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_invoices_updated_at ON workspace_invoices;
CREATE TRIGGER update_workspace_invoices_updated_at
  BEFORE UPDATE ON workspace_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
