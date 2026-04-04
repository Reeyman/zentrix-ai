export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['workspaces']['Insert']>;
      };
      campaigns: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          status: 'draft' | 'active' | 'paused' | 'archived';
          budget: number | null;
          spend: number;
          start_date: string;
          end_date: string | null;
          targeting: any;
          creatives: string[];
          metrics: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
      };
      recommendations: {
        Row: {
          id: string;
          workspace_id: string;
          campaign_id: string | null;
          type: 'opportunity' | 'alert' | 'prediction';
          title: string;
          description: string;
          impact_estimate: {
            roas_increase?: number;
            spend_reduction?: number;
            conversion_lift?: number;
          };
          confidence: number;
          status: 'pending' | 'applied' | 'dismissed';
          applied_at: string | null;
          created_at: string;
        };
        Insert: Omit<Recommendation, 'id' | 'created_at' | 'applied_at'>;
        Update: Partial<Database['public']['Tables']['recommendations']['Insert']>;
      };
      audit_log: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          event_type: string;
          entity_type: string;
          entity_id: string | null;
          details: any;
          ip_address: string;
          user_agent: string;
          created_at: string;
        };
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
      };
      workspace_users: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: 'admin' | 'manager' | 'analyst' | 'viewer';
          created_at: string;
        };
        Insert: Omit<WorkspaceUser, 'created_at'>;
        Update: Partial<Database['public']['Tables']['workspace_users']['Insert']>;
      };
    };
  };
};

export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type Recommendation = Database['public']['Tables']['recommendations']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
export type WorkspaceUser = Database['public']['Tables']['workspace_users']['Row'];
