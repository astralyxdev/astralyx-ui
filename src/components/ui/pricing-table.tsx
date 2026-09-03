import { Check, Minus } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface, type Responsive } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Plans side by side, with a feature matrix.
 *
 * Every plan lists every feature — including the ones it does not have, shown
 * as an explicit dash. Omitting them makes the columns different lengths and
 * quietly hides what you would be giving up, which is the difference between a
 * comparison and an advertisement.
 *
 * The highlighted plan is marked with a border and a badge, never by being
 * taller or wider. Scaling one column up is the standard trick and it makes the
 * others hard to read.
 */
export type PricingFeature = {
  label: ReactNode
  /** `true`/`false` for a tick or dash, or text for a limit. */
  value: boolean | string
}

export type PricingPlan = {
  id: string
  name: string
  price: number
  /** Appended after the price — "/mo", "per seat". */
  period?: string
  currency?: string
  description?: ReactNode
  features: PricingFeature[]
  highlighted?: boolean
  badge?: ReactNode
  cta?: ReactNode
  onSelect?: () => void
}

const RESPONSIVE_COLUMNS = {
  sm: 'grid-cols-1 sm:grid-cols-2',
  md: 'grid-cols-1 md:grid-cols-3',
  lg: 'grid-cols-1 lg:grid-cols-3',
} as const

function PricingTable({
  plans,
  responsive = 'md',
  popularLabel = 'Popular',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  plans: PricingPlan[]
  responsive?: Responsive
  /** Default badge on the highlighted plan. */
  popularLabel?: ReactNode
}) {
  return (
    <div
      data-slot="pricing-table"
      className={cn(
        'grid gap-4',
        responsive === false ? 'grid-cols-3' : RESPONSIVE_COLUMNS[responsive],
        className,
      )}
      {...props}
    >
      {plans.map((plan) => (
        <article
          key={plan.id}
          data-highlighted={plan.highlighted || undefined}
          className={cn(
            surface,
            radius.surface,
            'flex flex-col p-5',
            // A border and a badge, never a size change.
            plan.highlighted && 'border-primary',
          )}
        >
          <header className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{plan.name}</h3>
              {plan.highlighted && !plan.badge && (
                <Badge size="sm" color="violet">
                  {popularLabel}
                </Badge>
              )}
              {plan.badge}
            </div>

            <p className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tabular-nums">
                <Fmt
                  type="currency"
                  value={plan.price}
                  currency={plan.currency ?? 'USD'}
                  decimals={plan.price % 1 === 0 ? 0 : 2}
                />
              </span>
              {plan.period && (
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              )}
            </p>

            {plan.description && (
              <p className="text-muted-foreground mt-2 text-sm text-pretty">
                {plan.description}
              </p>
            )}
          </header>

          <ul className="mb-5 flex flex-1 list-none flex-col gap-2">
            {plan.features.map((feature, index) => {
              const included = feature.value !== false
              return (
                <li key={index} className="flex items-start gap-2 text-sm">
                  {included ? (
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-[var(--green-soft-foreground)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <Minus
                      className="text-muted-foreground/40 mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      'min-w-0 flex-1',
                      included ? 'text-muted-foreground' : 'text-muted-foreground/50',
                    )}
                  >
                    {feature.label}
                    {typeof feature.value === 'string' && (
                      <span className="text-foreground ms-1 font-medium">
                        {feature.value}
                      </span>
                    )}
                    <span className="sr-only">
                      {included ? ' included' : ' not included'}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>

          {plan.cta ?? (
            <Button
              variant={plan.highlighted ? 'default' : 'secondary'}
              className="w-full"
              onClick={plan.onSelect}
            >
              Choose {plan.name}
            </Button>
          )}
        </article>
      ))}
    </div>
  )
}

export { PricingTable }
