-- Create audiences table
CREATE TABLE IF NOT EXISTS audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create audience targeting rules
CREATE TABLE IF NOT EXISTS audience_targeting_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('demographic', 'behavioral', 'geographic', 'interest', 'custom')),
  rule_name TEXT NOT NULL,
  rule_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audience performance metrics
CREATE TABLE IF NOT EXISTS audience_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  spend DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(audience_id, date)
);

-- Create indexes
CREATE INDEX idx_audiences_organization_id ON audiences(organization_id);
CREATE INDEX idx_audiences_status ON audiences(status);
CREATE INDEX idx_audiences_created_at ON audiences(created_at);
CREATE INDEX idx_audience_targeting_rules_audience_id ON audience_targeting_rules(audience_id);
CREATE INDEX idx_audience_performance_audience_id ON audience_performance(audience_id);
CREATE INDEX idx_audience_performance_date ON audience_performance(date);

-- Enable RLS
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_targeting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_performance ENABLE ROW LEVEL SECURITY;

-- RLS policies for audiences
CREATE POLICY "Users can view audiences in their organization" ON audiences
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audiences in their organization" ON audiences
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update audiences in their organization" ON audiences
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete audiences in their organization" ON audiences
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS policies for targeting rules (cascade through audience)
CREATE POLICY "Users can view targeting rules for their audiences" ON audience_targeting_rules
  FOR SELECT USING (
    audience_id IN (
      SELECT id FROM audiences 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage targeting rules for their audiences" ON audience_targeting_rules
  FOR ALL USING (
    audience_id IN (
      SELECT id FROM audiences 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS policies for performance metrics (cascade through audience)
CREATE POLICY "Users can view performance for their audiences" ON audience_performance
  FOR SELECT USING (
    audience_id IN (
      SELECT id FROM audiences 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage performance for their audiences" ON audience_performance
  FOR ALL USING (
    audience_id IN (
      SELECT id FROM audiences 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_audiences_updated_at BEFORE UPDATE ON audiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audience_targeting_rules_updated_at BEFORE UPDATE ON audience_targeting_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
