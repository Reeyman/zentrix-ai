interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  actorType: 'user' | 'system' | 'api';
  target: string;
  targetType: string;
  result: 'success' | 'failure' | 'partial';
  category: 'security' | 'billing' | 'campaigns' | 'users' | 'system' | 'data';
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  workspaceId?: string;
  timestamp: string;
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private readonly maxEvents = 10000;

  logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    this.events.unshift(auditEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${auditEvent.action} by ${auditEvent.actor} on ${auditEvent.target} - ${auditEvent.result}`);
    }

    return auditEvent;
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getEvents(options: {
    action?: string;
    actor?: string;
    category?: string;
    result?: string;
    limit?: number;
    since?: Date;
    workspaceId?: string;
  } = {}): AuditEvent[] {
    let filtered = this.events;

    if (options.action) {
      filtered = filtered.filter(event => event.action === options.action);
    }

    if (options.actor) {
      filtered = filtered.filter(event => event.actor === options.actor);
    }

    if (options.category) {
      filtered = filtered.filter(event => event.category === options.category);
    }

    if (options.result) {
      filtered = filtered.filter(event => event.result === options.result);
    }

    if (options.workspaceId) {
      filtered = filtered.filter(event => event.workspaceId === options.workspaceId);
    }

    if (options.since) {
      filtered = filtered.filter(event => new Date(event.timestamp) >= options.since);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  getEventStats(): {
    total: number;
    byCategory: Record<string, number>;
    byAction: Record<string, number>;
    byResult: Record<string, number>;
    recentHour: number;
    recentDay: number;
    recentWeek: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byCategory: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byResult: Record<string, number> = {};

    this.events.forEach(event => {
      byCategory[event.category] = (byCategory[event.category] || 0) + 1;
      byAction[event.action] = (byAction[event.action] || 0) + 1;
      byResult[event.result] = (byResult[event.result] || 0) + 1;
    });

    return {
      total: this.events.length,
      byCategory,
      byAction,
      byResult,
      recentHour: this.events.filter(event => new Date(event.timestamp) >= oneHourAgo).length,
      recentDay: this.events.filter(event => new Date(event.timestamp) >= oneDayAgo).length,
      recentWeek: this.events.filter(event => new Date(event.timestamp) >= oneWeekAgo).length,
    };
  }

  exportEvents(format: 'json' | 'csv' = 'json'): string {
    const events = this.events;

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    }

    if (format === 'csv') {
      const headers = [
        'id', 'timestamp', 'action', 'actor', 'actorType', 'target', 'targetType',
        'result', 'category', 'ipAddress', 'workspaceId', 'metadata'
      ];
      
      const csvRows = [
        headers.join(','),
        ...events.map(event => [
          event.id,
          event.timestamp,
          event.action,
          event.actor,
          event.actorType,
          event.target,
          event.targetType,
          event.result,
          event.category,
          event.ipAddress || '',
          event.workspaceId || '',
          event.metadata ? JSON.stringify(event.metadata).replace(/"/g, '""') : ''
        ].map(field => `"${field}"`).join(','))
      ];

      return csvRows.join('\n');
    }

    return '';
  }

  clear(): void {
    this.events = [];
  }

  // Security-specific logging methods
  logSecurityEvent(action: string, actor: string, details: {
    target?: string;
    result: 'success' | 'failure';
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): AuditEvent {
    return this.logEvent({
      action,
      actor,
      actorType: 'user',
      target: details.target || 'system',
      targetType: 'security',
      result: details.result,
      category: 'security',
      metadata: details.metadata,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    });
  }

  logDataAccess(action: string, actor: string, target: string, details: {
    result: 'success' | 'failure';
    workspaceId?: string;
    metadata?: Record<string, any>;
  }): AuditEvent {
    return this.logEvent({
      action,
      actor,
      actorType: 'user',
      target,
      targetType: 'data',
      result: details.result,
      category: 'data',
      metadata: details.metadata,
      workspaceId: details.workspaceId,
    });
  }

  logSystemEvent(action: string, details: {
    result: 'success' | 'failure';
    metadata?: Record<string, any>;
  }): AuditEvent {
    return this.logEvent({
      action,
      actor: 'system',
      actorType: 'system',
      target: 'system',
      targetType: 'system',
      result: details.result,
      category: 'system',
      metadata: details.metadata,
    });
  }
}

// Create singleton instance
export const auditLogger = new AuditLogger();

// Helper functions for common audit events
export function logUserLogin(userId: string, email: string, ipAddress?: string, userAgent?: string) {
  return auditLogger.logSecurityEvent('user_login', userId, {
    target: email,
    result: 'success',
    ipAddress,
    userAgent,
    metadata: { email }
  });
}

export function logUserLogout(userId: string, email: string) {
  return auditLogger.logSecurityEvent('user_logout', userId, {
    target: email,
    result: 'success',
    metadata: { email }
  });
}

export function logFailedLogin(email: string, ipAddress?: string, userAgent?: string) {
  return auditLogger.logSecurityEvent('login_failed', email, {
    target: email,
    result: 'failure',
    ipAddress,
    userAgent,
    metadata: { email }
  });
}

export function logCampaignAction(action: string, userId: string, campaignId: string, result: 'success' | 'failure', workspaceId?: string) {
  return auditLogger.logEvent({
    action,
    actor: userId,
    actorType: 'user',
    target: campaignId,
    targetType: 'campaign',
    result,
    category: 'campaigns',
    workspaceId,
    metadata: { campaignId }
  });
}

export function logDataExport(userId: string, dataType: string, recordCount: number, workspaceId?: string) {
  return auditLogger.logDataAccess('data_export', userId, dataType, {
    result: 'success',
    workspaceId,
    metadata: { dataType, recordCount }
  });
}

export function logPermissionCheck(userId: string, resource: string, action: string, result: 'granted' | 'denied') {
  return auditLogger.logSecurityEvent('permission_check', userId, {
    target: resource,
    result: result === 'granted' ? 'success' : 'failure',
    metadata: { resource, action, granted: result === 'granted' }
  });
}

export function logApiAccess(apiKey: string, endpoint: string, method: string, result: 'success' | 'failure', ipAddress?: string) {
  return auditLogger.logSecurityEvent('api_access', apiKey, {
    target: endpoint,
    result,
    ipAddress,
    metadata: { endpoint, method }
  });
}

export default auditLogger;
