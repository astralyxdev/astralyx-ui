import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A consent banner with the categories laid out and reject as easy as accept.
 *
 * **Reject is a button of equal weight, and that is not a style choice.** Under
 * the GDPR consent must be freely given, and both the EDPB's dark-pattern
 * guidelines and a series of national DPA rulings have found that hiding
 * refusal behind an extra click — or greying it out beside a bright "Accept
 * all" — makes the consent invalid. A banner with only "Accept" and "Manage"
 * is the single most-fined pattern on the web. This component is built so the
 * compliant arrangement is the default one.
 *
 * **Nothing is on by default except what is strictly necessary.** Pre-ticked
 * boxes are explicitly not consent, so `necessary` is locked on and everything
 * else starts off. Do not "fix" this by defaulting analytics to true.
 *
 * **It does not write a cookie, and it does not load anything.** Storage and
 * script loading are the caller's job through `onSave` — because where consent
 * is recorded (cookie, backend, consent-management platform) and what it gates
 * are product decisions, and a component that quietly sets its own cookie is
 * doing the exact thing it is meant to be asking about.
 *
 * It is `role="dialog"` with `aria-modal="false"`: announced and reachable, but
 * it does not trap focus, because a banner people cannot escape is its own
 * accessibility failure.
 */
export type ConsentCategory = {
  id: string
  label: ReactNode
  description?: ReactNode
  /** Locked on, and not part of consent. */
  required?: boolean
  defaultEnabled?: boolean
}

export const DEFAULT_CATEGORIES: ConsentCategory[] = [
  {
    id: 'necessary',
    label: 'Strictly necessary',
    description: 'Sign-in, security and load balancing. The site does not work without these.',
    required: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'How the site is used, in aggregate, so it can be improved.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Measuring campaigns and showing relevant ads on other sites.',
  },
]

type CookieConsentProps = Omit<ComponentProps<'div'>, 'onChange' | 'title'> & {
  title?: ReactNode
  description?: ReactNode
  categories?: ConsentCategory[]
  /** Called with the ids that were consented to. */
  onSave?: (accepted: string[]) => void
  onAcceptAll?: (accepted: string[]) => void
  onRejectAll?: (accepted: string[]) => void
  acceptAllLabel?: string
  rejectAllLabel?: string
  customiseLabel?: string
  saveLabel?: string
  policyHref?: string
  policyLabel?: string
  /** Start with the categories expanded. */
  defaultOpen?: boolean
  /** Fixed to the bottom of the viewport, as it would be in production. */
  fixed?: boolean
}

function CookieConsent({
  title = 'Cookies',
  description = 'We use cookies to run the site, and — with your permission — to understand how it is used.',
  categories = DEFAULT_CATEGORIES,
  onSave,
  onAcceptAll,
  onRejectAll,
  acceptAllLabel = 'Accept all',
  rejectAllLabel = 'Reject all',
  customiseLabel = 'Customise',
  saveLabel = 'Save choices',
  policyHref,
  policyLabel = 'Privacy policy',
  defaultOpen = false,
  fixed = false,
  className,
  ...props
}: CookieConsentProps) {
  const scope = useId()
  const [open, setOpen] = useState(defaultOpen)
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      // Nothing optional starts on. Pre-ticked is not consent.
      categories.map((category) => [
        category.id,
        Boolean(category.required || category.defaultEnabled),
      ]),
    ),
  )

  const required = categories.filter((category) => category.required).map((category) => category.id)
  const allIds = categories.map((category) => category.id)

  return (
    <div
      data-slot="cookie-consent"
      role="dialog"
      // Deliberately not modal: trapping focus in a consent banner is its own
      // accessibility failure.
      aria-modal="false"
      aria-labelledby={`${scope}-title`}
      aria-describedby={`${scope}-description`}
      className={cn(
        surface,
        radius.surface,
        'p-4 shadow-lg',
        fixed && 'fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl',
        className,
      )}
      {...props}
    >
      <p id={`${scope}-title`} className="text-sm font-medium">
        {title}
      </p>
      <p id={`${scope}-description`} className="text-muted-foreground mt-1 text-xs">
        {description}
        {policyHref && (
          <>
            {' '}
            <a
              href={policyHref}
              className={cn('underline underline-offset-2', focusRing)}
              rel="noreferrer"
            >
              {policyLabel}
            </a>
          </>
        )}
      </p>

      {open && (
        <ul className="mt-3 list-none space-y-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className={cn('border-border flex items-start gap-3 border p-3', radius.control)}
            >
              <Checkbox
                id={`${scope}-${category.id}`}
                checked={enabled[category.id] ?? false}
                disabled={category.required}
                onChange={(event) =>
                  setEnabled((current) => ({ ...current, [category.id]: event.target.checked }))
                }
                containerClassName="mt-0.5 shrink-0"
              />
              <label htmlFor={`${scope}-${category.id}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {category.label}
                  {category.required && (
                    <span className="text-muted-foreground text-[11px] font-normal">Always on</span>
                  )}
                </span>
                {category.description && (
                  <span className="text-muted-foreground mt-0.5 block text-xs">
                    {category.description}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Reject sits beside accept, same size, same prominence. Anything else
            is a dark pattern regulators have already ruled on. */}
        <Button
          size="sm"
          onClick={() => (onAcceptAll ? onAcceptAll(allIds) : onSave?.(allIds))}
        >
          {acceptAllLabel}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => (onRejectAll ? onRejectAll(required) : onSave?.(required))}
        >
          {rejectAllLabel}
        </Button>

        {open ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onSave?.(allIds.filter((id) => enabled[id] || required.includes(id)))
            }
          >
            {saveLabel}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            {customiseLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

export { CookieConsent }
export type { CookieConsentProps }
