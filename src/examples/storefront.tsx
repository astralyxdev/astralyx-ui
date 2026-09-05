import { useState } from 'react'
import {
  Banknote, CreditCard, Landmark, ReceiptText, ShoppingBasket, Sparkles, Star,
} from 'lucide-react'
import { AddressInput, emptyAddress, type AddressValue } from '@/components/ui/address-input'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import { CardInput } from '@/components/ui/card-input'
import { Cart, type CartLine } from '@/components/ui/cart'
import { CheckoutSummary, type CheckoutLine } from '@/components/ui/checkout-summary'
import { CurrencyInput } from '@/components/ui/currency-input'
import { InvoiceList, type Invoice } from '@/components/ui/invoice-list'
import { MoneyInput } from '@/components/ui/money-input'
import { PaymentMethodList, type PaymentMethod } from '@/components/ui/payment-method'
import { PayoutStatus } from '@/components/ui/payout-status'
import { PricingTable, type PricingPlan } from '@/components/ui/pricing-table'
import { Rating } from '@/components/ui/rating'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Separator } from '@/components/ui/separator'
import { SubscriptionState } from '@/components/ui/subscription-state'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { AppFrame, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

/**
 * Fixed dates. The page is prerendered and then hydrated, so a date computed at
 * module scope would differ between the two passes and blow up the match.
 */
const NOW = new Date('2026-09-05T09:20:00Z')
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

/**
 * Money in this kit is integer minor units — Cart, CheckoutSummary, MoneyInput,
 * CurrencyInput, SubscriptionState and PayoutStatus all speak pence here. The
 * two exceptions are PricingTable and InvoiceList, which take a major-unit
 * figure because that is what a plan card and a billing row display verbatim.
 */
const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const money = (pence: number) => gbp.format(pence / 100)

const CATALOGUE: CartLine[] = [
  { id: 'kestrel', name: 'Kestrel laptop stand', variant: 'Anodised graphite', price: 8900, quantity: 1, max: 4 },
  { id: 'meridian', name: 'Meridian 68 keyboard', variant: 'Tactile brown · ISO-UK', price: 16_900, quantity: 1, max: 2, note: 'Ships from Bristol on Tuesday' },
  { id: 'aperture', name: 'Aperture 4K webcam', variant: 'Matte black', price: 11_950, quantity: 1, max: 3 },
  { id: 'spine', name: 'Cable spine, 1.2 m', variant: 'Charcoal', price: 1400, quantity: 2, max: 6 },
]

const PLANS: PricingPlan[] = [
  {
    id: 'solo', name: 'Solo', price: 12, period: '/mo', currency: 'GBP',
    description: 'One workspace, one seat.',
    features: [
      { label: 'Seats', value: '1' },
      { label: 'Orders per month', value: '250' },
      { label: 'Custom domain', value: true },
      { label: 'Priority support', value: false },
      { label: 'Payouts', value: 'Weekly' },
    ],
  },
  {
    id: 'studio', name: 'Studio', price: 32, period: '/mo', currency: 'GBP',
    description: 'For a small shop with staff.',
    features: [
      { label: 'Seats', value: '5' },
      { label: 'Orders per month', value: '5,000' },
      { label: 'Custom domain', value: true },
      { label: 'Priority support', value: true },
      { label: 'Payouts', value: 'Daily' },
    ],
  },
  {
    id: 'agency', name: 'Agency', price: 96, period: '/mo', currency: 'GBP',
    description: 'Many storefronts, one bill.',
    features: [
      { label: 'Seats', value: 'Unlimited' },
      { label: 'Orders per month', value: 'Unlimited' },
      { label: 'Custom domain', value: true },
      { label: 'Priority support', value: true },
      { label: 'Payouts', value: 'Same day' },
    ],
  },
]

const METHODS: PaymentMethod[] = [
  { id: 'pm_visa', kind: 'card', brand: 'Visa', last4: '4242', expiry: '11/28', holder: 'A. Lovelace', isDefault: true },
  { id: 'pm_mc', kind: 'card', brand: 'Mastercard', last4: '8319', expiry: '10/26', holder: 'A. Lovelace' },
  { id: 'pm_bank', kind: 'bank', brand: 'Monzo', last4: '0091', holder: 'Analytical Engines Ltd' },
]

/** Major units — see the note on `money` above. */
const INVOICES: Invoice[] = [
  { id: 'i1', number: 'AX-2026-0148', date: days(-4), amount: 32, currency: 'GBP', status: 'paid', description: 'Studio plan — September', url: '#' },
  { id: 'i2', number: 'AX-2026-0139', date: days(-34), amount: 32, currency: 'GBP', status: 'paid', description: 'Studio plan — August' },
  { id: 'i3', number: 'AX-2026-0131', date: days(-64), amount: 44.5, currency: 'GBP', status: 'refunded', description: 'Studio plan + overage' },
  { id: 'i4', number: 'AX-2026-0122', date: days(-94), amount: 12, currency: 'GBP', status: 'past_due', description: 'Solo plan — June' },
  { id: 'i5', number: 'AX-2026-0118', date: days(-124), amount: 12, currency: 'GBP', status: 'void', description: 'Duplicate charge, cancelled' },
]

const REVIEWS = [
  { id: 'kestrel', product: 'Kestrel laptop stand', reviewer: 'Grace Hopper', body: 'Heavier than it looks, which is the point — it does not walk across the desk when you type.', stars: 5 },
  { id: 'meridian', product: 'Meridian 68 keyboard', reviewer: 'Alan Turing', body: 'Lovely typing feel. The ISO return key is a millimetre narrower than the old board and I still miss it twice a day.', stars: 4 },
  { id: 'aperture', product: 'Aperture 4K webcam', reviewer: 'Katherine Johnson', body: 'Sharp in daylight, noisy under a desk lamp. The mount fits a thin monitor without a wobble.', stars: 3 },
]

const NAV: NavItem[] = [
  { id: 'basket', label: 'Basket', icon: <ShoppingBasket /> },
  { id: 'checkout', label: 'Checkout', icon: <CreditCard /> },
  { id: 'plans', label: 'Plans', icon: <Sparkles /> },
  { id: 'billing', label: 'Billing', icon: <ReceiptText /> },
  { id: 'payouts', label: 'Payouts', icon: <Landmark /> },
  { id: 'reviews', label: 'Reviews', icon: <Star /> },
]

const VAT_RATE = 0.2
const DELIVERY = 495
const PROMO_RATE = 0.1

function Storefront() {
  const { toast } = useToast()
  const [section, setSection] = useState('basket')
  const [lines, setLines] = useState(CATALOGUE)
  const [planId, setPlanId] = useState('studio')
  const [promo, setPromo] = useState(false)
  const [tip, setTip] = useState<number | undefined>(300)
  const [address, setAddress] = useState<AddressValue>(emptyAddress)
  const [methodId, setMethodId] = useState('pm_visa')
  const [methods, setMethods] = useState(METHODS)
  const [cardValid, setCardValid] = useState(false)
  const [payout, setPayout] = useState<number | null>(84_250)
  const [payoutCurrency, setPayoutCurrency] = useState('GBP')
  const [stars, setStars] = useState<Record<string, number>>(
    Object.fromEntries(REVIEWS.map((review) => [review.id, review.stars])),
  )

  const plan = PLANS.find((item) => item.id === planId) ?? PLANS[1]
  const goods = lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const planPence = plan.price * 100
  const discount = promo ? Math.round(goods * PROMO_RATE) : 0
  // Delivery stays `null` until there is somewhere to deliver to. Rendering it
  // as £0.00 would be a promise the next step breaks.
  const delivery = address.postalCode ? DELIVERY : null
  const taxable = goods + planPence - discount + (delivery ?? 0)
  const vat = Math.round(taxable * VAT_RATE)

  const adjustments: CheckoutLine[] = [
    { id: 'plan', label: `${plan.name} plan — first month`, amount: planPence, note: `Then ${money(planPence)} monthly` },
    ...(promo ? [{ id: 'promo', label: 'Discount — WELCOME10', amount: -discount, discount: true }] : []),
    { id: 'delivery', label: 'Delivery', amount: delivery, note: delivery === null ? 'Enter a postcode at checkout' : 'Tracked, 48 hours' },
    ...(tip ? [{ id: 'tip', label: 'Packing team tip', amount: tip }] : []),
    { id: 'vat', label: 'VAT (20%)', amount: vat },
  ]

  const summary = (
    <CheckoutSummary
      subtotal={goods}
      currency="GBP"
      lines={adjustments}
      footer={
        <div className="space-y-2">
          <Button
            className="w-full"
            disabled={lines.length === 0}
            onClick={() => setSection(section === 'checkout' ? 'billing' : 'checkout')}
          >
            {section === 'checkout' ? 'Pay now' : 'Continue to payment'}
          </Button>
          {!promo && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setPromo(true)}>
              Apply code WELCOME10
            </Button>
          )}
        </div>
      }
    />
  )

  return (
    <AppFrame
      inset
      product="Storefront"
      // The rail count is derived, not stored: removing a basket line has to
      // change the badge, or the two disagree the moment anyone edits anything.
      nav={NAV.map((item) => (item.id === 'basket' ? { ...item, count: lines.length || undefined } : item))}
      active={section}
      onNavigate={setSection}
      title={NAV.find((item) => item.id === section)?.label}
      user={{ name: 'Ada Lovelace', plan: `${plan.name} plan` }}
      actions={
        <Badge color="green" icon={<Banknote />}>
          {money(goods + planPence - discount + (delivery ?? 0) + (tip ?? 0) + vat)}
        </Badge>
      }
      aside={<div className="space-y-4 p-4">{summary}</div>}
    >
      <div className="space-y-6 p-4 sm:p-6">
        {section === 'basket' && (
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle as="h2">Your basket</CardTitle>
                <CardDescription>
                  Quantities are capped at what is in stock, at the stepper rather than on submit.
                </CardDescription>
              </div>
              {lines.length < CATALOGUE.length && (
                <Button size="sm" variant="secondary" onClick={() => setLines(CATALOGUE)}>
                  Restore basket
                </Button>
              )}
            </CardHeader>
            <CardBody>
              <Cart
                lines={lines}
                currency="GBP"
                onQuantityChange={(id, quantity) =>
                  setLines((current) =>
                    current.map((line) => (line.id === id ? { ...line, quantity } : line)),
                  )
                }
                onRemove={(id) => setLines((current) => current.filter((line) => line.id !== id))}
                empty={
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    Nothing in the basket. The summary beside it still bills for the plan.
                  </p>
                }
              />
            </CardBody>
            <CardFooter className="justify-between">
              <span className="text-muted-foreground text-xs">
                {lines.reduce((sum, line) => sum + line.quantity, 0)} items
              </span>
              <span className="text-sm font-medium tabular-nums">{money(goods)}</span>
            </CardFooter>
          </Card>
        )}

        {section === 'checkout' && (
          <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle as="h2">Delivery address</CardTitle>
                <CardDescription>
                  A postcode unlocks the delivery line in the summary.
                </CardDescription>
              </CardHeader>
              <CardBody>
                <AddressInput value={address} onValueChange={setAddress} />
              </CardBody>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Payment method</CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  <PaymentMethodList
                    methods={methods}
                    selected={methodId}
                    onSelect={setMethodId}
                    now={NOW}
                    onSetDefault={(id) =>
                      setMethods((current) =>
                        current.map((method) => ({ ...method, isDefault: method.id === id })),
                      )
                    }
                    onRemove={(id) =>
                      setMethods((current) => current.filter((method) => method.id !== id))
                    }
                  />

                  <Separator label="or add a card" />

                  {/* Deliberately a sample: no value is prefilled, nothing is
                      submitted, and the notice says so. A showcase must never
                      look like a live payment form. */}
                  <Alert size="sm" color="blue" title="Sample form">
                    This card field is a component demo. It validates the Luhn checksum locally and
                    sends nothing anywhere.
                  </Alert>
                  <CardInput onCardChange={(card) => setCardValid(card.valid)} />
                  {cardValid && (
                    <Badge color="green" size="sm">
                      Checksum passes
                    </Badge>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle as="h2">Tip the packing team</CardTitle>
                  <CardDescription>Added to the summary as its own line.</CardDescription>
                </CardHeader>
                <CardBody>
                  <MoneyInput
                    value={tip}
                    onValueChange={setTip}
                    currency="GBP"
                    locale="en-GB"
                    min={0}
                    max={5000}
                    variant="secondary"
                  />
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {section === 'plans' && (
          <div className="space-y-4">
            <Alert color="blue" title={`${plan.name} selected`}>
              Picking a plan rewrites the first line of the order summary and the subscription on
              the billing page.
            </Alert>
            <PricingTable
              // `highlighted` follows the selection rather than a fixed
              // "popular" column: the chosen plan is the one worth marking.
              plans={PLANS.map((item) => ({
                ...item,
                highlighted: item.id === planId,
                badge: item.id === planId ? 'Selected' : undefined,
                cta: item.id === planId ? 'Current' : `Choose ${item.name}`,
                onSelect: () => setPlanId(item.id),
              }))}
            />
          </div>
        )}

        {section === 'billing' && (
          <div className="max-w-3xl space-y-4">
            <SubscriptionState
              plan={`${plan.name} plan`}
              status="trialing"
              price={planPence}
              period="month"
              trialEndsAt={days(9)}
              renewsAt={days(9)}
              seats={{ used: 3, total: plan.id === 'solo' ? 1 : 5 }}
              actions={
                <Button size="sm" variant="secondary" onClick={() => setSection('plans')}>
                  Change plan
                </Button>
              }
              onFixPayment={() => setSection('checkout')}
            />

            <Card>
              <CardHeader>
                <CardTitle as="h2">Invoices</CardTitle>
                <CardDescription>Amounts are tabular so the column can be scanned.</CardDescription>
              </CardHeader>
              <CardBody>
                <InvoiceList
                  invoices={INVOICES}
                  onDownload={(invoice) =>
                    toast({
                      title: `Invoice ${invoice.number}`,
                      description: 'The PDF would download here.',
                      color: 'blue',
                    })
                  }
                />
              </CardBody>
            </Card>
          </div>
        )}

        {section === 'payouts' && (
          <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
            <PayoutStatus
              amount={payout ?? 0}
              currency={payoutCurrency}
              state={payout && payout > 100_000 ? 'pending' : 'in_transit'}
              destination="Monzo ••0091"
              reference="po_8fQ21xLm"
              initiatedAt={days(-1)}
              expectedAt={days(2)}
              now={NOW}
            />

            <Card>
              <CardHeader>
                <CardTitle as="h2">Request a payout</CardTitle>
                <CardDescription>
                  Anything above {money(100_000)} is held for a manual check.
                </CardDescription>
              </CardHeader>
              <CardBody className="space-y-4">
                <SegmentedControl
                  fullWidth
                  size="sm"
                  label="Payout currency"
                  value={payoutCurrency}
                  onValueChange={setPayoutCurrency}
                  options={[
                    { value: 'GBP', label: 'GBP' },
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                  ]}
                />
                <CurrencyInput
                  value={payout}
                  onChange={setPayout}
                  currency={payoutCurrency}
                  showCode
                  max={250_000}
                />
                <Button
                  className="w-full"
                  disabled={!payout}
                  onClick={() =>
                    toast({
                      title: 'Payout requested',
                      description: `${payoutCurrency} ${((payout ?? 0) / 100).toFixed(2)} to Monzo ••0091.`,
                      color: 'green',
                    })
                  }
                >
                  Request payout
                </Button>
              </CardBody>
            </Card>
          </div>
        )}

        {section === 'reviews' && (
          <div className="max-w-2xl space-y-4">
            {REVIEWS.map((review) => (
              <Card key={review.id}>
                <CardHeader className="flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle as="h2">{review.product}</CardTitle>
                    <CardDescription>{review.reviewer}</CardDescription>
                  </div>
                  <Rating value={stars[review.id]} readOnly showValue size="sm" />
                </CardHeader>
                <CardBody className="space-y-3">
                  <p className="text-sm">{review.body}</p>
                  <Separator label="your rating" />
                  <Rating
                    value={stars[review.id]}
                    onValueChange={(value) =>
                      setStars((current) => ({ ...current, [review.id]: value }))
                    }
                    label={`Rate ${review.product}`}
                  />
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* The summary lives in the aside, which is hidden below `xl`. Repeating
            it inline keeps the total reachable on a narrow screen. */}
        <div className="xl:hidden">{summary}</div>
      </div>
    </AppFrame>
  )
}

export const storefrontExample: ExampleEntry = {
  id: 'storefront',
  label: 'Storefront',
  description:
    'Basket to receipt and the billing behind it: quantities that move the total, a plan choice that rewrites the summary and the subscription, and payout, invoice and review surfaces.',
  uses: [
    'Cart', 'Checkout Summary', 'Pricing Table', 'Payment Method', 'Card Input',
    'Money Input', 'Currency Input', 'Address Input', 'Invoice List',
    'Subscription State', 'Payout Status', 'Rating', 'Toast',
  ],
  render: () => (
    <ToastProvider position="bottom-end">
      <Storefront />
    </ToastProvider>
  ),
}
