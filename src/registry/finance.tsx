import { useState } from 'react'
import { CardInput } from '@/components/ui/card-input'
import { LedgerTable, type LedgerEntry } from '@/components/ui/ledger-table'
import { MoneyInput } from '@/components/ui/money-input'
import { PaymentMethodList, type PaymentMethod } from '@/components/ui/payment-method'
import { PayoutStatus, type PayoutState } from '@/components/ui/payout-status'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

/* -------------------------------------------------------------- money input */

function MoneyDemo() {
  const [value, setValue] = useState<number | undefined>(2450)
  return (
    <div className="flex w-64 flex-col gap-2">
      <MoneyInput value={value} onValueChange={setValue} currency="EUR" locale="de-DE" />
      <p className="text-muted-foreground text-xs tabular-nums">
        {value === undefined ? 'empty' : `${value} minor units`}
      </p>
    </div>
  )
}

export const moneyInputEntry: ComponentEntry = {
  id: 'money-input',
  label: 'Money Input',
  description:
    'A currency field that reads and writes integer minor units. Money that has been through a float has already lost — the value that leaves this control is a whole number of cents.',
  usage: `import { MoneyInput } from '@/components/ui/money-input'

<MoneyInput value={cents} onValueChange={setCents} currency="USD" />`,
  composer: {
    controls: [
      { type: 'select', prop: 'currency', label: 'currency', options: ['USD', 'EUR', 'GBP', 'JPY'], default: 'USD' },
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'md', 'lg'], default: 'md' },
      { type: 'select', prop: 'variant', label: 'variant', options: ['default', 'secondary', 'ghost'], default: 'default' },
      { type: 'boolean', prop: 'error', label: 'error', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-56">
        <MoneyInput
          defaultValue={125_000}
          currency={String(state.currency)}
          size={state.size as 'sm' | 'md' | 'lg'}
          variant={state.variant as 'default' | 'secondary' | 'ghost'}
          error={Boolean(state.error)}
          disabled={Boolean(state.disabled)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<MoneyInput\n  value={cents}\n  onValueChange={setCents}\n  currency="${state.currency}"\n  size="${state.size}"\n/>`,
  },
  api: [
    { name: 'value / defaultValue', type: 'number', description: 'Minor units. `250` is $2.50, never `2.5`.' },
    { name: 'onValueChange', type: '(minor?: number) => void', description: 'Fires with the integer value, or `undefined` when the field is cleared — which is not the same as zero.' },
    { name: 'currency', type: 'string', default: "'USD'", description: 'ISO 4217. Drives the symbol, its side, and the number of decimal places — JPY has none.' },
    { name: 'locale', type: 'string', default: "'en-GB'", description: 'Grouping and decimal separators. A German user typing `1.234,56` means 1234.56.' },
    { name: 'min / max', type: 'number', description: 'Minor units, clamped on blur rather than while typing, so you can still delete a digit.' },
  ],
  demos: [
    { title: 'Round-tripping minor units', code: `const [value, setValue] = useState(2450)\n\n<MoneyInput value={value} onValueChange={setValue} currency="EUR" locale="de-DE" />`, render: () => <MoneyDemo /> },
  ],
}

/* --------------------------------------------------------------- card input */

export const cardInputEntry: ComponentEntry = {
  id: 'card-input',
  label: 'Card Input',
  description:
    'Card number, expiry and CVC in one control, with brand detection and a Luhn check. Client-side validation catches the typo; it never claims the card is good.',
  usage: `import { CardInput } from '@/components/ui/card-input'

<CardInput onCardChange={(card) => setCard(card)} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'md', 'lg'], default: 'md' },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <CardInput size={state.size as 'sm' | 'md' | 'lg'} disabled={Boolean(state.disabled)} />
      </div>
    ),
    code: () => `<CardInput onCardChange={setCard} />`,
  },
  api: [
    { name: 'onCardChange', type: '(card) => void', description: 'Fires with `{ number, expiry, cvc, brand, valid }` on every keystroke. `valid` means the digits pass Luhn and the expiry is in the future — not that the card will authorise.' },
    { name: 'brand detection', type: 'automatic', description: 'From the issuer identification number, which also sets the expected length and the CVC length: Amex is 15 digits with a 4-digit code.' },
    { name: 'focus', type: 'automatic', description: 'Advances to expiry and then CVC as each segment fills, and steps back on backspace from an empty field.' },
    { name: 'security', type: 'none stored', description: 'The component holds the number in local state only, and never in a `name`d field that a form serialiser would sweep up.' },
  ],
  demos: [
    { title: 'Default and small', stack: true, code: `<CardInput onCardChange={setCard} />`,
      render: () => (<div className="flex w-full max-w-sm flex-col gap-4"><CardInput onCardChange={() => {}} /><CardInput size="sm" numberLabel="Card" onCardChange={() => {}} /></div>) },
  ],
}

