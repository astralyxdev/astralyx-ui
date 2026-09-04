import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { ComponentEntry, ComposerState } from './types'

const ROWS = [
  ['INV-001', 'Acme Corp', 'paid', '$1,200.00'],
  ['INV-002', 'Globex', 'pending', '$450.00'],
  ['INV-003', 'Initech', 'failed', '$980.00'],
  ['INV-004', 'Umbrella', 'paid', '$2,400.00'],
]

const TONE = { paid: 'green', pending: 'amber', failed: 'destructive' } as const

function TablePreview({ caption, footer }: { caption: boolean; footer: boolean }) {
  return (
    <Table>
      {caption && <TableCaption>Invoices from the last 30 days.</TableCaption>}
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-end">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map(([id, customer, status, amount]) => (
          <TableRow key={id}>
            <TableCell className="font-mono text-xs">{id}</TableCell>
            <TableCell>{customer}</TableCell>
            <TableCell>
              <Badge size="sm" color={TONE[status as keyof typeof TONE]}>{status}</Badge>
            </TableCell>
            <TableCell className="text-end tabular-nums">{amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      {footer && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-end tabular-nums">$5,030.00</TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}

export const tableEntry: ComponentEntry = {
  id: 'table',
  label: 'Table',
  description:
    'Rows and columns of structured data. The wrapper scrolls rather than the page, so a wide table never forces horizontal scroll on the whole document.',
  usage: `import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow><TableHead>Invoice</TableHead></TableRow>
  </TableHeader>
  <TableBody>
    <TableRow><TableCell>INV-001</TableCell></TableRow>
  </TableBody>
</Table>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'caption', label: 'TableCaption', default: false },
      { type: 'boolean', prop: 'footer', label: 'TableFooter', default: true },
    ],
    render: (state: ComposerState) => (
      <TablePreview caption={Boolean(state.caption)} footer={Boolean(state.footer)} />
    ),
    code: (state) => `<Table>
${state.caption ? '  <TableCaption>Invoices from the last 30 days.</TableCaption>\n' : ''}  <TableHeader>…</TableHeader>
  <TableBody>…</TableBody>
${state.footer ? '  <TableFooter>…</TableFooter>\n' : ''}</Table>`,
  },
  api: [
    { name: 'Table containerClassName', type: 'string', description: 'Styles the scrolling wrapper; className styles the <table> itself.' },
    { name: 'TableRow data-state', type: '"selected"', description: 'Marks a row as selected, which tints its background.' },
    { name: 'TableHeader / TableBody / TableFooter', type: 'section', description: 'Map to thead, tbody and tfoot. The footer is tinted and divided.' },
    { name: 'TableCaption', type: 'caption', description: 'Rendered below the table, per caption-side.' },
  ],
  demos: [
    { title: 'With a footer', code: `<TableFooter>…</TableFooter>`, stack: true, render: () => <TablePreview caption={false} footer /> },
    { title: 'With a caption', code: `<TableCaption>Invoices…</TableCaption>`, stack: true, render: () => <TablePreview caption footer={false} /> },
  ],
}
