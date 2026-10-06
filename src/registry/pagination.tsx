'use client'

import { useState } from 'react'
import {
  CursorPagination,
  OffsetPagination,
  Pagination,
  useCursorPagination,
} from '@/components/ui/pagination'
import type { ComponentEntry, ComposerState } from './types'

const SIZES = ['icon-xs', 'icon-sm', 'icon'] as const

function composePagination(state: ComposerState) {
  const attrs = [`page={page}`, `count={${state.count}}`, 'onPageChange={setPage}']
  if (state.siblings !== '1') attrs.push(`siblings={${state.siblings}}`)
  if (state.size !== 'icon-sm') attrs.push(`size="${state.size}"`)
  if (state.compact) attrs.push('compact')
  return `<Pagination\n  ${attrs.join('\n  ')}\n/>`
}

/** The composer needs live page state, which a plain render function has not. */
function LivePagination({
  count,
  siblings,
  size,
  compact,
}: {
  count: number
  siblings: number
  size: (typeof SIZES)[number]
  compact: boolean
}) {
  const [page, setPage] = useState(1)
  const clamped = Math.min(page, count)

  return (
    <Pagination
      page={clamped}
      count={count}
      siblings={siblings}
      size={size}
      compact={compact}
      onPageChange={setPage}
    />
  )
}

/** 57 rows, 20 to a page — enough for a short last page. */
function LiveOffsetPagination() {
  const [offset, setOffset] = useState(0)
  return <OffsetPagination offset={offset} pageSize={20} total={57} onOffsetChange={setOffset} />
}

/** A fake keyset API: the cursor is the index of the next page's first row. */
function LiveCursorPagination() {
  const pages = useCursorPagination('all')
  const start = pages.cursor ? Number(pages.cursor) : 0
  const next = start + 25 < 10_000 ? String(start + 25) : null
  return (
    <CursorPagination
      page={pages.page}
      pageSize={25}
      rows={25}
      total={10_000}
      totalCapped
      nextCursor={next}
      onNext={pages.next}
      onPrevious={pages.previous}
    />
  )
}

export const paginationEntry: ComponentEntry = {
  id: 'pagination',
  label: 'Pagination',
  description:
    'Move between pages of results. The windowing rule — how many neighbours to show and where the gaps fall — is exported as pageItems, so it can be reused or tested on its own. OffsetPagination and CursorPagination cover lists that cannot be browsed by page number: a range, Previous and Next.',
  usage: `import { Pagination } from '@/components/ui/pagination'

const [page, setPage] = useState(1)

<Pagination page={page} count={20} onPageChange={setPage} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'count', label: 'count', options: ['1', '5', '10', '20', '100'], default: '20' },
      { type: 'select', prop: 'siblings', label: 'siblings', options: ['0', '1', '2'], default: '1' },
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'icon-sm' },
      { type: 'boolean', prop: 'compact', label: 'compact', default: false },
    ],
    render: (state) => (
      <LivePagination
        key={`${state.count}-${state.siblings}`}
        count={Number(state.count)}
        siblings={Number(state.siblings)}
        size={String(state.size) as (typeof SIZES)[number]}
        compact={Boolean(state.compact)}
      />
    ),
    code: composePagination,
  },
  api: [
    { name: 'page', type: 'number', description: 'Current page, 1-based. Controlled — the component holds no state.' },
    { name: 'count', type: 'number', description: 'Total number of pages.' },
    { name: 'onPageChange', type: '(page: number) => void', description: 'Fires with the requested page. Out-of-range requests are filtered out first.' },
    { name: 'siblings', type: 'number', default: '1', description: 'Neighbours shown either side of the current page. First and last are always present.' },
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'icon-sm'", description: 'Button size for the controls.' },
    { name: 'compact', type: 'boolean', default: 'false', description: 'Drop the numbers and show "page / count" between the arrows.' },
    { name: 'pageItems', type: '(page, count, siblings) => (number | "gap")[]', description: 'The exported windowing function behind the row.' },
    { name: 'OffsetPagination', type: 'component', description: '"21–40 of 57" with Previous and Next, for a list paged by `offset` and `pageSize`. Renders nothing while everything fits on one page, and when the total shrinks under the current page — rows deleted, a stale link — moves to the last page that still holds rows.' },
    { name: 'maxOffset', type: 'number', description: 'The deepest offset the API accepts. Next stops there, and an offset past it is moved back.' },
    { name: 'CursorPagination', type: 'component', description: 'The same line for a keyset-paged list, which knows only its page index, the rows on it and the next cursor. `totalCapped` shows a total counted up to a cap as "10,000+".' },
    { name: 'useCursorPagination', type: '(resetKey: string) => { cursor, page, next, previous, first }', description: 'The trail of cursors behind the current page — a cursor API has no way back, so it is remembered here. A new `resetKey` (the filters changed) starts again at the first page.' },
    { name: 'rangeLabel', type: '({ from, to, total }) => ReactNode', description: 'The range line, from numbers already formatted for `locale`. Defaults to "21–40 of 57".' },
    { name: 'lastPageOffset', type: '(total, pageSize) => number', description: 'The offset of the last page holding anything.' },
  ],
  demos: [
    {
      title: 'Default',
      stack: true,
      code: `<Pagination page={page} count={20} onPageChange={setPage} />`,
      render: () => <LivePagination count={20} siblings={1} size="icon-sm" compact={false} />,
    },
    {
      title: 'Few pages — no gaps',
      stack: true,
      code: `<Pagination page={page} count={5} onPageChange={setPage} />`,
      render: () => <LivePagination count={5} siblings={1} size="icon-sm" compact={false} />,
    },
    {
      title: 'More siblings',
      stack: true,
      code: `<Pagination page={page} count={100} siblings={2} onPageChange={setPage} />`,
      render: () => <LivePagination count={100} siblings={2} size="icon-sm" compact={false} />,
    },
    {
      title: 'Compact',
      stack: true,
      code: `<Pagination page={page} count={20} compact onPageChange={setPage} />`,
      render: () => <LivePagination count={20} siblings={1} size="icon-sm" compact />,
    },
    {
      title: 'By offset',
      stack: true,
      code: `const [offset, setOffset] = useState(0)

<OffsetPagination offset={offset} pageSize={20} total={57} onOffsetChange={setOffset} />`,
      render: () => <LiveOffsetPagination />,
    },
    {
      title: 'By cursor, with a capped total',
      stack: true,
      code: `const pages = useCursorPagination(filtersKey)
const { data } = useQuery(['rows', filtersKey, pages.cursor], …)

<CursorPagination
  page={pages.page}
  pageSize={25}
  rows={data?.rows.length}
  total={data?.total}
  totalCapped={data?.totalCapped}
  nextCursor={data?.nextCursor}
  onNext={pages.next}
  onPrevious={pages.previous}
/>`,
      render: () => <LiveCursorPagination />,
    },
  ],
}