/* ----------------------------------------------------------- payment method */

const METHODS: PaymentMethod[] = [
  { id: 'm1', kind: 'card', brand: 'Visa', last4: '4242', expiry: '11/28', holder: 'A. Okafor', isDefault: true },
  { id: 'm2', kind: 'card', brand: 'Mastercard', last4: '8210', expiry: '10/26', holder: 'A. Okafor' },
  { id: 'm3', kind: 'bank', brand: 'Monzo', last4: '0091', holder: 'Okafor Ltd' },
  { id: 'm4', kind: 'wallet', brand: 'PayPal', last4: 'a.ok', holder: 'a.okafor@example.com' },
]

function MethodsDemo() {
  const [selected, setSelected] = useState('m1')
  return (
    <div className="w-full max-w-md">
      <PaymentMethodList
        methods={METHODS}
        selected={selected}
        onSelect={setSelected}
        onSetDefault={() => {}}
        onRemove={() => {}}
        now={NOW}
      />
    </div>
  )
}

export const paymentMethodEntry: ComponentEntry = {
  id: 'payment-method',
  label: 'Payment Method',
  description:
    'Saved cards and accounts, with expiry warnings. A card expiring next month is the reason a subscription fails, and saying so before it does is the entire value of this list.',
  usage: `import { PaymentMethodList } from '@/components/ui/payment-method'

<PaymentMethodList methods={methods} selected={id} onSelect={setId} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'manage', label: 'manage actions', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <PaymentMethodList
          methods={METHODS}
          selected="m1"
          onSelect={() => {}}
          onRemove={state.manage ? () => {} : undefined}
          onSetDefault={state.manage ? () => {} : undefined}
          now={NOW}
        />
      </div>
    ),
    code: () => `<PaymentMethodList methods={methods} selected={id} onSelect={setId} />`,
  },
  api: [
    { name: 'methods', type: 'PaymentMethod[]', description: '`{ id, kind, last4, brand?, expiry?, holder?, isDefault? }`. Only ever the last four digits — a full PAN has no business reaching a component.' },
    { name: 'expiry warning', type: 'derived', description: 'Cards within 60 days of expiry are flagged, expired ones are marked and cannot be made default.' },
    { name: 'onSelect / onSetDefault / onRemove', type: '(id: string) => void', description: 'Omit any of them to render that affordance not at all, rather than disabled.' },
    { name: 'now', type: 'Date', description: 'Reference point for expiry, so tests are not time-dependent.' },
  ],
  demos: [
    { title: 'Selectable list', stack: true, code: `<PaymentMethodList methods={methods} selected={id} onSelect={setId} onSetDefault={makeDefault} onRemove={remove} />`, render: () => <MethodsDemo /> },
  ],
}

/* ------------------------------------------------------------ payout status */

export const payoutStatusEntry: ComponentEntry = {
  id: 'payout-status',
  label: 'Payout Status',
  description:
    'Where a payout is and when the money lands. "Expected Thursday" is the thing people open this to find out; the status word alone never answers it.',
  usage: `import { PayoutStatus } from '@/components/ui/payout-status'

<PayoutStatus amount={128_400} state="in_transit" expectedAt={date} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'state', label: 'state', options: ['pending', 'in_transit', 'paid', 'failed', 'returned', 'cancelled'], default: 'in_transit' },
      { type: 'number', prop: 'amount', label: 'amount (minor)', default: 128_400, min: 0, step: 100 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <PayoutStatus
          amount={Number(state.amount)}
          state={state.state as PayoutState}
          destination="Monzo ••0091"
          reference="po_8fQ21x"
          initiatedAt={days(-2)}
          expectedAt={days(1)}
          arrivedAt={state.state === 'paid' ? days(-0.2) : undefined}
          failureReason={state.state === 'failed' ? 'Account closed at the receiving bank.' : undefined}
          now={NOW}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<PayoutStatus\n  amount={${state.amount}}\n  state="${state.state}"\n  destination="Monzo ••0091"\n  expectedAt={expected}\n/>`,
  },
  api: [
    { name: 'amount', type: 'number', description: 'Minor units, matching LedgerTable, MoneyInput and Cart.' },
    { name: 'state', type: 'PayoutState', description: "'pending' | 'in_transit' | 'paid' | 'failed' | 'returned' | 'cancelled'." },
    { name: 'expectedAt', type: 'Date', description: 'The arrival date. Shown prominently for anything not yet paid, because it is the only question being asked.' },
    { name: 'failureReason', type: 'ReactNode', description: 'Shown for failed and returned payouts. A failure with no stated reason generates a support ticket every time.' },
  ],
  demos: [
    { title: 'Every state', stack: true, code: `<PayoutStatus amount={128_40} state="paid" />`,
      render: () => (<div className="flex w-full max-w-md flex-col gap-3">{(['pending', 'in_transit', 'paid', 'failed'] as const).map((state) => (<PayoutStatus key={state} amount={128_40} currency="GBP" state={state} reference="po_8f21" now={NOW} /> ))}</div>) },
  ],
}

/* ------------------------------------------------------------ ledger table */

const LEDGER: LedgerEntry[] = [
  { id: 'l1', date: days(-9), description: 'Invoice #2261 — Northwind', account: 'Accounts receivable', reference: 'INV-2261', debit: 480_000 },
  { id: 'l2', date: days(-8), description: 'Payment received', account: 'Bank', reference: 'INV-2261', credit: 480_000 },
  { id: 'l3', date: days(-6), description: 'Cloud hosting', account: 'Infrastructure', reference: 'AWS-0824', debit: 96_412 },
  { id: 'l4', date: days(-4), description: 'Affiliate payout — batch 41', account: 'Partner costs', reference: 'PO-0041', debit: 212_050 },
  { id: 'l5', date: days(-2), description: 'Refund — order 88213', account: 'Revenue', reference: 'RF-88213', credit: 4_990 },
]

export const ledgerTableEntry: ComponentEntry = {
  id: 'ledger-table',
  label: 'Ledger Table',
  description:
    'Double-entry lines with a running balance. Debits and credits get their own columns and are totalled separately, because a ledger where the two do not agree is the finding.',
  usage: `import { LedgerTable } from '@/components/ui/ledger-table'

<LedgerTable entries={entries} openingBalance={0} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'balance', label: 'running balance', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full">
        <LedgerTable entries={LEDGER} openingBalance={1_250_000} showBalance={Boolean(state.balance)} />
      </div>
    ),
    code: (state: ComposerState) =>
      `<LedgerTable entries={entries} openingBalance={1250000}${state.balance ? '' : ' showBalance={false}'} />`,
  },
  api: [
    { name: 'entries', type: 'LedgerEntry[]', description: '`{ id, date, description, account?, reference?, debit?, credit? }`. Exactly one of debit or credit per line.' },
    { name: 'amounts', type: 'minor units', description: 'Integers throughout. Running balances accumulate, and a float error accumulates with them.' },
    { name: 'openingBalance', type: 'number', default: '0', description: 'Minor units. The running balance starts here rather than at zero.' },
    { name: 'totals', type: 'computed', description: 'Debit and credit columns are summed independently and shown in the footer, so an unbalanced set is visible rather than hidden in a net figure.' },
  ],
  demos: [
    { title: 'A running balance', stack: true, code: `<LedgerTable entries={entries} currency="GBP" />`,
      render: () => (<div className="w-full"><LedgerTable entries={LEDGER} currency="GBP" /></div>) },
  ],
}
