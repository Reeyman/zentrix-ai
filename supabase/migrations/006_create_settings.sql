-- Create settings activity log table
CREATE TABLE IF NOT EXISTS settings_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'enable', 'disable', 'configure')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('user', 'role', 'integration', 'billing', 'audit', 'campaign', 'creative', 'audience', 'report')),
  resource_id UUID,
  resource_name TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'security', 'integrations', 'notifications', 'billing', 'audit')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, key)
);

-- Create integration status table
CREATE TABLE IF NOT EXISTS integration_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, integration_name)
);

-- Create indexes
CREATE INDEX idx_settings_activity_organization_id ON settings_activity(organization_id);
CREATE INDEX idx_settings_activity_user_id ON settings_activity(user_id);
CREATE INDEX idx_settings_activity_created_at ON settings_activity(created_at);
CREATE INDEX idx_settings_activity_action ON settings_activity(action);
CREATE INDEX idx_settings_activity_resource_type ON settings_activity(resource_type);
CREATE INDEX idx_system_settings_organization_id ON system_settings(organization_id);
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_integration_status_organization_id ON integration_status(organization_id);
CREATE INDEX idx_integration_status_status ON integration_status(status);

-- Enable RLS
ALTER TABLE settings_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for settings activity
CREATE POLICY "Users can view activity in their organization" ON settings_activity
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activity in their organization" ON settings_activity
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS policies for system settings
CREATE POLICY "Users can view settings in their organization" ON system_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid()
    ) AND is_public = true
  );

CREATE POLICY "Admins can manage settings in their organization" ON system_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- RLS policies for integration status
CREATE POLICY "Users can view integration status in their organization" ON integration_status
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage integration status in their organization" ON integration_status
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_status_updated_at BEFORE UPDATE ON integration_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
