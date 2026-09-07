import type { Asset } from '@/components/ui/asset-grid'
import type { CartLine } from '@/components/ui/cart'
import type { Journey } from '@/components/ui/attribution'

/**
 * The fixture for Storefront.
 *
 * Money is integer minor units everywhere — pence, not pounds. A basket that
 * has been through a float has already lost the argument, and the components
 * that take money in this kit all expect it that way, so the fixture does too.
 */
export const NOW = new Date('2026-09-07T09:00:00Z')

const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

export type OrderStatus = 'paid' | 'fulfilled' | 'refunded' | 'pending' | 'cancelled'

export type OrderLine = {
  id: string
  name: string
  variant: string
  sku: string
  quantity: number
  price: number
}

export type Order = {
  id: string
  number: string
  customer: string
  email: string
  placed: Date
  status: OrderStatus
  channel: 'web' | 'app' | 'pos'
  country: string
  lines: OrderLine[]
  discount?: { code: string; amount: number }
  delivery: number
}

/*
 * Money is derived, never stored.
 *
 * An order that carries both its lines and a `total` will eventually disagree
 * with itself — one gets edited, the other does not — and a receipt that does
 * not add up is the one thing a shop cannot ship. So the lines are the fixture
 * and everything downstream is arithmetic.
 */
export const VAT_RATE = 0.2

export function orderSubtotal(order: Order) {
  return order.lines.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function orderVat(order: Order) {
  return Math.round((orderSubtotal(order) - (order.discount?.amount ?? 0)) * VAT_RATE)
}

export function orderTotal(order: Order) {
  return (
    orderSubtotal(order) - (order.discount?.amount ?? 0) + order.delivery + orderVat(order)
  )
}

const line = (id: string, name: string, variant: string, sku: string, quantity: number, price: number): OrderLine => ({
  id, name, variant, sku, quantity, price,
})

export const ORDERS: Order[] = [
  {
    id: 'o-2291',
    number: 'AX-2291',
    customer: 'Ada Lovelace',
    email: 'ada@example.com',
    placed: ago(14),
    status: 'paid',
    channel: 'web',
    country: 'United Kingdom',
    delivery: 0,
    discount: { code: 'WELCOME10', amount: 19_330 },
    lines: [
      line('l1', 'Aeron chair', 'Size B · Graphite', 'CHR-AER-B-GR', 1, 149_500),
      line('l2', 'Monitor arm', 'Silver', 'ARM-MON-SI', 2, 21_900),
    ],
  },
  {
    id: 'o-2290',
    number: 'AX-2290',
    customer: 'Grace Hopper',
    email: 'grace@example.com',
    placed: ago(96),
    status: 'fulfilled',
    channel: 'app',
    country: 'United States',
    delivery: 1_200,
    lines: [line('l1', 'Desk mat', 'Large · Charcoal', 'MAT-DSK-L-CH', 1, 41_600)],
  },
  {
    id: 'o-2289',
    number: 'AX-2289',
    customer: 'Alan Turing',
    email: 'alan@example.com',
    placed: ago(240),
    status: 'refunded',
    channel: 'web',
    country: 'United Kingdom',
    delivery: 0,
    lines: [line('l1', 'Standing desk', '160×80 · Oak', 'DSK-STD-160-OK', 1, 89_900)],
  },
  {
    id: 'o-2288',
    number: 'AX-2288',
    customer: 'Katherine Johnson',
    email: 'katherine@example.com',
    placed: ago(400),
    status: 'pending',
    channel: 'web',
    country: 'Germany',
    delivery: 900,
    lines: [line('l1', 'Monitor arm', 'Black', 'ARM-MON-BK', 1, 21_000)],
  },
  {
    id: 'o-2287',
    number: 'AX-2287',
    customer: 'Margaret Hamilton',
    email: 'margaret@example.com',
    placed: ago(1_440),
    status: 'fulfilled',
    channel: 'pos',
    country: 'United Kingdom',
    delivery: 0,
    lines: [
      line('l1', 'Aeron chair', 'Size C · Mineral', 'CHR-AER-C-MN', 2, 149_500),
      line('l2', 'Desk mat', 'Large · Charcoal', 'MAT-DSK-L-CH', 1, 13_400),
    ],
  },
  {
    id: 'o-2286',
    number: 'AX-2286',
    customer: 'Edsger Dijkstra',
    email: 'edsger@example.com',
    placed: ago(2_880),
    status: 'cancelled',
    channel: 'web',
    country: 'Netherlands',
    delivery: 0,
    lines: [line('l1', 'Desk mat', 'Large · Sand', 'MAT-DSK-L-SD', 1, 41_600)],
  },
]

export const ORDER_TIMELINE = [
  { id: 'e1', title: 'Order placed', at: '09:46', tone: 'default' as const, who: 'Web · Chrome on macOS' },
  { id: 'e2', title: 'Payment authorised', at: '09:46', tone: 'success' as const, who: 'Visa •••• 4242' },
  { id: 'e3', title: 'Fraud check passed', at: '09:46', tone: 'info' as const, who: 'Score 4 of 100' },
  { id: 'e4', title: 'WELCOME10 applied', at: '09:46', tone: 'info' as const, who: '−£193.30' },
  { id: 'e5', title: 'Awaiting fulfilment', at: '09:47', tone: 'warning' as const, who: 'Warehouse · London' },
]

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  price: number
  stock: number
  reorderAt: number
  status: 'live' | 'draft' | 'archived'
  sold30d: number
  variants: { id: string; name: string; sku: string; stock: number; price: number }[]
}

