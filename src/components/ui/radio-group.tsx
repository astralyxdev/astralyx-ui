import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  RadioGroupProvider,
  useRadioGroup,
} from '@/components/primitives/radio-group'
import { indicatorBase, radioSize, type Responsive } from '@/lib/styles'
import { cn } from '@/lib/utils'

const dotVariants = cva(
  [
    indicatorBase,
    'rounded-full [corner-shape:round]',
    'peer-checked:border-primary peer-checked:bg-primary',
    'peer-focus-visible:border-ring peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]',
    // The dot is a descendant of this box, so the variant lives here.
    '[&>span]:opacity-0 peer-checked:[&>span]:opacity-100',
  ].join(' '),
  {
    variants: {
      size: {
        sm: radioSize.sm,
        default: radioSize.default,
        lg: radioSize.lg,
      },
      error: { true: 'border-destructive', false: '' },
    },
    defaultVariants: { size: 'default', error: false },
  },
)

const DOT_SIZE = {
  sm: 'size-1.5',
  default: 'size-2',
  lg: 'size-2.5',
} as const

type RadioGroupProps = ComponentProps<'div'> & {
  name?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  /** Lay the options out in a row instead of a column. */
  orientation?: 'vertical' | 'horizontal'
  /** Breakpoint a horizontal group becomes a row at. */
  responsive?: Responsive
  children: ReactNode
}

/** Written out per breakpoint; an interpolated prefix generates no CSS. */
const RESPONSIVE_ROW = {
  sm: 'flex-col sm:flex-row sm:flex-wrap',
  md: 'flex-col md:flex-row md:flex-wrap',
  lg: 'flex-col lg:flex-row lg:flex-wrap',
} as const

function RadioGroup({
  className,
  name,
  value,
  defaultValue,
  onValueChange,
  disabled,
  orientation = 'vertical',
  responsive = 'sm',
  children,
  ...props
}: RadioGroupProps) {
  const stacks = orientation === 'horizontal' && responsive !== false
  return (
    <RadioGroupProvider
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <div
        role="radiogroup"
        data-slot="radio-group"
        aria-orientation={orientation}
        className={cn(
          'flex gap-3',
          orientation === 'vertical' && 'flex-col',
          orientation === 'horizontal' &&
            (stacks ? RESPONSIVE_ROW[responsive] : 'flex-row flex-wrap'),
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </RadioGroupProvider>
  )
}

type RadioProps = Omit<ComponentProps<'input'>, 'size' | 'type' | 'value'> &
  VariantProps<typeof dotVariants> & {
    value: string
    label?: ReactNode
    description?: ReactNode
    containerClassName?: string
  }

function Radio({
  className,
  containerClassName,
  size = 'default',
  error,
  value,
  label,
  description,
  disabled,
  ...props
}: RadioProps) {
  const group = useRadioGroup()
  const isDisabled = disabled || group.disabled

  return (
    <label
      data-slot="radio"
      className={cn(
        'flex w-fit items-start gap-2.5 select-none',
        isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        containerClassName,
      )}
    >
      <input
        type="radio"
        name={group.name}
        value={value}
        checked={group.value === value}
        disabled={isDisabled}
        aria-invalid={error || undefined}
        onChange={() => group.select(value)}
        className="peer sr-only"
        {...props}
      />

      <span className={cn(dotVariants({ size, error }), className)}>
        <span
          className={cn(
            'bg-primary-foreground rounded-full transition-opacity duration-150 ease-out motion-reduce:transition-none',
            DOT_SIZE[size ?? 'default'],
          )}
        />
      </span>

      {(label || description) && (
        <span className="grid gap-0.5 leading-tight">
          {label && <span className="text-sm font-medium">{label}</span>}
          {description && (
            <span className="text-muted-foreground text-xs">{description}</span>
          )}
        </span>
      )}
    </label>
  )
}

export { Radio, RadioGroup }
export type { RadioGroupProps, RadioProps }
