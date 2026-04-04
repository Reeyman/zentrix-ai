'use client'

import { useMemo, useState } from 'react'

import { BillingToggle } from '@/components/pricing/BillingToggle'
import { ComingSoonSection } from '@/components/pricing/ComingSoonSection'
import { FaqSection } from '@/components/pricing/FaqSection'
import { FeatureComparisonTable } from '@/components/pricing/FeatureComparisonTable'
import { FinalCtaSection } from '@/components/pricing/FinalCtaSection'
import { PricingCard } from '@/components/pricing/PricingCard'
import { PricingHero } from '@/components/pricing/PricingHero'
import {
  COMING_SOON_ITEMS,
  PRICING_COMPARISON_SECTIONS,
  PRICING_FAQS,
  PRICING_PAGE_COPY,
  PRICING_PLANS,
  PRODUCT_CATEGORY_NAME,
  type BillingInterval,
} from '@/lib/pricing'

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')

  const plans = useMemo(() => {
    return [...PRICING_PLANS]
      .filter((plan) => plan.is_public)
      .sort((left, right) => left.sort_order - right.sort_order)
  }, [])

  return (
    <main className="min-h-screen overflow-hidden bg-[#060a12] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.2),transparent_28%)]" />
      <div className="relative px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:gap-14">
          <section className="flex flex-col gap-5 lg:gap-6">
            <PricingHero
              headline={PRICING_PAGE_COPY.hero.headline}
              subheadline={PRICING_PAGE_COPY.hero.subheadline}
              trustBadges={PRICING_PAGE_COPY.hero.trustBadges}
              categoryName={PRODUCT_CATEGORY_NAME}
            />

            <BillingToggle
              value={billingInterval}
              onChange={setBillingInterval}
              monthlyLabel={PRICING_PAGE_COPY.hero.monthlyLabel}
              yearlyLabel={PRICING_PAGE_COPY.hero.yearlyLabel}
              savingsLabel={PRICING_PAGE_COPY.hero.savingsBadge}
              yearlyValueLabel={PRICING_PAGE_COPY.hero.yearlyValueLabel}
            />

            <section className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.code} id={plan.code} className="h-full">
                  <PricingCard
                    name={plan.name}
                    priceMonthly={plan.monthly_price_cents}
                    priceYearly={plan.yearly_price_cents}
                    currency={plan.currency}
                    description={plan.description}
                    features={plan.features}
                    ctaLabel={plan.ctaLabel}
                    highlighted={plan.highlighted}
                    badge={plan.badge}
                    billingInterval={billingInterval}
                    secondaryText={plan.secondaryText}
                    href={plan.code === 'enterprise' ? '/contact-sales' : '/login'}
                  />
                </div>
              ))}
            </section>
          </section>

          <FeatureComparisonTable
            heading={PRICING_PAGE_COPY.comparison.heading}
            subheading={PRICING_PAGE_COPY.comparison.subheading}
            sections={PRICING_COMPARISON_SECTIONS}
          />

          <ComingSoonSection
            heading={PRICING_PAGE_COPY.comingSoon.heading}
            subheading={PRICING_PAGE_COPY.comingSoon.subheading}
            items={COMING_SOON_ITEMS}
          />

          <section className="space-y-8 lg:space-y-10">
            <FaqSection items={PRICING_FAQS} />

            <div id="enterprise">
              <FinalCtaSection
                heading={PRICING_PAGE_COPY.finalCta.heading}
                subheading={PRICING_PAGE_COPY.finalCta.subheading}
                primaryLabel={PRICING_PAGE_COPY.finalCta.primaryLabel}
                secondaryLabel={PRICING_PAGE_COPY.finalCta.secondaryLabel}
                tertiaryLabel={PRICING_PAGE_COPY.finalCta.tertiaryLabel}
                stepsHeading={PRICING_PAGE_COPY.finalCta.stepsHeading}
                steps={PRICING_PAGE_COPY.finalCta.steps}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
