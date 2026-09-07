import { useMemo, useState } from 'react'
import {
  ArrowLeft, ChartLine, Package, Plus, Receipt, ShoppingBag, TicketPercent, TriangleAlert, Users,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AssetGrid } from '@/components/ui/asset-grid'
import { Attribution } from '@/components/ui/attribution'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Cart } from '@/components/ui/cart'
import { Chart } from '@/components/ui/chart'
import { CheckoutSummary } from '@/components/ui/checkout-summary'
import { CohortTable } from '@/components/ui/cohort-table'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { Empty } from '@/components/ui/empty'
import { Fmt } from '@/components/ui/fmt'
import { Funnel } from '@/components/ui/funnel'
import { Input } from '@/components/ui/input'
import { RetentionCurve } from '@/components/ui/retention-curve'
import { Select } from '@/components/ui/select'
import {
  Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Stat } from '@/components/ui/stat'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Timeline, TimelineItem } from '@/components/ui/timeline'
import {
  Page, PageHead, Section, SelectField, Shell, TextField, useNotify, useRoute, type Crumb, type Nav,
} from './shell'
import type { ExampleEntry } from './types'
import {
  BASKET, COHORTS, CUSTOMERS, DISCOUNTS, FUNNEL, JOURNEYS, MEDIA, ORDERS, ORDER_TIMELINE, orderSubtotal, orderTotal, orderVat, PRODUCTS, REVENUE, type Customer, type Order, type Product,
} from './shop-data'

/**
 * Storefront — the back office, not the shop.
 *
 * The interesting screens in commerce are the ones the customer never sees: an
 * order that has to be refundable line by line, a product whose stock is
 * counted per variant rather than per product, and a report that changes its
 * answer depending on which attribution model you pick. All three are here.
 */

const MONEY = { type: 'currency' as const, currency: 'GBP', locale: 'en-GB' }

/**
 * Minor units in, formatted money out.
 *
 * `animate` is opt-in: a headline figure counting up reads as the page waking,
 * the same thing happening in forty table cells reads as a fault.
 */
function Money({ value, animate }: { value: number; animate?: boolean }) {
  return <Fmt {...MONEY} value={value / 100} decimals={2} animate={animate} />
}

// The same money, as a string, for the places that are sentences rather than
// elements — a button label, a toast. Sharing the formatter is what keeps
// "£1,495.00" in the summary from becoming "£1495.00" on the button beside it.
const GBP = new Intl.NumberFormat(MONEY.locale, { style: 'currency', currency: MONEY.currency })
const money = (value: number) => GBP.format(value / 100)

const ORDER_TONE = {
  paid: 'blue',
  fulfilled: 'green',
  refunded: 'amber',
  pending: 'neutral',
  cancelled: 'destructive',
} as const

/* ------------------------------------------------------------------- orders */

