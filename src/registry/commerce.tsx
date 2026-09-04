import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Cart, type CartLine } from '@/components/ui/cart'
import { CheckoutSummary, type CheckoutLine } from '@/components/ui/checkout-summary'
import { SubscriptionState, type SubscriptionStatus } from '@/components/ui/subscription-state'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

/* --------------------------------------------------------------------- cart */

const LINES: CartLine[] = [
  { id: 'c1', name: 'Aeron chair — remastered', variant: 'Size B · Graphite', price: 149_500, quantity: 1, max: 3 },
  { id: 'c2', name: 'Monitor arm, single', variant: 'Silver', price: 21_900, quantity: 2, max: 2 },
  { id: 'c3', name: 'Desk mat', variant: 'Charcoal, 90×40', price: 4_500, quantity: 1 },
]

function CartDemo() {
  const [lines, setLines] = useState(LINES)
  return (
    <div className="w-full max-w-lg">
      <Cart
        lines={lines}
        currency="GBP"
        onQuantityChange={(id, quantity) =>
          setLines((current) => current.map((line) => (line.id === id ? { ...line, quantity } : line)))
        }
        onRemove={(id) => setLines((current) => current.filter((line) => line.id !== id))}
      />
    </div>
  )
}

export const cartEntry: ComponentEntry = {
  id: 'cart',
  label: 'Cart',
  description:
    'A basket with quantities and per-line totals. Stock limits are enforced at the stepper, not on submit — letting someone add a ninth of eight units and saying so at checkout is the worst possible order.',
  usage: `import { Cart } from '@/components/ui/cart'

<Cart lines={lines} onQuantityChange={setQuantity} onRemove={remove} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'editable', label: 'editable', default: true },
      { type: 'boolean', prop: 'empty', label: 'empty', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-lg">
        <Cart
          lines={state.empty ? [] : LINES}
          currency="GBP"
          onQuantityChange={state.editable ? () => {} : undefined}
          onRemove={state.editable ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<Cart lines={lines} onQuantityChange={setQuantity} onRemove={remove} />`,
  },
  api: [
    { name: 'lines', type: 'CartLine[]', description: '`{ id, name, price, quantity, variant?, image?, max?, note? }`. Price is minor units per unit.' },
    { name: 'unit and line total', type: 'both shown', description: 'Once quantity exceeds one. Showing only the total makes it uncheckable; showing only the unit price makes the sum look wrong.' },
    { name: 'max', type: 'number', description: 'Caps the increment control and explains why in words underneath.' },
    { name: 'onRemove', type: '(id) => void', description: 'Separate from decrementing, so reaching zero is never how something gets deleted.' },
    { name: 'quantity control', type: 'stepper', description: 'Not a free number field. A cart quantity is realistically 1–10, and a text input invites "12" where "1" was meant.' },
  ],
  demos: [
    { title: 'Live basket', stack: true, code: `<Cart lines={lines} onQuantityChange={setQuantity} onRemove={remove} />`, render: () => <CartDemo /> },
  ],
}

/* --------------------------------------------------------- checkout summary */

const ADJUSTMENTS: CheckoutLine[] = [
  { id: 'k1', label: 'Discount — WELCOME10', amount: -17_640 },
  { id: 'k2', label: 'Delivery', amount: null, note: 'Depends on your address' },
  { id: 'k3', label: 'VAT (20%)', amount: 31_752 },
]