export const PRODUCTS: Product[] = [
  {
    id: 'p-chair',
    name: 'Aeron chair',
    sku: 'CHR-AER',
    category: 'Seating',
    price: 149_500,
    stock: 34,
    reorderAt: 20,
    status: 'live',
    sold30d: 88,
    variants: [
      { id: 'v1', name: 'Size B · Graphite', sku: 'CHR-AER-B-GR', stock: 18, price: 149_500 },
      { id: 'v2', name: 'Size B · Mineral', sku: 'CHR-AER-B-MN', stock: 9, price: 149_500 },
      { id: 'v3', name: 'Size C · Mineral', sku: 'CHR-AER-C-MN', stock: 7, price: 156_000 },
    ],
  },
  {
    id: 'p-desk',
    name: 'Standing desk',
    sku: 'DSK-STD',
    category: 'Desks',
    price: 89_900,
    stock: 12,
    reorderAt: 15,
    status: 'live',
    sold30d: 41,
    variants: [
      { id: 'v1', name: '160×80 · Oak', sku: 'DSK-STD-160-OK', stock: 4, price: 89_900 },
      { id: 'v2', name: '160×80 · Walnut', sku: 'DSK-STD-160-WN', stock: 8, price: 94_900 },
    ],
  },
  {
    id: 'p-arm',
    name: 'Monitor arm',
    sku: 'ARM-MON',
    category: 'Accessories',
    price: 21_900,
    stock: 140,
    reorderAt: 40,
    status: 'live',
    sold30d: 210,
    variants: [
      { id: 'v1', name: 'Silver', sku: 'ARM-MON-SI', stock: 71, price: 21_900 },
      { id: 'v2', name: 'Black', sku: 'ARM-MON-BK', stock: 69, price: 21_000 },
    ],
  },
  {
    id: 'p-mat',
    name: 'Desk mat',
    sku: 'MAT-DSK',
    category: 'Accessories',
    price: 41_600,
    stock: 3,
    reorderAt: 25,
    status: 'live',
    sold30d: 96,
    variants: [
      { id: 'v1', name: 'Large · Charcoal', sku: 'MAT-DSK-L-CH', stock: 2, price: 41_600 },
      { id: 'v2', name: 'Large · Sand', sku: 'MAT-DSK-L-SD', stock: 1, price: 41_600 },
    ],
  },
  {
    id: 'p-lamp',
    name: 'Task lamp',
    sku: 'LMP-TSK',
    category: 'Lighting',
    price: 18_900,
    stock: 0,
    reorderAt: 20,
    status: 'draft',
    sold30d: 0,
    variants: [{ id: 'v1', name: 'Aluminium', sku: 'LMP-TSK-AL', stock: 0, price: 18_900 }],
  },
]

export const MEDIA: Asset[] = [
  { id: 'm1', name: 'aeron-front.jpg', type: 'image/jpeg', size: 842_000, modified: '2 days ago' },
  { id: 'm2', name: 'aeron-side.jpg', type: 'image/jpeg', size: 771_000, modified: '2 days ago' },
  { id: 'm3', name: 'aeron-detail.jpg', type: 'image/jpeg', size: 1_240_000, modified: '2 days ago' },
  { id: 'm4', name: 'aeron-lifestyle.jpg', type: 'image/jpeg', size: 2_100_000, modified: '1 week ago' },
  { id: 'm5', name: 'aeron-dimensions.pdf', type: 'application/pdf', size: 310_000, modified: '1 month ago' },
]

export type Customer = {
  id: string
  name: string
  email: string
  country: string
  orders: number
  spend: number
  first: string
  last: string
  segment: 'new' | 'returning' | 'vip' | 'lapsed'
}

