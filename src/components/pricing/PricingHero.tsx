import { Badge } from '@/components/ui/badge'

type PricingHeroProps = {
  headline: string
  subheadline: string
  trustBadges: readonly string[]
  categoryName: string
}

export function PricingHero({
  headline,
  subheadline,
  trustBadges,
  categoryName,
}: PricingHeroProps) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 text-center sm:gap-5">
      <Badge
        variant="outline"
        className="border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
      >
        {categoryName}
      </Badge>
      <div className="space-y-3.5 sm:space-y-4">
        <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[4.25rem] lg:leading-[1.02]">
          {headline}
        </h1>
        <p className="mx-auto max-w-3xl text-[15px] leading-7 text-slate-200 sm:text-lg sm:leading-8">
          {subheadline}
        </p>
      </div>
      <div className="flex max-w-3xl flex-wrap items-center justify-center gap-2.5">
        {trustBadges.map((badge) => (
          <div
            key={badge}
            className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-medium text-slate-100 shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
          >
            {badge}
          </div>
        ))}
      </div>
    </section>
  )
}
