import React from 'react';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  conditions?: FeatureFlagCondition[];
  rolloutPercentage?: number;
  enabledFor?: string[]; // User IDs or workspace IDs
  enabledRoles?: string[];
  metadata?: Record<string, any>;
}

interface FeatureFlagCondition {
  type: 'user_id' | 'workspace_id' | 'role' | 'custom' | 'percentage';
  operator: 'equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: string | number | boolean | string[];
}

interface FeatureFlagContext {
  userId?: string;
  workspaceId?: string;
  role?: string;
  email?: string;
  customAttributes?: Record<string, any>;
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private evaluations: Map<string, boolean> = new Map();
  private readonly maxEvaluations = 10000;

  constructor() {
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags(): void {
    // Default feature flags
    this.defineFlag('ai_recommendations', true, 'Enable AI-powered campaign recommendations', {
      enabledRoles: ['admin', 'campaign_manager'],
      rolloutPercentage: 100,
    });

    this.defineFlag('advanced_analytics', true, 'Enable advanced analytics dashboard', {
      enabledRoles: ['admin', 'analyst'],
      rolloutPercentage: 80,
    });

    this.defineFlag('real_time_collaboration', false, 'Enable real-time collaboration features', {
      rolloutPercentage: 0, // Disabled for now
    });

    this.defineFlag('custom_workflows', true, 'Enable custom workflow creation', {
      enabledRoles: ['admin'],
      rolloutPercentage: 100,
    });

    this.defineFlag('beta_features', false, 'Enable beta features for selected users', {
      enabledFor: ['beta-user-1', 'beta-user-2'], // Specific user IDs
      rolloutPercentage: 5,
    });

    this.defineFlag('maintenance_mode', false, 'Enable maintenance mode', {
      enabledRoles: ['admin'], // Only admins can access during maintenance
    });

    this.defineFlag('new_dashboard', true, 'Enable new dashboard design', {
      rolloutPercentage: 50, // 50% of users
    });

    this.defineFlag('enhanced_security', true, 'Enable enhanced security features', {
      enabledRoles: ['admin', 'security_admin'],
      rolloutPercentage: 100,
    });
  }

  defineFlag(
    key: string,
    enabled: boolean,
    description: string,
    options: Partial<FeatureFlag> = {}
  ): void {
    const flag: FeatureFlag = {
      key,
      enabled,
      description,
      ...options,
    };

    this.flags.set(key, flag);
  }

  isEnabled(key: string, context: FeatureFlagContext = {}): boolean {
    const flag = this.flags.get(key);
    
    if (!flag) {
      return false;
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Generate cache key for evaluation
    const cacheKey = this.generateCacheKey(key, context);
    
    // Check cache first
    if (this.evaluations.has(cacheKey)) {
      return this.evaluations.get(cacheKey)!;
    }

    const result = this.evaluateFlag(flag, context);
    
    // Cache the result
    this.evaluations.set(cacheKey, result);
    
    // Cleanup old evaluations
    if (this.evaluations.size > this.maxEvaluations) {
      const entries = Array.from(this.evaluations.entries());
      const toDelete = entries.slice(0, Math.floor(this.maxEvaluations * 0.8));
      toDelete.forEach(([key]) => this.evaluations.delete(key));
    }

    return result;
  }

  private evaluateFlag(flag: FeatureFlag, context: FeatureFlagContext): boolean {
    // Check specific user/role allowances
    if (flag.enabledFor && context.userId) {
      if (flag.enabledFor.includes(context.userId)) {
        return true;
      }
    }

    if (flag.enabledRoles && context.role) {
      if (flag.enabledRoles.includes(context.role)) {
        return true;
      }
    }

    // Check workspace-specific allowances
    if (flag.enabledFor && context.workspaceId) {
      if (flag.enabledFor.includes(context.workspaceId)) {
        return true;
      }
    }

    // Check conditions
    if (flag.conditions) {
      for (const condition of flag.conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      return this.isInRollout(flag.rolloutPercentage, context);
    }

    return true;
  }

  private evaluateCondition(condition: FeatureFlagCondition, context: FeatureFlagContext): boolean {
    let contextValue: any;

    switch (condition.type) {
      case 'user_id':
        contextValue = context.userId;
        break;
      case 'workspace_id':
        contextValue = context.workspaceId;
        break;
      case 'role':
        contextValue = context.role;
        break;
      case 'custom':
        contextValue = context.customAttributes?.[condition.value as string];
        break;
      case 'percentage':
        return this.isInRollout(condition.value as number, context);
      default:
        return true;
    }

    return this.applyOperator(condition.operator, contextValue, condition.value);
  }

  private applyOperator(operator: string, contextValue: any, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return contextValue === conditionValue;
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(contextValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(contextValue);
      case 'greater_than':
        return Number(contextValue) > Number(conditionValue);
      case 'less_than':
        return Number(contextValue) < Number(conditionValue);
      default:
        return true;
    }
  }

  private isInRollout(percentage: number, context: FeatureFlagContext): boolean {
    // Generate consistent hash based on user/workspace ID
    const identifier = context.userId || context.workspaceId || context.email || 'anonymous';
    const hash = this.hashString(identifier);
    const rolloutValue = hash % 100;
    return rolloutValue < percentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private generateCacheKey(key: string, context: FeatureFlagContext): string {
    const contextParts = [
      context.userId || '',
      context.workspaceId || '',
      context.role || '',
      context.email || '',
    ];
    return `${key}:${contextParts.join(':')}`;
  }

  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  updateFlag(key: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(key);
    if (!flag) {
      return false;
    }

    const updatedFlag = { ...flag, ...updates };
    this.flags.set(key, updatedFlag);
    
    // Clear cache for this flag
    this.clearCacheForFlag(key);
    
    return true;
  }

  deleteFlag(key: string): boolean {
    const deleted = this.flags.delete(key);
    if (deleted) {
      this.clearCacheForFlag(key);
    }
    return deleted;
  }

  private clearCacheForFlag(key: string): void {
    const keysToDelete: string[] = [];
    
    const cacheKeys = Array.from(this.evaluations.keys());
    for (let i = 0; i < cacheKeys.length; i++) {
      const cacheKey = cacheKeys[i];
      if (cacheKey.startsWith(`${key}:`)) {
        keysToDelete.push(cacheKey);
      }
    }
    
    keysToDelete.forEach(key => this.evaluations.delete(key));
  }

  getFlagStats(): {
    totalFlags: number;
    enabledFlags: number;
    flagsByRollout: Record<string, number>;
    recentEvaluations: number;
  } {
    const flags = this.getAllFlags();
    const enabledFlags = flags.filter(flag => flag.enabled).length;
    
    const flagsByRollout: Record<string, number> = {};
    flags.forEach(flag => {
      const rollout = flag.rolloutPercentage || 100;
      const bucket = rollout === 100 ? 'full' : rollout === 0 ? 'disabled' : `${rollout}%`;
      flagsByRollout[bucket] = (flagsByRollout[bucket] || 0) + 1;
    });

    return {
      totalFlags: flags.length,
      enabledFlags,
      flagsByRollout,
      recentEvaluations: this.evaluations.size,
    };
  }

  exportFlags(): string {
    const exportData = {
      flags: this.getAllFlags(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  importFlags(data: string): boolean {
    try {
      const importData = JSON.parse(data);
      
      if (!importData.flags || !Array.isArray(importData.flags)) {
        throw new Error('Invalid import data format');
      }

      // Clear existing flags
      this.flags.clear();
      this.evaluations.clear();

      // Import flags
      importData.flags.forEach((flag: FeatureFlag) => {
        this.flags.set(flag.key, flag);
      });

      return true;
    } catch (error) {
      console.error('Failed to import feature flags:', error);
      return false;
    }
  }

  clearCache(): void {
    this.evaluations.clear();
  }
}

// Create singleton instance
export const featureFlags = new FeatureFlagService();

// React hook for feature flags
export function useFeatureFlag(key: string, context?: FeatureFlagContext) {
  // This would be used in React components
  // For now, return a simple implementation
  return {
    isEnabled: featureFlags.isEnabled(key, context),
    isLoading: false,
  };
}

// Higher-order component for feature flags
export function withFeatureFlag<P extends object>(
  Component: React.ComponentType<P>,
  flagKey: string,
  fallback?: React.ComponentType<P>
) {
  return function FeatureFlagWrapper(props: P) {
    const isEnabled = featureFlags.isEnabled(flagKey);
    
    if (isEnabled) {
      return React.createElement(Component, props);
    }
    
    if (fallback) {
      return React.createElement(fallback, props);
    }
    
    return null;
  };
}

export default featureFlags;
