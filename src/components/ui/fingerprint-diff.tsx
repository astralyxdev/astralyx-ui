import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Two device fingerprints side by side, with the differing attributes called
 * out.
 *
 * Fingerprints are thirty-odd attributes of which twenty-eight usually match, so
 * matching rows are collapsed by default. The question is never "what does this
 * device look like" — it is "what changed between these two sessions", and
 * everything identical is noise hiding the two lines that matter.
 *
 * A missing attribute is shown as absent rather than blank. A fingerprint that
 * *stopped reporting* its canvas hash is itself a signal — usually an
 * anti-detect browser — and rendering it as an empty cell loses that entirely.
 */
export type FingerprintAttribute = {
  key: string
  label?: ReactNode
  left?: string | number | null
  right?: string | number | null
  /** Weight this attribute carries when it differs. */
  significance?: 'high' | 'normal'
}

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

function FingerprintDiff({
  attributes,
  leftLabel = 'Session A',
  rightLabel = 'Session B',
  defaultShowMatching = false,
  identicalMessage = 'Every attribute matches.',
  significanceLabel = 'high significance',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  attributes: FingerprintAttribute[]
  leftLabel?: ReactNode
  rightLabel?: ReactNode
  defaultShowMatching?: boolean
  identicalMessage?: ReactNode
  /** Accessible name for the high-significance marker. */
  significanceLabel?: string
}) {
  const [showMatching, setShowMatching] = useState(defaultShowMatching)

  const rows = useMemo(
    () =>
      attributes.map((attribute) => {
        const left = display(attribute.left)
        const right = display(attribute.right)
        return {
          ...attribute,
          left,
          right,
          differs: left !== right,
          // Stopping to report an attribute is itself a signal.
          absent: left === null || right === null,
        }
      }),
    [attributes],
  )

  const changed = rows.filter((row) => row.differs)
  const visible = showMatching ? rows : changed

  return (
    <div
      data-slot="fingerprint-diff"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <span className="text-xs font-medium">{leftLabel}</span>
        <ArrowRight className="text-muted-foreground size-3.5" aria-hidden="true" />
        <span className="text-xs font-medium">{rightLabel}</span>
        <Badge size="sm" color={changed.length > 0 ? 'amber' : 'green'} className="ms-1">
          {changed.length === 0
            ? 'identical'
            : `${changed.length} of ${rows.length} differ`}
        </Badge>
        {changed.length < rows.length && (
          <Button
            variant="ghost"
            size="xs"
            className="ms-auto"
            onClick={() => setShowMatching((current) => !current)}
          >
            {showMatching ? 'Hide matching' : `Show ${rows.length - changed.length} matching`}
          </Button>
        )}
      </div>

      <dl className="divide-border grid list-none grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,1fr)] divide-y">
        {visible.map((row) => (
          <div key={row.key} className="col-span-3 grid grid-cols-subgrid items-baseline px-3 py-2">
            <dt className="text-muted-foreground truncate font-mono text-xs">
              {row.label ?? row.key}
              {row.differs && row.significance === 'high' && (
                <span className="text-[var(--destructive-soft-foreground)]" aria-label={significanceLabel}>
                  {' '}
                  !
                </span>
              )}
            </dt>
            <dd
              className={cn(
                'min-w-0 truncate font-mono text-xs',
                row.differs && 'bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] px-1',
                row.left === null && 'text-muted-foreground/60 italic',
              )}
            >
              {row.left ?? 'not reported'}
            </dd>
            <dd
              className={cn(
                'min-w-0 truncate font-mono text-xs',
                row.differs && 'bg-[color-mix(in_oklab,var(--green)_12%,transparent)] px-1',
                row.right === null && 'text-muted-foreground/60 italic',
              )}
            >
              {row.right ?? 'not reported'}
            </dd>
          </div>
        ))}

        {visible.length === 0 && (
          <p className="text-muted-foreground col-span-3 px-3 py-4 text-center text-xs">
            {identicalMessage}
          </p>
        )}
      </dl>
    </div>
  )
}

export { FingerprintDiff }
