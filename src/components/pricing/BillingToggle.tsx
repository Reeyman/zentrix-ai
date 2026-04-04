import { Button } from '@/components/ui/button'
import type { BillingInterval } from '@/lib/pricing'

type BillingToggleProps = {
  value: BillingInterval
  onChange: (value: BillingInterval) => void
  monthlyLabel: string
  yearlyLabel: string
  savingsLabel: string
  yearlyValueLabel?: string
}

export function BillingToggle({
  value,
  onChange,
  monthlyLabel,
  yearlyLabel,
  savingsLabel,
  yearlyValueLabel,
}: BillingToggleProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-3">
      <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur">
        <Button
          type="button"
          variant={value === 'monthly' ? 'default' : 'ghost'}
          className="h-10 rounded-full px-6 text-sm font-semibold"
          onClick={() => onChange('monthly')}
        >
          {monthlyLabel}
        </Button>
        <Button
          type="button"
          variant={value === 'yearly' ? 'default' : 'ghost'}
          className="h-10 rounded-full px-6 text-sm font-semibold"
          onClick={() => onChange('yearly')}
        >
          {yearlyLabel}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200 shadow-[0_10px_24px_rgba(16,185,129,0.1)]">
          {savingsLabel}
        </div>
        {value === 'yearly' && yearlyValueLabel ? (
          <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100 shadow-[0_10px_24px_rgba(124,58,237,0.12)]">
            {yearlyValueLabel}
          </div>
        ) : null}
      </div>
    </div>
  )
}
