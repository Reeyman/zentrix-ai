import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { ComingSoonItem } from '@/lib/pricing'

type ComingSoonSectionProps = {
  heading: string
  subheading: string
  items: ComingSoonItem[]
}

export function ComingSoonSection({ heading, subheading, items }: ComingSoonSectionProps) {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-7">
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{heading}</h2>
        <p className="mx-auto max-w-3xl text-[15px] leading-7 text-slate-300 sm:text-base">{subheading}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Card
            key={item.title}
            className="relative overflow-hidden rounded-[26px] border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.94))] text-slate-50 shadow-[0_20px_70px_rgba(0,0,0,0.28)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_68%)]" />
            <CardHeader className="relative space-y-3 p-6 pb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                Roadmap
              </div>
              <CardTitle className="text-xl leading-7 text-white">{item.title}</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-300">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative pt-0 text-sm leading-6 text-slate-400">
              Early access may be available for eligible customers.
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