export const checkoutSummaryEntry: ComponentEntry = {
  id: 'checkout-summary',
  label: 'Checkout Summary',
  description:
    'The order total, broken into its lines. A charge that is not yet known renders as "calculated at next step" rather than as £0.00 — showing zero for a charge you will apply is a promise you cannot keep.',
  usage: `import { CheckoutSummary } from '@/components/ui/checkout-summary'

<CheckoutSummary subtotal={176_400} lines={lines} currency="GBP" />`,
  composer: {
    controls: [
      { type: 'boolean', prop: 'pending', label: 'unknown delivery', default: true },
      { type: 'boolean', prop: 'discount', label: 'discount', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <CheckoutSummary
          subtotal={176_400}
          currency="GBP"
          lines={ADJUSTMENTS.filter(
            (line) =>
              (state.discount || line.id !== 'k1') && (state.pending || line.id !== 'k2'),
          )}
          footer={<Button className="w-full">Continue to payment</Button>}
        />
      </div>
    ),
    code: () => `<CheckoutSummary subtotal={176400} lines={lines} currency="GBP" />`,
  },
  api: [
    { name: 'subtotal', type: 'number', description: 'Minor units, before adjustments.' },
    { name: 'lines', type: 'CheckoutLine[]', description: '`{ id, label, amount, note?, discount? }`. Every adjustment gets its own row — a total that silently folds in tax and shipping is the commonest cause of an abandoned basket.' },
    { name: 'amount: null', type: 'not yet known', description: 'Renders as pending and marks the total as provisional.' },
    { name: 'total', type: 'summed here', description: 'From the rows shown, so it cannot disagree with them.' },
    { name: 'footer', type: 'ReactNode', description: 'Where the continue button goes.' },
  ],
  demos: [
    { title: 'With a discount and an unknown charge', stack: true, code: `<CheckoutSummary subtotal={193_300} currency="GBP" lines={adjustments} />`,
      render: () => (<div className="w-full max-w-sm"><CheckoutSummary subtotal={193_300} currency="GBP" lines={ADJUSTMENTS} /></div>) },
    { title: 'Nothing added', stack: true, code: `<CheckoutSummary subtotal={4_900} currency="GBP" />`,
      render: () => (<div className="w-full max-w-sm"><CheckoutSummary subtotal={4_900} currency="GBP" /></div>) },
  ],
}

/* -------------------------------------------------------- subscription state */

export const subscriptionStateEntry: ComponentEntry = {
  id: 'subscription-state',
  label: 'Subscription State',
  description:
    'Plan, price and what happens next. A cancelled subscription with three weeks of access left is the case people most often get wrong, and a status badge alone never says it.',
  usage: `import { SubscriptionState } from '@/components/ui/subscription-state'

<SubscriptionState plan="Team" status="active" price={4900} renewsAt={renews} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'status', label: 'status', options: ['active', 'trialing', 'past_due', 'canceled', 'paused'], default: 'active' },
      { type: 'boolean', prop: 'seats', label: 'seats', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <SubscriptionState
          plan="Team — 12 seats"
          status={state.status as SubscriptionStatus}
          price={4_900}
          currency="GBP"
          period="month"
          renewsAt={days(18)}
          endsAt={days(21)}
          trialEndsAt={days(4)}
          seats={state.seats ? { used: 9, total: 12 } : undefined}
          onFixPayment={() => {}}
          actions={<Button size="sm" variant="secondary">Change plan</Button>}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<SubscriptionState\n  plan="Team"\n  status="${state.status}"\n  price={4900}\n  renewsAt={renews}\n/>`,
  },
  api: [
    { name: 'status', type: 'SubscriptionStatus', description: "'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'. Each renders a different sentence, because each answers a different question." },
    { name: 'endsAt', type: 'Date', description: 'When access actually stops. For a cancelled subscription this is not the same as the renewal date, and conflating them is the bug.' },
    { name: 'trialEndsAt', type: 'Date', description: 'Rendered as days remaining. "Ends 14 March" needs a calendar; "4 days left" does not.' },
    { name: 'past_due', type: 'strongest treatment', description: 'The only state where a paying customer can lose access, and usually fixable in one click — so it gets a border and its own action.' },
    { name: 'price', type: 'number', description: 'Minor units per period. Whole amounts drop the decimals.' },
  ],
  demos: [
    { title: 'Active, past due and cancelling', stack: true, code: `<SubscriptionState plan="Team" status="active" renewsAt={renewsAt} />`,
      render: () => (<div className="flex w-full max-w-md flex-col gap-3"><SubscriptionState plan="Team" status="active" seats={{ used: 9, total: 12 }} price={4_900} currency="GBP" renewsAt={new Date(NOW.getTime() + 21 * 86_400_000)} /><SubscriptionState plan="Team" status="past_due" seats={{ used: 9, total: 12 }} price={4_900} currency="GBP" /><SubscriptionState plan="Pro" status="canceled" seats={{ used: 3, total: 3 }} price={1_900} currency="GBP" endsAt={new Date(NOW.getTime() + 6 * 86_400_000)} /></div>) },
  ],
}
