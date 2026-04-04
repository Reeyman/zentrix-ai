-- Add RLS policies for organizations after user_organizations table exists
CREATE POLICY "Users can view their own organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert organizations they are members of" ON organizations
  FOR INSERT WITH CHECK (
    id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update organizations they are admins of" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
