import type { ComponentProps } from 'react'
import { Sparkles } from 'lucide-react'
import { Select } from '@/components/ui/select'

/**
 * Picks which model answers.
 *
 * A Select with the naming convention folded in: the family and the tier read
 * as one line, so "Opus · most capable" is scannable where a bare model id is
 * not.
 */
export type Model = {
  id: string
  name: string
  /** A short capability or cost note shown beside the name. */
  note?: string
  disabled?: boolean
}

function ModelSelect({
  models,
  size = 'sm',
  placeholder = 'Model',
  ...props
}: Omit<ComponentProps<typeof Select>, 'options'> & { models: Model[] }) {
  return (
    <Select
      size={size}
      icon={<Sparkles />}
      placeholder={placeholder}
      options={models.map((model) => ({
        value: model.id,
        label: model.note ? `${model.name} · ${model.note}` : model.name,
        disabled: model.disabled,
      }))}
      {...props}
    />
  )
}

export { ModelSelect }
