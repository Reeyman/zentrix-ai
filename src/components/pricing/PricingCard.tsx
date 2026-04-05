import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatPlanPrice, type BillingInterval } from '@/lib/pricing'

type PricingCardProps = {
  name: string
  priceMonthly: number | null
  priceYearly: number | null
  currency: string
  description: string
  features: string[]
  ctaLabel: string
  highlighted?: boolean
  badge?: string
  billingInterval: BillingInterval
  secondaryText: string
  href: string
}

export function PricingCard({
  name,
  priceMonthly,
  priceYearly,
  currency,
  description,
  features,
  ctaLabel,
  highlighted,
  badge,
  billingInterval,
  secondaryText,
  href,
}: PricingCardProps) {
  const price = billingInterval === 'monthly' ? priceMonthly : priceYearly
  const suffix = price === null ? '' : billingInterval === 'monthly' ? 'per month' : 'per year'
  const isCustomPrice = price === null
  const billingNote =
    isCustomPrice
      ? 'Tailored plan and rollout terms'
      : billingInterval === 'monthly'
        ? 'Monthly billed'
        : `${formatPlanPrice(priceYearly, currency)} billed annually`
  const priceLabel = formatPlanPrice(price, currency)

  return (
    <Card
      className={[
        'relative flex h-full min-h-[620px] w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.92))] text-slate-50 shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_28px_90px_rgba(0,0,0,0.42)]',
        highlighted
          ? 'border-violet-300/60 ring-1 ring-violet-300/35 shadow-[0_30px_110px_rgba(91,33,182,0.32)] lg:-translate-y-2 lg:hover:-translate-y-3'
          : '',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),transparent_70%)]" />
      <CardHeader className="relative space-y-4 p-7 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Plan
            </div>
            <CardTitle className="text-3xl font-semibold text-white">{name}</CardTitle>
            <CardDescription className="min-h-[84px] text-sm leading-6 text-slate-300">
              {description}
            </CardDescription>
          </div>
          {badge ? (
            <Badge className="shrink-0 rounded-full border border-violet-300/25 bg-violet-500/20 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-violet-100 shadow-[0_10px_24px_rgba(124,58,237,0.14)] hover:bg-violet-500/20">
              {badge}
            </Badge>
          ) : null}
        </div>
        <div className="space-y-2 border-t border-white/10 pt-4">
          {highlighted && billingInterval === 'yearly' ? (
            <div className="inline-flex w-fit rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100">
              Best value
            </div>
          ) : null}
          <div className="flex min-h-[52px] items-end sm:min-h-[60px]">
            <div
              className={[
                'font-semibold tracking-tight text-white',
                isCustomPrice ? 'text-[2rem] leading-[1.02] sm:text-[2.15rem]' : 'text-4xl leading-none sm:text-5xl',
              ].join(' ')}
            >
              <span className={isCustomPrice ? 'whitespace-nowrap' : undefined}>{priceLabel}</span>
            </div>
          </div>
          {suffix ? <div className="text-sm font-medium text-slate-400">{suffix}</div> : null}
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{billingNote}</div>
        </div>
      </CardHeader>
      <CardContent className="relative flex flex-1 flex-col gap-5 px-7 pb-7 pt-0">
        <ul className="space-y-3 text-sm leading-6 text-slate-200">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-violet-300" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto min-h-[72px] text-sm leading-6 text-slate-400">
          {secondaryText}
        </div>
      </CardContent>
      <CardFooter className="px-7 pb-7 pt-0">
        <Button
          asChild
          className={[
            'h-11 w-full text-sm font-semibold',
            highlighted
              ? 'shadow-[0_16px_40px_rgba(124,58,237,0.28)] hover:shadow-[0_18px_46px_rgba(124,58,237,0.34)]'
              : 'border-white/12 bg-white/[0.02] text-slate-50 hover:bg-white/[0.06]',
          ].join(' ')}
          variant={highlighted ? 'default' : 'outline'}
        >
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
