-- Create user_organizations junction table
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_role ON user_organizations(role);

-- Enable RLS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own organization memberships" ON user_organizations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own organization memberships" ON user_organizations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own role in organizations" ON user_organizations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Organization admins can manage memberships" ON user_organizations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Function to automatically create user organization when user signs up
CREATE OR REPLACE FUNCTION create_user_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a default organization for new users
  INSERT INTO organizations (name, description)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || "'s Organization",
    'Default organization created automatically'
  )
  RETURNING id INTO NEW.organization_id;

  -- Add user as owner of their own organization
  INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
  VALUES (NEW.id, NEW.organization_id, 'owner', NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create organization on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_organization();