export const CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Margaret Hamilton', email: 'margaret@example.com', country: 'United Kingdom', orders: 11, spend: 1_842_000, first: '3 years ago', last: '1 day ago', segment: 'vip' },
  { id: 'c2', name: 'Ada Lovelace', email: 'ada@example.com', country: 'United Kingdom', orders: 4, spend: 512_400, first: '8 months ago', last: '14 minutes ago', segment: 'returning' },
  { id: 'c3', name: 'Grace Hopper', email: 'grace@example.com', country: 'United States', orders: 2, spend: 84_200, first: '2 months ago', last: '4 days ago', segment: 'returning' },
  { id: 'c4', name: 'Alan Turing', email: 'alan@example.com', country: 'United Kingdom', orders: 1, spend: 0, first: '4 hours ago', last: '4 hours ago', segment: 'new' },
  { id: 'c5', name: 'Edsger Dijkstra', email: 'edsger@example.com', country: 'Netherlands', orders: 3, spend: 210_800, first: '2 years ago', last: '11 months ago', segment: 'lapsed' },
]

export type Discount = {
  id: string
  code: string
  kind: 'percent' | 'fixed' | 'shipping'
  value: number
  used: number
  cap?: number
  status: 'active' | 'scheduled' | 'expired'
  ends: string
}

export const DISCOUNTS: Discount[] = [
  { id: 'd1', code: 'WELCOME10', kind: 'percent', value: 10, used: 412, cap: 1_000, status: 'active', ends: 'in 3 weeks' },
  { id: 'd2', code: 'FREESHIP', kind: 'shipping', value: 0, used: 1_204, status: 'active', ends: 'no end date' },
  { id: 'd3', code: 'DESK25', kind: 'fixed', value: 2_500, used: 0, cap: 200, status: 'scheduled', ends: 'starts Monday' },
  { id: 'd4', code: 'SUMMER20', kind: 'percent', value: 20, used: 3_918, cap: 4_000, status: 'expired', ends: '6 weeks ago' },
]

export const BASKET: CartLine[] = [
  { id: 'b1', name: 'Aeron chair', variant: 'Size B · Graphite', price: 149_500, quantity: 1, max: 18 },
  { id: 'b2', name: 'Monitor arm', variant: 'Silver', price: 21_900, quantity: 2, max: 71, note: 'Only 2 left at this price.' },
]

export const FUNNEL = [
  { label: 'Sessions', value: 128_940 },
  { label: 'Product viewed', value: 61_200, hint: 'At least one product page' },
  { label: 'Added to basket', value: 14_800 },
  { label: 'Checkout started', value: 9_120 },
  { label: 'Paid', value: 6_410 },
]

export const COHORTS = [
  { name: 'Mar 2026', size: 1_284, values: [1, 0.58, 0.46, 0.39, 0.36, 0.34, 0.33] },
  { name: 'Apr 2026', size: 1_609, values: [1, 0.62, 0.49, 0.43, 0.39, 0.38] },
  { name: 'May 2026', size: 1_412, values: [1, 0.59, 0.46, 0.4, 0.36] },
  { name: 'Jun 2026', size: 2_058, values: [1, 0.67, 0.54, 0.48] },
  { name: 'Jul 2026', size: 2_240, values: [1, 0.67, 0.53] },
  { name: 'Aug 2026', size: 1_977, values: [1, 0.64] },
  { name: 'Sep 2026', size: 604, values: [1] },
]

const touch = (channel: string, minutes: number) => ({ channel, at: ago(minutes) })

export const JOURNEYS: Journey[] = [
  { id: 'j1', value: 1_933, touchpoints: [touch('Organic search', 8_640), touch('Email', 2_880), touch('Direct', 14)] },
  { id: 'j2', value: 428, touchpoints: [touch('Paid search', 4_320), touch('Direct', 96)] },
  { id: 'j3', value: 899, touchpoints: [touch('Social', 11_520), touch('Organic search', 5_760), touch('Email', 240)] },
  { id: 'j4', value: 219, touchpoints: [touch('Referral', 1_440), touch('Direct', 400)] },
  { id: 'j5', value: 3_124, touchpoints: [touch('Email', 20_160), touch('Direct', 1_440)] },
  { id: 'j6', value: 416, touchpoints: [touch('Paid search', 2_880), touch('Social', 720), touch('Direct', 30)] },
]

export const REVENUE = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [
    { name: 'Revenue', values: [8_420, 9_180, 8_940, 12_400, 11_800, 4_200, 3_600] },
    { name: 'Refunds', values: [210, 180, 640, 320, 290, 90, 40] },
  ],
}
