import { useMemo, type ComponentProps } from 'react'
import { GitBranch, Tag } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import type { fieldSize } from '@/lib/styles'

/**
 * A branch and tag picker.
 *
 * A Combobox underneath — repositories routinely have hundreds of branches, so
 * search is not optional — with the domain knowledge on top: the default branch
 * is pinned first, protected branches are marked, and tags are labelled so they
 * are not mistaken for branches.
 */
export type BranchOption = {
  name: string
  kind?: 'branch' | 'tag'
  isDefault?: boolean
  protected?: boolean
}

function BranchSelect({
  branches,
  value,
  defaultValue,
  onValueChange,
  size = 'sm',
  placeholder = 'Switch branch',
  ...props
}: Omit<ComponentProps<typeof Combobox>, 'options' | 'size'> & {
  branches: BranchOption[]
  size?: keyof typeof fieldSize
}) {
  const options = useMemo(() => {
    // Default first, then branches, then tags — the order people scan in.
    const ranked = [...branches].sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
      const kind = (x: BranchOption) => (x.kind === 'tag' ? 1 : 0)
      if (kind(a) !== kind(b)) return kind(a) - kind(b)
      return a.name.localeCompare(b.name)
    })

    return ranked.map((branch) => ({
      value: branch.name,
      label: [
        branch.name,
        branch.isDefault ? '· default' : '',
        branch.protected ? '· protected' : '',
        branch.kind === 'tag' ? '· tag' : '',
      ]
        .filter(Boolean)
        .join(' '),
    }))
  }, [branches])

  return (
    <Combobox
      options={options}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      size={size}
      placeholder={placeholder}
      searchPlaceholder="Find a branch or tag…"
      emptyMessage="Nothing matches"
      {...props}
    />
  )
}

/** The icon that belongs beside a ref of this kind. */
function RefIcon({ kind }: { kind?: 'branch' | 'tag' }) {
  return kind === 'tag' ? <Tag /> : <GitBranch />
}

export { BranchSelect, RefIcon }