function Orders() {
  const { open } = useRoute()
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')

  const rows = useMemo(
    () =>
      ORDERS.filter(
        (order) =>
          (status === 'all' || order.status === status) &&
          `${order.number} ${order.customer} ${order.email}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [status, query],
  )

  const columns: Column<Order>[] = [
    {
      key: 'number',
      header: 'Order',
      render: (order) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-mono font-medium">{order.number}</span>
          <span className="text-muted-foreground truncate text-xs">{order.customer}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <Badge size="sm" color={ORDER_TONE[order.status]}>
          {order.status}
        </Badge>
      ),
    },
    { key: 'channel', header: 'Channel', hideOnMobile: true, render: (order) => <span className="text-muted-foreground text-xs">{order.channel}</span> },
    { key: 'country', header: 'Ships to', hideOnMobile: true, render: (order) => <span className="text-muted-foreground text-xs">{order.country}</span> },
    {
      key: 'items',
      header: 'Items',
      align: 'end',
      hideOnMobile: true,
      sortValue: (order) => order.lines.reduce((total, item) => total + item.quantity, 0),
      render: (order) => (
        <span className="tabular-nums">
          {order.lines.reduce((total, item) => total + item.quantity, 0)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'end',
      sortValue: (order) => orderTotal(order),
      render: (order) => (
        <span className="font-medium tabular-nums">
          <Money value={orderTotal(order)} />
        </span>
      ),
    },
  ]

  // Revenue counts what the shop actually kept, so a refund and a cancellation
  // both drop out — and the average has to divide by the same set, not by every
  // row in the table, or it quietly understates itself.
  const earned = ORDERS.filter(
    (order) => order.status !== 'cancelled' && order.status !== 'refunded',
  )
  const revenue = earned.reduce((sum, order) => sum + orderTotal(order), 0)
  const refundRate =
    ORDERS.filter((order) => order.status === 'refunded').length / ORDERS.length

  return (
    <Page>
      <PageHead
        title="Orders"
        description="Six orders this week, one of them refunded and one still unpaid."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            size="sm"
            value={query}
            clearable
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery('')}
            placeholder="Order number, name or email…"
            aria-label="Search orders"
            containerClassName="max-w-xs"
          />
          <Select
            size="sm"
            triggerLabel="Status"
            value={status}
            onValueChange={setStatus}
            className="w-auto"
            triggerClassName="w-40"
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'paid', label: 'Paid' },
              { value: 'fulfilled', label: 'Fulfilled' },
              { value: 'pending', label: 'Pending' },
              { value: 'refunded', label: 'Refunded' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </PageHead>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Revenue"
          value={<Fmt {...MONEY} value={revenue / 100} decimals={0} animate />}
          hint="This week, less refunds"
          delta={8.4}
        />
        <Stat label="Orders" value={ORDERS.length} hint="This week" delta={12} deltaSuffix="" />
        <Stat
          label="Average order"
          value={<Fmt {...MONEY} value={revenue / earned.length / 100} decimals={2} animate />}
          hint={`Across ${earned.length} paid orders`}
        />
        <Stat
          label="Refund rate"
          value={<Fmt type="percent" value={refundRate} decimals={1} animate />}
          hint="One order in six"
          goodDirection="down"
          delta={4.1}
        />
      </div>

      <DataGrid
        rows={rows}
        columns={columns}
        rowKey={(order) => order.id}
        onRowClick={(order) => open('orders', order.id)}
        empty={
          <Empty
            bordered={false}
            icon={<Receipt />}
            title="No orders match"
            description="Try clearing the search or picking a different status."
          />
        }
      />
    </Page>
  )
}

function OrderDetail({ order }: { order: Order }) {
  const { back } = useRoute()
  const notify = useNotify()
  const [refund, setRefund] = useState(false)
  const [picked, setPicked] = useState<string[]>([])

  const subtotal = orderSubtotal(order)
  const refundable = order.lines.filter((item) => picked.includes(item.id))
  const refundTotal = refundable.reduce((total, item) => total + item.price * item.quantity, 0)

  return (
    <Page>
      <PageHead
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Back to orders" onClick={back}>
              <ArrowLeft />
            </Button>
            <span className="font-mono">{order.number}</span>
            <Badge size="sm" color={ORDER_TONE[order.status]}>
              {order.status}
            </Badge>
          </span>
        }
        description={`${order.customer} · ${order.email} · ${order.country}`}
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={order.status === 'refunded' || order.status === 'cancelled'}
              onClick={() => setRefund(true)}
            >
              Refund
            </Button>
            <Button
              size="sm"
              disabled={order.status !== 'paid'}
              onClick={() => notify('Fulfilment created', 'A label is printing in the London warehouse.', 'green')}
            >
              Fulfil
            </Button>
          </>
        }
      />

      {order.status === 'pending' && (
        <Alert color="amber" icon={<TriangleAlert />} title="Payment has not settled">
          The authorisation is 6 hours old. It expires after 7 days, and the stock stays reserved
          until then.
        </Alert>
      )}

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="flex flex-col gap-3 xl:col-span-2">
          <Section title="Items">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead className="text-end">Qty</TableHead>
                  <TableHead className="text-end">Each</TableHead>
                  <TableHead className="text-end">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{item.name}</span>
                        <span className="text-muted-foreground truncate text-xs">
                          {item.variant}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden font-mono text-xs sm:table-cell">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      <Money value={item.price} />
                    </TableCell>
                    <TableCell className="text-end font-medium tabular-nums">
                      <Money value={item.price * item.quantity} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Card>
            <CardHeader>
              <CardTitle>What happened</CardTitle>
            </CardHeader>
            <CardBody>
              <Timeline>
                {ORDER_TIMELINE.map((entry) => (
                  <TimelineItem key={entry.id} title={entry.title} tone={entry.tone} time={entry.at}>
                    <span className="text-muted-foreground text-xs">{entry.who}</span>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardBody>
            <CheckoutSummary
              subtotal={subtotal}
              currency="GBP"
              lines={[
                ...(order.discount
                  ? [{ id: 'discount', label: `Discount — ${order.discount.code}`, amount: -order.discount.amount, discount: true }]
                  : []),
                { id: 'delivery', label: 'Delivery', amount: order.delivery },
                { id: 'vat', label: 'VAT (20%)', amount: orderVat(order) },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <AlertDialog open={refund} onOpenChange={setRefund}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund {order.number}</AlertDialogTitle>
            <AlertDialogDescription>
              Pick the lines to refund. The money goes back to the card it came from and takes
              between five and ten days to appear.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2 px-1">
            {order.lines.map((item) => (
              <label
                key={item.id}
                className="border-border hover:bg-accent/40 flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors duration-150 ease-out motion-reduce:transition-none"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={picked.includes(item.id)}
                  onChange={(event) =>
                    setPicked((current) =>
                      event.target.checked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id),
                    )
                  }
                />
                <span
                  aria-hidden="true"
                  className={`grid size-4 shrink-0 place-items-center rounded border ${
                    picked.includes(item.id) ? 'bg-primary border-primary' : 'border-border'
                  }`}
                />
                <span className="min-w-0 flex-1 truncate">
                  {item.name}
                  <span className="text-muted-foreground"> · {item.variant}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <Money value={item.price * item.quantity} />
                </span>
              </label>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPicked([])}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={refundable.length === 0}
              onClick={() => {
                setRefund(false)
                setPicked([])
                notify(
                  'Refund issued',
                  `${refundable.length} line${refundable.length === 1 ? '' : 's'}, ${money(refundTotal)} back to Visa •••• 4242.`,
                  'destructive',
                )
              }}
            >
              {refundable.length > 0 ? `Refund ${money(refundTotal)}` : 'Refund'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

/* ----------------------------------------------------------------- products */

function Products() {
  const { open } = useRoute()
  const low = PRODUCTS.filter((product) => product.stock <= product.reorderAt)
  const variantCount = PRODUCTS.reduce((sum, product) => sum + product.variants.length, 0)

  return (
    <Page>
      <PageHead
        title="Products"
        description={`${PRODUCTS.length} products, ${variantCount} variants. Stock is counted per variant, which is the only count that can actually be sold.`}
        actions={
          <Button size="sm">
            <Plus /> New product
          </Button>
        }
      />

      {low.length > 0 && (
        <Alert color="amber" icon={<TriangleAlert />} title={`${low.length} products at or below reorder point`}>
          {low.map((product) => product.name).join(', ')} — {low[0].stock === 0 ? 'one is out of stock entirely.' : 'reorder before the weekend.'}
        </Alert>
      )}

      <Section>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="text-end">Price</TableHead>
              <TableHead className="text-end">Stock</TableHead>
              <TableHead className="hidden text-end md:table-cell">Sold (30d)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PRODUCTS.map((product) => (
              <TableRow
                key={product.id}
                className="cursor-pointer"
                onClick={() => open('products', product.id)}
              >
                <TableCell>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{product.name}</span>
                    <span className="text-muted-foreground truncate font-mono text-xs">
                      {product.sku} · {product.variants.length}{' '}
                      {product.variants.length === 1 ? 'variant' : 'variants'}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-xs sm:table-cell">
                  {product.category}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  <Money value={product.price} />
                </TableCell>
                <TableCell
                  className={`text-end tabular-nums ${
                    product.stock <= product.reorderAt ? 'text-[var(--amber-soft-foreground)] font-medium' : ''
                  }`}
                >
                  {product.stock}
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-end tabular-nums md:table-cell">
                  {product.sold30d}
                </TableCell>
                <TableCell>
                  <Badge size="sm" color={product.status === 'live' ? 'green' : 'neutral'}>
                    {product.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </Page>
  )
}

function ProductDetail({ product }: { product: Product }) {
  const { back } = useRoute()
  const notify = useNotify()
  const [edit, setEdit] = useState(false)
  const [price, setPrice] = useState(String(product.price / 100))
  const [selected, setSelected] = useState<string[]>(['m1'])

  return (
    <Page>
      <PageHead
        title={
          <span className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Back to products" onClick={back}>
              <ArrowLeft />
            </Button>
            {product.name}
            <Badge size="sm" color={product.status === 'live' ? 'green' : 'neutral'}>
              {product.status}
            </Badge>
          </span>
        }
        description={`${product.sku} · ${product.category}`}
        actions={
          <Button size="sm" onClick={() => setEdit(true)}>
            Edit product
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Price" value={<Money value={product.price} animate />} hint="Including VAT" />
        <Stat label="In stock" value={product.stock} goodDirection={product.stock > product.reorderAt ? 'up' : 'down'} />
        <Stat label="Sold (30 days)" value={product.sold30d} />
        <Stat label="Reorder at" value={product.reorderAt} animate={false} />
      </div>

      <Tabs defaultValue="variants">
        <TabsList>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="variants" className="pt-4">
          <Section>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead className="text-end">Price</TableHead>
                  <TableHead className="text-end">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">{variant.name}</TableCell>
                    <TableCell className="text-muted-foreground hidden font-mono text-xs sm:table-cell">
                      {variant.sku}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      <Money value={variant.price} />
                    </TableCell>
                    <TableCell
                      className={`text-end tabular-nums ${
                        variant.stock < 5 ? 'text-[var(--destructive-soft-foreground)] font-medium' : ''
                      }`}
                    >
                      {variant.stock}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        <TabsContent value="media" className="pt-4">
          <Card>
            <CardHeader
              action={
                <span className="text-muted-foreground text-xs tabular-nums">
                  {selected.length} selected
                </span>
              }
            >
              <CardTitle>Media library</CardTitle>
            </CardHeader>
            <CardBody>
              <AssetGrid
                assets={MEDIA}
                value={selected}
                onValueChange={setSelected}
                onOpen={(asset) => notify(asset.name, 'Opening the full-size asset.')}
              />
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={edit} onOpenChange={setEdit}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit {product.name}</SheetTitle>
            <SheetDescription>
              Changes apply to every variant that has not overridden the field.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <TextField label="Name" defaultValue={product.name} />
            <TextField
              label="Price"
              description="Pounds. Variants can override it."
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
            <SelectField
              label="Category"
              defaultValue={product.category}
              options={['Seating', 'Desks', 'Accessories', 'Lighting'].map((value) => ({ value, label: value }))}
            />
            <SelectField
              label="Status"
              description="Draft products are hidden from the storefront."
              defaultValue={product.status}
              options={[
                { value: 'live', label: 'Live' },
                { value: 'draft', label: 'Draft' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
            <TextField label="Reorder at" type="number" defaultValue={product.reorderAt} />
          </SheetBody>
          <SheetFooter>
            <Button variant="secondary" onClick={() => setEdit(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setEdit(false)
                notify('Saved', `${product.name} — £${price}.`, 'green')
              }}
            >
              Save product
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Page>
  )
}

/* ---------------------------------------------------------------- customers */

const SEGMENT_TONE = {
  vip: 'violet',
  returning: 'green',
  new: 'blue',
  lapsed: 'amber',
} as const

function Customers() {
  const { open } = useRoute()

  return (
    <Page>
      <PageHead
        title="Customers"
        description="Five people, sorted by what they have actually spent rather than by when they signed up."
      />

      <Section>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Segment</TableHead>
              <TableHead className="text-end">Orders</TableHead>
              <TableHead className="text-end">Lifetime</TableHead>
              <TableHead className="hidden text-end md:table-cell">Last order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...CUSTOMERS]
              .sort((a, b) => b.spend - a.spend)
              .map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => open('customers', customer.id)}
                >
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <Avatar size="sm" name={customer.name} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{customer.name}</span>
                        <span className="text-muted-foreground truncate text-xs">
                          {customer.email}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge size="sm" color={SEGMENT_TONE[customer.segment]}>
                      {customer.segment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{customer.orders}</TableCell>
                  <TableCell className="text-end font-medium tabular-nums">
                    <Money value={customer.spend} />
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-end text-xs md:table-cell">
                    {customer.last}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Section>
    </Page>
  )
}

function CustomerDetail({ customer }: { customer: Customer }) {
  const { back, open } = useRoute()
  const orders = ORDERS.filter((order) => order.email === customer.email)

  return (
    <Page>
      <PageHead
        title={
          <span className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Back to customers" onClick={back}>
              <ArrowLeft />
            </Button>
            {customer.name}
            <Badge size="sm" color={SEGMENT_TONE[customer.segment]}>
              {customer.segment}
            </Badge>
          </span>
        }
        description={`${customer.email} · ${customer.country} · first ordered ${customer.first}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Lifetime value" value={<Money value={customer.spend} animate />} hint="All time" />
        <Stat label="Orders" value={customer.orders} />
        <Stat
          label="Average order"
          value={<Money value={customer.orders ? customer.spend / customer.orders : 0} animate />}
          hint={`Across ${customer.orders} orders`}
        />
        <Stat label="Last order" value={customer.last} animate={false} />
      </div>

      <Section
        title="Orders this week"
        description={`${customer.orders} lifetime; these are the ones still in the window.`}
      >
        {orders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => open('orders', order.id)}
                >
                  <TableCell className="font-mono font-medium">{order.number}</TableCell>
                  <TableCell>
                    <Badge size="sm" color={ORDER_TONE[order.status]}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    <Money value={orderTotal(order)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty
            bordered={false}
            icon={<ShoppingBag />}
            title="No orders in this window"
            description="This customer last ordered outside the range being shown."
          />
        )}
      </Section>
    </Page>
  )
}

