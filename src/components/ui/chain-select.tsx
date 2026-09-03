import { useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { AlertTriangle, Check, ChevronDown } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import { Badge } from '@/components/ui/badge'
import {
  fieldBase,
  fieldSize,
  focusRing,
  menuItem,
  menuSurface,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A network switcher.
 *
 * Testnets are labelled, always, and grouped below mainnets. The single most
 * expensive user error in this space is transacting on the wrong network, and
 * an unlabelled list where Sepolia sits between Ethereum and Arbitrum invites
 * exactly that.
 *
 * An unsupported chain is a first-class state rather than an empty trigger: a
 * wallet connected to a network the app does not handle must say so, since
 * every balance and address on screen is then meaningless.
 */
export type Chain = {
  id: number
  name: string
  /** Brand colour for the dot. */
  color?: string
  testnet?: boolean
  icon?: ReactNode
  /** Native currency symbol, shown beside the name. */
  symbol?: string
}

function ChainSelect({
  chains,
  value,
  onValueChange,
  size = 'md',
  disabled = false,
  unsupportedLabel = 'Unsupported network',
  testnetLabel = 'testnet',
  listLabel = 'Networks',
  testnetGroupLabel = 'Test networks',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & {
  chains: Chain[]
  /** Chain id. An id absent from `chains` renders the unsupported state. */
  value?: number
  onValueChange?: (id: number) => void
  size?: keyof typeof fieldSize
  disabled?: boolean
  unsupportedLabel?: string
  /** Badge on a test network. */
  testnetLabel?: ReactNode
  /** Accessible name for the listbox. */
  listLabel?: string
  /** Heading over the test networks, which sort last. */
  testnetGroupLabel?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  // Real refs, like every other layer in the kit: usePopper reads `.current`
  // from an effect, and a fresh object each render would churn its deps.
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { style } = usePopper({
    open,
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side: 'bottom',
    align: 'start',
    offset: 4,
    matchAnchorWidth: true,
  })

  useDismissable({
    open,
    onDismiss: () => setOpen(false),
    refs: [triggerRef, panelRef],
  })

  const active = chains.find((chain) => chain.id === value)
  const unsupported = value !== undefined && !active

  // Mainnets first: a testnet should never sit between two production chains.
  const ordered = [...chains].sort(
    (a, b) => Number(Boolean(a.testnet)) - Number(Boolean(b.testnet)),
  )

  return (
    <div data-slot="chain-select" className={cn('relative', className)} {...props}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          fieldBase,
          fieldSize[size],
          'justify-between gap-2 text-start',
          unsupported
            ? 'border-[var(--destructive)] bg-[color-mix(in_oklab,var(--destructive),transparent_92%)]'
            : 'border-border bg-background border',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        {unsupported ? (
          <>
            <AlertTriangle className="size-4 shrink-0 text-[var(--destructive-soft-foreground)]" />
            <span className="min-w-0 flex-1 truncate text-[var(--destructive-soft-foreground)]">
              {unsupportedLabel}
            </span>
          </>
        ) : (
          <>
            {active?.icon ?? (
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full [corner-shape:round]"
                style={{ backgroundColor: active?.color ?? 'var(--border)' }}
              />
            )}
            <span className="min-w-0 flex-1 truncate">
              {active?.name ?? 'Select network'}
            </span>
            {active?.testnet && <Badge size="sm">{testnetLabel}</Badge>}
          </>
        )}

        <ChevronDown
          className={cn(
            'text-muted-foreground shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={style}
          className={cn(menuSurface, radius.surface, 'max-h-72 min-w-52')}
        >
          <ul role="listbox" aria-label={listLabel} className="list-none">
            {ordered.map((chain, index) => {
              const first = chain.testnet && !ordered[index - 1]?.testnet
              return (
                <li key={chain.id}>
                  {first && (
                    <div className="text-muted-foreground border-border mt-1 border-t p-2.5 text-[11px] font-medium tracking-wide uppercase">
                      {testnetGroupLabel}
                    </div>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={chain.id === value}
                    onClick={() => {
                      onValueChange?.(chain.id)
                      setOpen(false)
                    }}
                    className={cn(menuItem, radius.control, focusRing)}
                  >
                    {chain.icon ?? (
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full [corner-shape:round]"
                        style={{ backgroundColor: chain.color ?? 'var(--border)' }}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">{chain.name}</span>
                    {chain.symbol && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {chain.symbol}
                      </span>
                    )}
                    {chain.id === value && <Check className="size-3.5 shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export { ChainSelect }
