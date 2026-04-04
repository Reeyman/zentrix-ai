import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { PricingComparisonSection } from '@/lib/pricing'
import { Fragment } from 'react'

type FeatureComparisonTableProps = {
  heading: string
  subheading: string
  sections: PricingComparisonSection[]
}

function getValueClassName(value: string) {
  const normalized = value.toLowerCase()

  if (normalized === 'included' || normalized === 'priority') {
    return 'text-emerald-300'
  }

  if (normalized === 'not included') {
    return 'text-rose-300'
  }

  if (
    normalized.includes('advanced') ||
    normalized.includes('custom') ||
    normalized.includes('unlimited') ||
    normalized.includes('metered')
  ) {
    return 'text-violet-200'
  }

  if (normalized.includes('basic') || normalized.includes('limited')) {
    return 'text-sky-200'
  }

  return 'text-slate-200'
}

export function FeatureComparisonTable({ heading, subheading, sections }: FeatureComparisonTableProps) {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-7">
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{heading}</h2>
        <p className="mx-auto max-w-3xl text-[15px] leading-7 text-slate-300 sm:text-base">{subheading}</p>
      </div>
      <Card className="overflow-hidden rounded-[30px] border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.95))] text-slate-50 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <CardHeader className="space-y-2 p-7 pb-5">
          <CardTitle className="text-2xl text-white">Plan comparison</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-300">See what each plan includes.</CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-0">
          <div className="overflow-x-auto rounded-2xl border border-white/6 bg-white/[0.03]">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04] text-slate-300">
                  <th className="py-4 pl-5 pr-4 text-xs font-semibold uppercase tracking-[0.18em]">Feature</th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em]">Starter</th>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Professional</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em]">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <Fragment key={section.title}>
                    <tr className="border-y border-white/8 bg-white/[0.05]">
                      <td colSpan={4} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row, index) => (
                      <tr key={`${section.title}-${row.feature}`} className={`border-b border-white/6 align-top transition-colors hover:bg-white/[0.03] ${index % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                        <td className="py-4 pl-5 pr-4 font-medium text-white">
                          <div className="space-y-1">
                            <div>{row.feature}</div>
                            {row.helperText ? <div className="max-w-sm text-xs font-normal leading-5 text-slate-400">{row.helperText}</div> : null}
                          </div>
                        </td>
                        <td className={`px-4 py-4 ${getValueClassName(row.starter)}`}>{row.starter}</td>
                        <td className={`px-4 py-4 ${getValueClassName(row.professional)}`}>{row.professional}</td>
                        <td className={`px-5 py-4 ${getValueClassName(row.enterprise)}`}>{row.enterprise}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
