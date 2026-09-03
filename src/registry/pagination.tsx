import { useState } from 'react'
import { Pagination } from '@/components/ui/pagination'
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

export const paginationEntry: ComponentEntry = {
  id: 'pagination',
  label: 'Pagination',
  description:
    'Move between pages of results. The windowing rule — how many neighbours to show and where the gaps fall — is exported as pageItems, so it can be reused or tested on its own.',
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
  ],
}
