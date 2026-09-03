import { useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, Search, TriangleAlert } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import { Badge } from '@/components/ui/badge'
import { WalletAddress } from '@/components/ui/wallet-address'
import {
  fieldBase,
  fieldSize,
  menuItem,
  menuSurface,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A token picker with balances and search.
 *
 * The security-critical part is what happens for a token that is not on the
 * list. Symbols are not unique — anyone can deploy a contract called "USDC" —
 * so a search that matches on symbol alone is a scam vector. Unverified tokens
 * are therefore segregated below a divider, badged, and shown with their
 * contract address rather than trusting the name they claim.
 *
 * Balances sort the list, because the token you want is nearly always one you
 * hold. Zero-balance tokens keep their place in the catalogue but fall below
 * anything with a balance.
 */
export type TokenOption = {
  address: string
  symbol: string
  name?: ReactNode
  icon?: ReactNode
  /** Formatted balance. */
  balance?: string
  /** Numeric balance, used only for ordering. */
  balanceValue?: number
  fiat?: number
  /** False marks a token not on the trusted list. */
  verified?: boolean
}

function TokenSelect({
  tokens,
  value,
  onValueChange,
  size = 'md',
  placeholder = 'Select a token',
  disabled = false,
  locale = 'en-GB',
  currency = 'USD',
  unverifiedLabel = 'Unverified',
  unverifiedNote = 'Not on the trusted list. Anyone can deploy a token using an existing symbol — check the contract address.',
  searchPlaceholder = 'Search name or paste address',
  searchLabel = 'Search tokens',
  listLabel = 'Tokens',
  emptyMessage = 'No tokens match.',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & {
  tokens: TokenOption[]
  /** Contract address of the selected token. */
  value?: string
  onValueChange?: (address: string) => void
  size?: keyof typeof fieldSize
  placeholder?: string
  disabled?: boolean
  locale?: string
  currency?: string
  /** Badge on a token missing from the trusted list. */
  unverifiedLabel?: ReactNode
  unverifiedNote?: ReactNode
  searchPlaceholder?: string
  /** Accessible name for the search field. */
  searchLabel?: string
  /** Accessible name for the listbox. */
  listLabel?: string
  emptyMessage?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

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
    onDismiss: () => {
      setOpen(false)
      setQuery('')
      triggerRef.current?.focus()
    },
    refs: [triggerRef, panelRef],
  })

  const selected = tokens.find((token) => token.address === value)

  const { trusted, unverified } = useMemo(() => {
    const term = query.trim().toLowerCase()
    const matches = tokens.filter(
      (token) =>
        !term ||
        token.symbol.toLowerCase().includes(term) ||
        String(token.name ?? '').toLowerCase().includes(term) ||
        token.address.toLowerCase().includes(term),
    )
    // Held tokens first — the one you want is usually one you have.
    const byBalance = (a: TokenOption, b: TokenOption) =>
      (b.balanceValue ?? 0) - (a.balanceValue ?? 0)

    return {
      trusted: matches.filter((t) => t.verified !== false).sort(byBalance),
      unverified: matches.filter((t) => t.verified === false).sort(byBalance),
    }
  }, [tokens, query])

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  })

  const Row = ({ token }: { token: TokenOption }) => (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={token.address === value}
        onClick={() => {
          onValueChange?.(token.address)
          setOpen(false)
          setQuery('')
        }}
        className={cn(menuItem, radius.control, 'py-2')}
      >
        {token.icon ?? (
          <span className="bg-secondary text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium [corner-shape:round]">
            {token.symbol.slice(0, 3)}
          </span>
        )}

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium">{token.symbol}</span>
            {token.verified === false && (
              <Badge size="sm" color="amber">
                {unverifiedLabel}
              </Badge>
            )}
          </span>
          {token.verified === false ? (
            // Show the address, not the name it claims.
            <WalletAddress
              address={token.address}
              size="sm"
              copyable={false}
              className="text-muted-foreground"
            />
          ) : (
            token.name && (
              <span className="text-muted-foreground truncate text-xs">{token.name}</span>
            )
          )}
        </span>

        {token.balance && (
          <span className="shrink-0 text-end">
            <span className="block text-sm tabular-nums">{token.balance}</span>
            {token.fiat !== undefined && (
              <span className="text-muted-foreground block text-xs tabular-nums">
                {money.format(token.fiat)}
              </span>
            )}
          </span>
        )}
      </button>
    </li>
  )

  return (
    <div data-slot="token-select" className={cn('relative', className)} {...props}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setOpen(!open)
          if (!open) requestAnimationFrame(() => searchRef.current?.focus())
        }}
        className={cn(
          fieldBase,
          fieldSize[size],
          'border-border bg-background justify-between border text-start',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        {selected?.icon}
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-muted-foreground/70')}>
          {selected?.symbol ?? placeholder}
        </span>
        {selected?.verified === false && (
          <TriangleAlert className="size-3.5 shrink-0 text-[var(--amber-soft-foreground)]" />
        )}
        <ChevronDown
          className={cn(
            'text-muted-foreground shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div ref={panelRef} style={style} className={cn(menuSurface, radius.surface, 'max-h-80 p-0')}>
          <div className="border-border flex items-center gap-2 border-b p-2.5">
            <Search className="text-muted-foreground size-3.5 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              onChange={(event) => setQuery(event.target.value)}
              className="placeholder:text-muted-foreground/70 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <ul role="listbox" aria-label={listLabel} className="max-h-64 list-none overflow-y-auto p-1">
            {trusted.map((token) => (
              <Row key={token.address} token={token} />
            ))}

            {unverified.length > 0 && (
              <li>
                <div className="border-border mt-1 flex items-start gap-1.5 border-t p-2.5">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-[var(--amber-soft-foreground)]" />
                  <p className="text-muted-foreground text-[11px]">
                    {unverifiedNote}
                  </p>
                </div>
              </li>
            )}
            {unverified.map((token) => (
              <Row key={token.address} token={token} />
            ))}

            {trusted.length === 0 && unverified.length === 0 && (
              <li className="text-muted-foreground px-2.5 py-6 text-center text-sm">
                {emptyMessage}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export { TokenSelect }
