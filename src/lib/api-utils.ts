import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { getAuthenticatedUserFromHeaders, resolveUserFromAccessToken } from '@/lib/auth-session'
import { getWorkspaceIdFromHeaders, resolveWorkspacePayload } from '@/lib/server-app-data'

// Standard API response wrapper
export function createApiResponse<T = any>(
  data?: T,
  error?: string,
  message?: string,
  statusCode: number = 200
) {
  const correlationId = nanoid()
  const response = {
    success: !error,
    data,
    error,
    message,
    timestamp: new Date().toISOString(),
    correlationId,
  }

  return NextResponse.json(response, { status: statusCode })
}

export function createInternalApiErrorResponse(
  error: unknown,
  fallbackMessage: string = 'Internal server error'
) {
  console.error('API Error:', error)

  return createApiResponse(
    undefined,
    fallbackMessage,
    undefined,
    500
  )
}

// Error handling wrapper for API routes
export function withApiHandler(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any) => {
    try {
      const correlationId = nanoid()
      console.log(`[${correlationId}] API Request: ${request.method} ${request.url}`)
      
      const response = await handler(request, context)
      
      // Add correlation ID to response headers
      response.headers.set('X-Correlation-ID', correlationId)
      
      console.log(`[${correlationId}] API Response: ${response.status}`)
      return response
    } catch (error: any) {
      return createInternalApiErrorResponse(error)
    }
  }
}

// Validation middleware
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return (handler: (request: Request, data: T) => Promise<NextResponse>) => {
    return withApiHandler(async (request: Request) => {
      const body = await request.json()
      
      try {
        const validatedData = schema.parse(body)
        return handler(request, validatedData)
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          const validationErrors = error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
          
          return createApiResponse(
            undefined,
            'Validation failed',
            undefined,
            400
          )
        }
        
        return createApiResponse(
          undefined,
          'Invalid request data',
          undefined,
          400
        )
      }
    })
  }
}

// Rate limiting (simple in-memory version)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  return (handler: (request: Request) => Promise<NextResponse>) => {
    return withApiHandler(async (request: Request) => {
      const clientIP = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
      
      const now = Date.now()
      const key = `${clientIP}:${request.url}`
      const record = rateLimitStore.get(key)
      
      if (!record || now > record.resetTime) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs,
        })
        return handler(request)
      }
      
      if (record.count >= maxRequests) {
        return createApiResponse(
          undefined,
          'Rate limit exceeded',
          undefined,
          429
        )
      }
      
      record.count++
      return handler(request)
    })
  }
}

// Authentication check
export function withAuth(
  handler: (request: Request, user: any) => Promise<NextResponse>
) {
  return withApiHandler(async (request: Request) => {
    const forwardedUser = getAuthenticatedUserFromHeaders(request.headers)

    if (forwardedUser?.id) {
      return handler(request, forwardedUser)
    }

    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiResponse(
        undefined,
        'Authentication required',
        undefined,
        401
      )
    }

    const token = authHeader.slice('Bearer '.length).trim()
    const user = await resolveUserFromAccessToken(token)

    if (!user) {
      return createApiResponse(
        undefined,
        'Authentication required',
        undefined,
        401
      )
    }

    return handler(request, {
      id: user.id,
      email: user.email ?? null,
    })
  })
}

// Organization scope check
export function withOrganizationScope(
  handler: (request: Request, user: any, organizationId: string) => Promise<NextResponse>
) {
  return withAuth(async (request: Request, user: any) => {
    const requestedOrganizationId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const organizationId = requestedOrganizationId ?? (await resolveWorkspacePayload()).currentWorkspace.id

    return handler(request, user, organizationId)
  })
}
