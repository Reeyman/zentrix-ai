'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'

type AuthMode = 'login' | 'signup'

type AuthResponse = {
  success?: boolean
  error?: string
  message?: string
  data?: {
    requiresEmailConfirmation?: boolean
  }
}

const AUTH_FEATURES = [
  {
    title: 'Workspace security',
    copy: 'Each company operates in its own isolated workspace with scoped access.',
  },
  {
    title: 'Controlled operations',
    copy: 'Actions, approvals, and reviews remain visible, traceable, and team-safe.',
  },
  {
    title: 'Zen-like intelligence',
    copy: 'Experience calm AI automation that brings harmony to your advertising operations.',
  },
] as const

function getCardTitle(mode: AuthMode, isPasswordRecovery: boolean) {
  if (isPasswordRecovery) {
    return 'Create a new password'
  }

  return mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace account'
}

function getCardSubtitle(mode: AuthMode, isPasswordRecovery: boolean) {
  if (isPasswordRecovery) {
    return 'Choose a new password to restore access to your advertising workspace.'
  }

  return mode === 'login'
    ? 'Use your email and password to access your advertising environment.'
    : 'Set up your account to access your advertising workspace and start onboarding your team.'
}

function getHelperLine(mode: AuthMode, isPasswordRecovery: boolean) {
  if (isPasswordRecovery) {
    return 'Set your new password, then continue securely into your workspace.'
  }

  return mode === 'login'
    ? 'You’ll be taken to your workspace overview after sign-in.'
    : 'You’ll be guided through workspace setup after account creation.'
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [redirectTo, setRedirectTo] = useState('/app/overview')

  useEffect(() => {
    const syncAuthUi = () => {
      const value = new URLSearchParams(window.location.search).get('redirectTo')
      setRedirectTo(value && value.startsWith('/') && !value.startsWith('//') ? value : '/app/overview')
      setIsPasswordRecovery(window.location.hash.includes('type=recovery'))
    }

    syncAuthUi()

    const authSubscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('login')
        setIsPasswordRecovery(true)
        setError(null)
        setMessage(null)
      }
    })

    window.addEventListener('hashchange', syncAuthUi)

    return () => {
      window.removeEventListener('hashchange', syncAuthUi)
      authSubscription?.data.subscription.unsubscribe()
    }
  }, [])

  // Force mobile layout fix
  useEffect(() => {
    const fixMobileLayout = () => {
      if (window.innerWidth <= 768) {
        const loginGrid = document.querySelector('.login-grid') as HTMLElement
        const leftPanel = document.querySelector('.login-left-panel') as HTMLElement
        
        if (loginGrid) {
          loginGrid.style.gridTemplateColumns = '1fr'
          loginGrid.style.gap = '0'
        }
        
        if (leftPanel) {
          leftPanel.style.display = 'none'
        }
      }
    }

    fixMobileLayout()
    window.addEventListener('resize', fixMobileLayout)
    return () => window.removeEventListener('resize', fixMobileLayout)
  }, [])

  function exitRecoveryFlow() {
    setIsPasswordRecovery(false)
    setPassword('')
    setConfirmPassword('')

    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
  }

  function handleModeChange(nextMode: AuthMode) {
    exitRecoveryFlow()
    setMode(nextMode)
    setShowPassword(false)
    setError(null)
    setMessage(null)
  }

  async function handleForgotPassword() {
    setError(null)
    setMessage(null)

    if (!email.trim()) {
      setError('Enter your email address to request a password reset.')
      return
    }

    if (!supabase) {
      setError('Password reset is not available right now.')
      return
    }

    setIsSendingReset(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      })

      if (resetError) {
        throw resetError
      }

      setMessage('If an account exists for this email, password reset instructions have been sent.')
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Password reset request failed')
    } finally {
      setIsSendingReset(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      if (isPasswordRecovery) {
        if (!supabase) {
          throw new Error('Password reset is not available right now.')
        }

        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters.')
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!sessionData.session) {
          throw new Error('Open the password reset link from your email to continue.')
        }

        const { error: updateError } = await supabase.auth.updateUser({ password })

        if (updateError) {
          throw updateError
        }

        router.push('/app/overview')
        router.refresh()
        return
      }

      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          ...(mode === 'signup' ? { full_name: fullName } : {}),
        }),
      })

      const payload = await response.json() as AuthResponse

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Authentication request failed')
      }

      if (mode === 'signup' && payload.data?.requiresEmailConfirmation) {
        setMessage(payload.message ?? 'Account created. Confirm your email, then sign in to access your workspace.')
        setMode('login')
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Authentication request failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background:
          'radial-gradient(circle at top, rgba(124, 58, 237, 0.22), transparent 34%), radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.18), transparent 28%), #060a12',
        color: 'var(--text-0)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.18fr) minmax(360px, 430px)',
          gap: '28px',
          alignItems: 'stretch',
        }}
        className="login-grid"
      >
        <section
          style={{
            border: '1px solid rgba(255,255,255,.10)',
            borderRadius: '30px',
            background: 'linear-gradient(180deg, rgba(15,23,42,.92), rgba(2,6,23,.94))',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '30px',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.34)',
          }}
          className="login-left-panel"
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <BrandMark alt="Zentrix AI brand mark" priority size={52} />
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '14px' }}>
              <span style={{ color: 'rgba(191, 219, 254, 0.82)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.24em', fontWeight: 600 }}>
                Zen-like intelligent advertising
              </span>
              <h1 style={{ margin: '20px 0 0', maxWidth: '15.25ch', fontSize: '39px', lineHeight: 1.07, letterSpacing: '-0.035em' }}>
                Experience calm, focused advertising operations with AI automation
              </h1>
              <p style={{ margin: '22px 0 0', color: 'rgba(226, 232, 240, 0.74)', fontSize: '16px', lineHeight: 1.72, maxWidth: '56ch' }}>
                Sign in to achieve zen in your campaigns with intelligent workflow automation and real-time performance insights.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', alignItems: 'stretch' }}>
            {AUTH_FEATURES.map(({ title, copy }) => (
              <div
                key={title}
                style={{
                  padding: '20px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,.08)',
                  background: 'rgba(255,255,255,0.03)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
                  minHeight: '160px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.35, color: '#fff' }}>{title}</div>
                <div style={{ fontSize: '13px', lineHeight: 1.78, color: 'rgba(226, 232, 240, 0.72)' }}>{copy}</div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            border: '1px solid rgba(255,255,255,.10)',
            borderRadius: '30px',
            background: 'linear-gradient(180deg, rgba(15,23,42,.9), rgba(2,6,23,.95))',
            padding: '30px',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '36px',
              padding: '6px',
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,.08)',
              background: 'rgba(255,255,255,.02)',
            }}
          >
            {(['login', 'signup'] as AuthMode[]).map((option) => {
              const isActive = mode === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleModeChange(option)}
                  style={{
                    flex: 1,
                    minHeight: '42px',
                    borderRadius: '12px',
                    border: isActive ? '1px solid rgba(140,170,255,.16)' : '1px solid transparent',
                    background: isActive
                      ? 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(92,118,196,.08))'
                      : 'transparent',
                    color: isActive ? 'rgba(245, 248, 255, 0.96)' : 'rgba(226, 232, 240, 0.72)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all .2s ease',
                    boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'none',
                  }}
                >
                  {option === 'login' ? 'Sign in' : 'Create account'}
                </button>
              )
            })}
          </div>

          <div style={{ marginBottom: '26px' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: '30px', lineHeight: 1.14 }}>{getCardTitle(mode, isPasswordRecovery)}</h2>
            <p style={{ margin: 0, color: 'rgba(226, 232, 240, 0.74)', lineHeight: 1.7 }}>{getCardSubtitle(mode, isPasswordRecovery)}</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            {mode === 'signup' && !isPasswordRecovery ? (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.82)' }}>Full name</span>
                <input
                  className="input"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Alex Morgan"
                  autoComplete="name"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: '48px', borderRadius: '14px' }}
                  required
                />
              </label>
            ) : null}

            {!isPasswordRecovery ? (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.82)' }}>Email</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: '48px', borderRadius: '14px' }}
                  required
                />
              </label>
            ) : null}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: isPasswordRecovery ? '18px' : '0' }}>
              <span style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.82)' }}>{isPasswordRecovery ? 'New password' : 'Password'}</span>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' && !isPasswordRecovery ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                  style={{ width: '100%', minHeight: '48px', boxSizing: 'border-box', paddingRight: '52px', borderRadius: '14px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '10px',
                    transform: 'translateY(-50%)',
                    width: '28px',
                    height: '28px',
                    border: 'none',
                    borderRadius: '999px',
                    background: 'transparent',
                    color: showPassword ? 'rgba(196, 181, 253, 0.98)' : 'rgba(186, 196, 211, 0.76)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'color .2s ease, opacity .2s ease',
                    opacity: showPassword ? 1 : 0.9,
                  }}
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.95} /> : <Eye size={16} strokeWidth={1.95} />}
                </button>
              </div>
            </label>

            {isPasswordRecovery ? (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.82)' }}>Confirm new password</span>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  style={{ width: '100%', minHeight: '48px', boxSizing: 'border-box', borderRadius: '14px' }}
                />
              </label>
            ) : null}

            {error ? (
              <div style={{ marginTop: '18px', borderRadius: '16px', border: '1px solid rgba(248, 113, 113, 0.35)', background: 'rgba(127, 29, 29, 0.24)', padding: '14px 16px', color: '#fecaca', fontSize: '14px' }}>
                {error}
              </div>
            ) : null}

            {message ? (
              <div style={{ marginTop: '18px', borderRadius: '16px', border: '1px solid rgba(110, 231, 183, 0.3)', background: 'rgba(6, 78, 59, 0.2)', padding: '14px 16px', color: '#bbf7d0', fontSize: '14px' }}>
                {message}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="mt-[22px] h-11 w-full rounded-md border border-[rgba(140,170,255,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(92,118,196,0.08))] text-sm font-semibold text-[rgba(236,241,252,0.94)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[rgba(140,170,255,0.16)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(92,118,196,0.12))] hover:text-[rgba(245,248,255,0.98)] focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {isSubmitting ? 'Please wait…' : isPasswordRecovery ? 'Save new password' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: 'rgba(226, 232, 240, 0.68)', fontSize: '13px', lineHeight: 1.6 }}>
              {getHelperLine(mode, isPasswordRecovery)}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px' }}>
              {isPasswordRecovery ? (
                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  style={{ border: 'none', background: 'transparent', padding: 0, color: 'rgba(191, 219, 254, 0.92)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Back to sign in
                </button>
              ) : mode === 'login' ? (
                <>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSendingReset}
                    style={{ border: 'none', background: 'transparent', padding: 0, color: 'rgba(191, 219, 254, 0.92)', fontSize: '13px', fontWeight: 500, cursor: isSendingReset ? 'default' : 'pointer', opacity: isSendingReset ? 0.7 : 1 }}
                  >
                    {isSendingReset ? 'Sending reset link…' : 'Forgot password?'}
                  </button>
                  <span style={{ color: 'rgba(148, 163, 184, 0.82)', fontSize: '14px', lineHeight: 1 }}>•</span>
                  <Link href="/demo" style={{ color: 'rgba(191, 219, 254, 0.92)', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                    Explore demo
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleModeChange('login')}
                    style={{ border: 'none', background: 'transparent', padding: 0, color: 'rgba(191, 219, 254, 0.92)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Already have an account? Sign in
                  </button>
                  <span style={{ color: 'rgba(148, 163, 184, 0.82)', fontSize: '14px', lineHeight: 1 }}>•</span>
                  <Link href="/demo" style={{ color: 'rgba(191, 219, 254, 0.92)', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                    Explore demo
                  </Link>
                </>
              )}
            </div>
            <div style={{ marginTop: '32px', color: 'rgba(148, 163, 184, 0.78)', fontSize: '12.5px', lineHeight: 1.6 }}>
              Role-based access keeps each workspace secure and scoped.
            </div>
          </div>
        </section>
      </div>
    </main>
)
}