/* ---------------------------------------------------------------- discounts */

function Discounts() {
  const notify = useNotify()
  const [discounts, setDiscounts] = useState(DISCOUNTS)
  const [create, setCreate] = useState(false)
  const [code, setCode] = useState('')
  const [kind, setKind] = useState('percent')
  const [value, setValue] = useState('10')

  const codeError =
    code.length > 0 && !/^[A-Z0-9]{3,}$/.test(code)
      ? 'Uppercase letters and digits only, at least three of them.'
      : discounts.some((discount) => discount.code === code)
        ? 'That code already exists.'
        : undefined

  return (
    <Page>
      <PageHead
        title="Discounts"
        description="Four codes. One has not started, one has expired, and one has no end date at all."
        actions={
          <Button size="sm" onClick={() => setCreate(true)}>
            <Plus /> New discount
          </Button>
        }
      />

      <Section>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead className="hidden sm:table-cell">Reward</TableHead>
              <TableHead className="text-end">Used</TableHead>
              <TableHead className="hidden md:table-cell">Ends</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.map((discount) => (
              <TableRow key={discount.id}>
                <TableCell className="font-mono font-medium">{discount.code}</TableCell>
                <TableCell className="text-muted-foreground hidden text-xs sm:table-cell">
                  {discount.kind === 'percent'
                    ? `${discount.value}% off`
                    : discount.kind === 'fixed'
                      ? `${money(discount.value)} off`
                      : 'Free delivery'}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {discount.used}
                  {discount.cap && (
                    <span className="text-muted-foreground"> / {discount.cap}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                  {discount.ends}
                </TableCell>
                <TableCell>
                  <Badge
                    size="sm"
                    color={
                      discount.status === 'active'
                        ? 'green'
                        : discount.status === 'scheduled'
                          ? 'blue'
                          : 'neutral'
                    }
                  >
                    {discount.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Sheet open={create} onOpenChange={setCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New discount</SheetTitle>
            <SheetDescription>
              Codes are case-insensitive at checkout but stored uppercase.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <TextField
              label="Code"
              required
              autoFocus
              value={code}
              error={codeError}
              placeholder="AUTUMN15"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <SelectField
              label="Reward"
              value={kind}
              onValueChange={setKind}
              options={[
                { value: 'percent', label: 'Percentage off' },
                { value: 'fixed', label: 'Fixed amount off' },
                { value: 'shipping', label: 'Free delivery' },
              ]}
            />
            {kind !== 'shipping' && (
              <TextField
                label={kind === 'percent' ? 'Percent off' : 'Amount off, in pounds'}
                type="number"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
            <TextField label="Usage cap" type="number" defaultValue={500} description="Leave empty for unlimited." />
          </SheetBody>
          <SheetFooter>
            <Button variant="secondary" onClick={() => setCreate(false)}>
              Cancel
            </Button>
            <Button
              disabled={!code || Boolean(codeError)}
              onClick={() => {
                setDiscounts((current) => [
                  {
                    id: `d${current.length + 1}`,
                    code,
                    kind: kind as 'percent' | 'fixed' | 'shipping',
                    value: kind === 'fixed' ? Number(value) * 100 : Number(value),
                    used: 0,
                    cap: 500,
                    status: 'active',
                    ends: 'no end date',
                  },
                  ...current,
                ])
                setCreate(false)
                setCode('')
                notify('Discount live', `${code} can be used at checkout now.`, 'green')
              }}
            >
              Create discount
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Page>
  )
}

/* ------------------------------------------------------------------ reports */

function Reports() {
  const notify = useNotify()
  const [basket, setBasket] = useState(BASKET)

  const subtotal = basket.reduce((total, item) => total + item.price * item.quantity, 0)

  return (
    <Page>
      <PageHead
        title="Reports"
        description="Where revenue comes from, who stays, and which model you have to believe to say so."
      />

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue and refunds</CardTitle>
          </CardHeader>
          <CardBody>
            <Chart
              variant="bar"
              height={200}
              series={REVENUE.series}
              labels={REVENUE.labels}
              valueFormat={(value) => (value ? `£${Math.round(value / 1000)}k` : '£0')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkout funnel</CardTitle>
          </CardHeader>
          <CardBody>
            <Funnel stages={FUNNEL} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <Attribution
            journeys={JOURNEYS}
            defaultModel="last"
            valueFormat={(value) => money(value * 100)}
            footnote="Switch the model and the answer moves. Last touch gives everything to the click before the order; first touch pays the channel that found the customer months earlier."
          />
        </CardBody>
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Retention by signup month</CardTitle>
          </CardHeader>
          <CardBody>
            <RetentionCurve cohorts={COHORTS} height={240} />
          </CardBody>
        </Card>
        <Section title="The same cohorts, as a triangle">
          {/* The curve wants the fraction that came back; the triangle wants the
              headcount and works the percentage out itself. Same fixture, two
              shapes — converting here beats storing both. */}
          <CohortTable
            cohorts={COHORTS.map((cohort) => ({
              label: cohort.name,
              size: cohort.size,
              values: cohort.values.map((share) => Math.round(cohort.size * share)),
            }))}
            periods={7}
          />
        </Section>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What a live basket looks like</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Cart
            lines={basket}
            currency="GBP"
            onQuantityChange={(id, quantity) =>
              setBasket((current) =>
                current.map((item) => (item.id === id ? { ...item, quantity } : item)),
              )
            }
            onRemove={(id) => {
              setBasket((current) => current.filter((item) => item.id !== id))
              notify('Removed', 'The basket total updated.')
            }}
            empty={
              <Empty
                bordered={false}
                icon={<ShoppingBag />}
                title="The basket is empty"
                description="Add something back to see the summary recalculate."
                action={
                  <Button size="sm" variant="secondary" onClick={() => setBasket(BASKET)}>
                    Restore basket
                  </Button>
                }
              />
            }
          />
          <CheckoutSummary
            subtotal={subtotal}
            currency="GBP"
            lines={[
              { id: 'discount', label: 'Discount — WELCOME10', amount: -Math.round(subtotal * 0.1), discount: true },
              { id: 'delivery', label: 'Delivery', amount: null, note: 'Depends on your address' },
              { id: 'vat', label: 'VAT (20%)', amount: Math.round(subtotal * 0.9 * 0.2) },
            ]}
            footer={<Button className="w-full">Continue to payment</Button>}
          />
        </CardBody>
      </Card>
    </Page>
  )
}

/* --------------------------------------------------------------------- root */

const NAV_GROUPS = [
  {
    items: [
      { id: 'orders', label: 'Orders', icon: <Receipt />, count: ORDERS.length },
      { id: 'products', label: 'Products', icon: <Package />, count: PRODUCTS.length },
      { id: 'customers', label: 'Customers', icon: <Users />, count: CUSTOMERS.length },
    ],
  },
  {
    label: 'Growth',
    items: [
      { id: 'discounts', label: 'Discounts', icon: <TicketPercent />, count: DISCOUNTS.length },
      { id: 'reports', label: 'Reports', icon: <ChartLine /> },
    ],
  },
]

const NOTIFICATIONS = [
  { id: 'n1', title: 'Low stock: Field Jacket / M', body: '3 left, and 11 sold this week', at: '20m', unread: true },
  { id: 'n2', title: 'Refund requested', body: '#4417 — one line, £84.00', at: '1h', unread: true },
  { id: 'n3', title: 'SUMMER20 has expired', body: '3,918 of 4,000 redemptions used', at: '1d' },
]

const SECTION_LABEL: Record<string, string> = {
  orders: 'Orders',
  products: 'Products',
  customers: 'Customers',
  discounts: 'Discounts',
  reports: 'Reports',
}

/**
 * The content router.
 *
 * A record id in the route resolves against the fixture; a stale one falls back
 * to the list rather than rendering an empty detail page, which is what a
 * bookmarked order that has since been deleted actually looks like.
 */
function ShopContent() {
  const { route } = useRoute()

  if (route.record) {
    if (route.section === 'orders') {
      const order = ORDERS.find((item) => item.id === route.record)
      if (order) return <OrderDetail order={order} />
    }
    if (route.section === 'products') {
      const product = PRODUCTS.find((item) => item.id === route.record)
      if (product) return <ProductDetail product={product} />
    }
    if (route.section === 'customers') {
      const customer = CUSTOMERS.find((item) => item.id === route.record)
      if (customer) return <CustomerDetail customer={customer} />
    }
  }

  switch (route.section) {
    case 'products':
      return <Products />
    case 'customers':
      return <Customers />
    case 'discounts':
      return <Discounts />
    case 'reports':
      return <Reports />
    default:
      return <Orders />
  }
}

/**
 * The palette. Orders are searchable by customer as well as by number, because
 * nobody remembers a number — they remember who was on the phone.
 */
function commandsFor({ go, open }: Nav) {
  return [
    { id: 'go-orders', label: 'Go to Orders', group: 'Navigate', icon: <Receipt />, onSelect: () => go({ section: 'orders' }) },
    { id: 'go-products', label: 'Go to Products', group: 'Navigate', icon: <Package />, onSelect: () => go({ section: 'products' }) },
    { id: 'go-customers', label: 'Go to Customers', group: 'Navigate', icon: <Users />, onSelect: () => go({ section: 'customers' }) },
    { id: 'go-discounts', label: 'Go to Discounts', group: 'Navigate', icon: <TicketPercent />, onSelect: () => go({ section: 'discounts' }) },
    { id: 'go-reports', label: 'Go to Reports', group: 'Navigate', icon: <ChartLine />, onSelect: () => go({ section: 'reports' }) },
    ...ORDERS.slice(0, 5).map((order) => ({
      id: `order-${order.id}`,
      label: `${order.number} — ${order.customer}`,
      group: 'Orders',
      keywords: `${order.id} ${order.customer} ${order.email} ${order.status}`,
      icon: <Receipt />,
      onSelect: () => open('orders', order.id),
    })),
    ...PRODUCTS.slice(0, 4).map((product) => ({
      id: `product-${product.id}`,
      label: product.name,
      group: 'Products',
      keywords: product.sku,
      icon: <Package />,
      onSelect: () => open('products', product.id),
    })),
  ]
}

function crumbsFor({ route, go }: Nav): Crumb[] {
  const section = SECTION_LABEL[route.section] ?? 'Storefront'

  if (!route.record) return [{ label: section }]

  const record =
    route.section === 'orders'
      ? ORDERS.find((item) => item.id === route.record)?.number
      : route.section === 'products'
        ? PRODUCTS.find((item) => item.id === route.record)?.name
        : CUSTOMERS.find((item) => item.id === route.record)?.name

  return [
    { label: section, onClick: () => go({ section: route.section }) },
    { label: record ?? route.record },
  ]
}

function Shop() {
  return (
    <Shell
      home="orders"
      product="Storefront"
      groups={NAV_GROUPS}
      notifications={NOTIFICATIONS}
      user={{ name: 'Grace Hopper', email: 'grace@astralyx.dev', plan: 'Retail · 4 stores' }}
      commands={commandsFor}
      crumbs={crumbsFor}
    >
      <ShopContent />
    </Shell>
  )
}

export const shopExample: ExampleEntry = {
  id: 'storefront',
  label: 'Storefront',
  description:
    'The back office of a shop: an order you can refund line by line, stock counted per variant, and a report whose answer changes with the attribution model you pick.',
  uses: [
    'Data Grid', 'Cart', 'Checkout Summary', 'Asset Grid', 'Attribution', 'Funnel',
    'Cohort Table', 'Retention Curve', 'Chart', 'Stat', 'Timeline', 'Sheet',
    'Alert Dialog', 'Tabs', 'Table', 'Empty', 'Badge', 'Avatar',
  ],
  render: () => <Shop />,
}
