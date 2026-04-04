import { createClient } from '@supabase/supabase-js'
import { applySessionCookies } from '@/lib/auth-session'
import { createApiResponse, withRateLimit, withValidation } from '@/lib/api-utils'
import { getSupabaseBrowserConfig } from '@/lib/runtime-config'
import { z } from 'zod'

const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name too long').optional(),
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withRateLimit(5, 60000)(withValidation(SignupSchema)(
  async (request: Request, data: z.infer<typeof SignupSchema>) => {
    try {
      const supabaseConfig = getSupabaseBrowserConfig()

      if (!supabaseConfig) {
        return createApiResponse(undefined, 'Supabase authentication is not configured', undefined, 503)
      }

      const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name || '',
          }
        }
      })

      if (authError) {
        console.error('Signup error:', authError)
        
        if (authError.message.includes('User already registered')) {
          return createApiResponse(undefined, 'User already exists', undefined, 409)
        }
        
        const authStatus = authError.status ?? 400
        const authMessage = authStatus >= 500
          ? 'Supabase authentication failed while creating the user'
          : authError.message

        return createApiResponse(undefined, authMessage, undefined, authStatus)
      }

      const response = createApiResponse({
        user: authData.user
          ? {
              id: authData.user.id,
              email: authData.user.email ?? null,
            }
          : null,
        session: authData.session
          ? {
              expiresAt: authData.session.expires_at ?? null,
            }
          : null,
        requiresEmailConfirmation: !authData.session,
      }, undefined, authData.session ? 'User created successfully' : 'User created successfully. Confirm your email before signing in.', 201)

      if (authData.session) {
        applySessionCookies(response, authData.session)
      }

      return response
    } catch (error) {
      console.error('Signup error:', error)
      return createApiResponse(undefined, 'Internal server error', undefined, 500)
    }
  }
))
