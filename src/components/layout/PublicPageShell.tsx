import { ReactNode } from 'react'

type PublicPageShellProps = {
  children: ReactNode
}

export const publicHeroPanelClassName =
  'rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.95))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-10'

export const publicSidePanelClassName =
  'rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8'

export const publicNestedPanelClassName =
  'rounded-[26px] border border-white/10 bg-white/[0.03] p-5'

export const publicHighlightCardClassName =
  'flex min-h-[172px] flex-col gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-5'

export const publicInfoCardClassName =
  'rounded-[22px] border border-white/8 bg-white/[0.03] p-5'

export const publicBottomSectionClassName =
  'rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(2,6,23,0.94))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:p-8'

export const publicBadgeClassName =
  'inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-200'

export const publicTagListClassName =
  'flex flex-wrap gap-2.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300'

export const publicTagClassName =
  'rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5'

export const publicEyebrowClassName =
  'text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'

export const publicPrimaryButtonClassName =
  'h-11 rounded-md border border-violet-300/20 bg-[linear-gradient(135deg,rgba(124,58,237,1)_0%,rgba(79,70,229,0.96)_100%)] px-7 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(124,58,237,0.34)] hover:bg-[linear-gradient(135deg,rgba(139,92,246,1)_0%,rgba(99,102,241,0.98)_100%)] hover:shadow-[0_22px_54px_rgba(124,58,237,0.42)] focus-visible:ring-violet-300/70'

export const publicOutlineButtonClassName =
  'h-11 border-white/12 bg-white/[0.02] px-7 text-sm font-semibold text-slate-100 hover:bg-white/[0.06]'

export const publicGhostButtonClassName =
  'h-11 px-7 text-sm font-semibold text-slate-300 hover:text-white'

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#060a12] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.2),transparent_28%)]" />
      <div className="relative px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:gap-10">{children}</div>
      </div>
    </main>
  )
}
