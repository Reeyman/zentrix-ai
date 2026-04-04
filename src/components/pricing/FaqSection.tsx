import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PricingFaqItem } from '@/lib/pricing'

type FaqSectionProps = {
  items: PricingFaqItem[]
}

export function FaqSection({ items }: FaqSectionProps) {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-7">
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">FAQ</h2>
        <p className="mx-auto max-w-3xl text-[15px] leading-7 text-slate-300 sm:text-base">
          Common questions about trials, billing, enterprise rollout, and API access.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((item) => (
          <Card
            key={item.question}
            className="rounded-[26px] border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.94))] text-slate-50 shadow-[0_20px_70px_rgba(0,0,0,0.24)]"
          >
            <CardHeader className="space-y-3 p-6 pb-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Question
              </div>
              <CardTitle className="text-xl leading-7 text-white">{item.question}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-[15px] leading-8 text-slate-300">
              {item.answer}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
