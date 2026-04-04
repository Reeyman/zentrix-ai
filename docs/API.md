# Advertising AI Platform - API Documentation

## Overview

The Advertising AI Platform provides a comprehensive REST API for managing campaigns, users, roles, billing, and AI recommendations. All API endpoints follow RESTful conventions and return JSON responses.

## Base URL

```
https://your-domain.com/api
```

## Authentication

All protected API endpoints require authentication via session cookies. The system automatically handles user authentication through Supabase sessions.

### Headers

- `x-workspace-id`: Optional workspace identifier for multi-tenant operations

## Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-03-28T20:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2026-03-28T20:00:00.000Z"
}
```

## Rate Limiting

- **Standard endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Upload endpoints**: 5 requests per minute

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets

## Endpoints

### Authentication

#### POST `/api/auth/login`
Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "session": { ... }
  }
}
```

#### POST `/api/auth/logout`
Terminate user session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Campaigns

#### GET `/api/campaigns`
List all campaigns for the current workspace.

**Query Parameters:**
- `status`: Filter by status (`draft`, `active`, `paused`, `completed`, `cancelled`)
- `channel`: Filter by channel (`Search`, `Display`, `Social`, `Video`, `Programmatic`)
- `limit`: Maximum number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "campaign-123",
      "name": "Spring Campaign",
      "status": "active",
      "channel": "Search",
      "budget": 10000,
      "spend": 2500,
      "roas": 3.2,
      "createdAt": "2026-03-28T20:00:00.000Z",
      "updatedAt": "2026-03-28T20:00:00.000Z"
    }
  ],
  "workspace": { ... },
  "mode": "connected"
}
```

#### POST `/api/campaigns`
Create a new campaign.

**Request Body:**
```json
{
  "name": "New Campaign",
  "description": "Campaign description",
  "status": "draft",
  "channel": "Search",
  "budget": 5000,
  "startDate": "2026-04-01",
  "endDate": "2026-04-30"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "campaign-456",
    "name": "New Campaign",
    "status": "draft",
    "createdAt": "2026-03-28T20:00:00.000Z"
  }
}
```

#### GET `/api/campaigns/[id]`
Get campaign details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "campaign-123",
    "name": "Spring Campaign",
    "description": "Detailed description",
    "status": "active",
    "channel": "Search",
    "budget": 10000,
    "spend": 2500,
    "roas": 3.2,
    "performance": {
      "impressions": 50000,
      "clicks": 1000,
      "conversions": 50,
      "ctr": 2.0,
      "cpc": 2.5,
      "cpa": 50
    },
    "createdAt": "2026-03-28T20:00:00.000Z",
    "updatedAt": "2026-03-28T20:00:00.000Z"
  }
}
```

#### PUT `/api/campaigns/[id]`
Update campaign details.

**Request Body:**
```json
{
  "name": "Updated Campaign Name",
  "status": "active",
  "budget": 7500
}
```

#### DELETE `/api/campaigns/[id]`
Delete a campaign.

**Response:**
```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

### Users & Roles

#### GET `/api/users`
List workspace users.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin",
      "status": "active",
      "lastSignIn": "2026-03-28T19:00:00.000Z"
    }
  ]
}
```

#### GET `/api/roles`
List available roles and permissions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "role-123",
      "name": "Campaign Manager",
      "description": "Can manage campaigns",
      "permissions": ["campaigns:read", "campaigns:write"],
      "userCount": 3
    }
  ]
}
```

#### POST `/api/roles`
Create a new role.

**Request Body:**
```json
{
  "name": "Custom Role",
  "description": "Role description",
  "permissions": ["campaigns:read"]
}
```

### Billing

#### GET `/api/billing`
Get billing information and invoices.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "currentPlan": "Professional",
      "billingInterval": "Monthly",
      "nextBillingDate": "2026-04-28",
      "usageThisCycle": "75%"
    },
    "invoices": [
      {
        "id": "inv-123",
        "amount": "$299.00",
        "status": "Paid",
        "due": "2026-03-28"
      }
    ]
  }
}
```

#### POST `/api/billing/[invoiceId]`
Queue invoice for finance review.

**Request Body:**
```json
{
  "action": "review"
}
```

### AI Recommendations

#### POST `/api/ai/recommendations`
Generate AI recommendations for the current workspace.

**Request Body:**
```json
{
  "prompt": "Analyze current advertising performance and provide optimization recommendations"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "rec-1",
        "title": "Optimize Search Campaign",
        "summary": "Increase budget by 20% for better performance",
        "confidence": "92%",
        "impact": "+15% ROAS",
        "risk": "Low",
        "rationale": ["Historical data shows positive correlation"]
      }
    ],
    "model": "gpt-4o-mini",
    "usingRealAI": true,
    "averageConfidence": 92
  }
}
```

### Audit & Monitoring

#### GET `/api/audit`
Get audit log entries.

**Query Parameters:**
- `category`: Filter by category (`security`, `billing`, `campaigns`)
- `limit`: Maximum results (default: 100)
- `since`: Filter by date (ISO 8601 string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "audit-123",
      "action": "campaign_created",
      "actor": "user@example.com",
      "target": "campaign-456",
      "result": "success",
      "category": "campaigns",
      "createdAt": "2026-03-28T20:00:00.000Z"
    }
  ]
}
```

#### GET `/api/monitoring`
Get system monitoring data.

**Query Parameters:**
- `type`: Data type (`overview`, `errors`, `metrics`, `health`)
- `limit`: Maximum results (default: 100)
- `since`: Filter by date (ISO 8601 string)

**Response:**
```json
{
  "success": true,
  "data": {
    "errors": [...],
    "metrics": [...],
    "health": [...],
    "stats": {
      "errors": { ... },
      "performance": { ... }
    }
  }
}
```

#### GET `/api/health`
System health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-28T20:00:00.000Z",
    "version": "1.0.0",
    "uptime": 86400,
    "checks": {
      "database": "pass",
      "auth": "pass",
      "ai": "pass"
    }
  }
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## SDK Examples

### JavaScript/TypeScript

```typescript
// List campaigns
const response = await fetch('/api/campaigns', {
  headers: {
    'x-workspace-id': 'workspace-123'
  }
});
const { data } = await response.json();

// Create campaign
const newCampaign = await fetch('/api/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Campaign',
    budget: 5000,
    channel: 'Search'
  })
});
```

### Python

```python
import requests

# Get campaigns
response = requests.get('https://your-domain.com/api/campaigns', 
                       headers={'x-workspace-id': 'workspace-123'})
campaigns = response.json()['data']

# Create campaign
campaign = requests.post('https://your-domain.com/api/campaigns',
                        json={
                            'name': 'New Campaign',
                            'budget': 5000,
                            'channel': 'Search'
                        })
```

## Webhooks

The platform supports webhooks for real-time event notifications. Configure webhook URLs in the dashboard to receive:

- Campaign status changes
- Billing events
- User activity
- Security alerts

**Webhook Payload:**
```json
{
  "event": "campaign.created",
  "data": { ... },
  "timestamp": "2026-03-28T20:00:00.000Z",
  "signature": "sha256=..."
}
```

## Support

For API support and questions:
- Documentation: `/docs/api`
- Monitoring dashboard: `/app/monitoring`
- Health status: `/api/health`
