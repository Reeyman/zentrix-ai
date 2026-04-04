import { z } from 'zod'

// Campaign validation schemas
export const CampaignCreateSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  budget: z.number().min(0, 'Budget must be positive').max(1000000, 'Budget too high'),
  start_date: z.string().datetime('Invalid start date'),
  end_date: z.string().datetime('Invalid end date'),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
  target_audience: z.object({
    age_min: z.number().min(13).max(100).optional(),
    age_max: z.number().min(13).max(100).optional(),
    gender: z.enum(['all', 'male', 'female', 'other']).default('all'),
    interests: z.array(z.string()).optional(),
    location: z.string().optional(),
  }).optional(),
})

export const CampaignUpdateSchema = CampaignCreateSchema.partial()

// Organization validation schemas
export const OrganizationCreateSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  website: z.string().url('Invalid website URL').optional(),
  industry: z.string().max(50, 'Industry too long').optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
})

// User validation schemas
export const UserUpdateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email address').optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
  role: z.enum(['admin', 'member', 'viewer']).optional(),
})

// API response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
})

// Health check response schema
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: z.string().datetime(),
  version: z.string(),
  services: z.record(z.string(), z.string()),
  uptime: z.number().optional(),
})

export type CampaignCreate = z.infer<typeof CampaignCreateSchema>
export type CampaignUpdate = z.infer<typeof CampaignUpdateSchema>
export type OrganizationCreate = z.infer<typeof OrganizationCreateSchema>
export type UserUpdate = z.infer<typeof UserUpdateSchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>
export type HealthCheck = z.infer<typeof HealthCheckSchema>
