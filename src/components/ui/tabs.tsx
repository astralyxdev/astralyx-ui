import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { TabsProvider, tabIds, useTabs } from '@/components/primitives/tabs'
import { enterFade } from '@/lib/motion'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

const listVariants = cva('flex', {
  variants: {
    variant: {
      /** Segmented control: a filled track with the active tab lifted out. */
      solid: 'bg-muted gap-0.5 p-0.5',
      /** A rule with the active tab underlined. */
      underline: 'border-border gap-4 border-b',
    },
    orientation: {
      horizontal: 'flex-row items-center',
      vertical: 'flex-col items-stretch',
    },
  },
  compoundVariants: [
    { variant: 'underline', orientation: 'vertical', class: 'border-b-0 border-r' },
  ],
  defaultVariants: { variant: 'solid', orientation: 'horizontal' },
})

const triggerVariants = cva(
  [
    'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap',
    'text-sm font-medium',
    'transition-colors duration-150 ease-out motion-reduce:transition-none',
    'disabled:pointer-events-none disabled:opacity-50',
    focusRing,
  ].join(' '),
  {
    variants: {
      variant: {
        solid: cn(
          radius.control,
          'px-3 py-1.5',
          'text-muted-foreground hover:text-foreground',
          'data-[state=active]:bg-background data-[state=active]:text-foreground',
        ),
        underline: cn(
          'border-b-2 border-transparent px-1 py-2',
          'text-muted-foreground hover:text-foreground',
          'data-[state=active]:border-foreground data-[state=active]:text-foreground',
        ),
      },
    },
    defaultVariants: { variant: 'solid' },
  },
)

type TabsProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  activationMode?: 'automatic' | 'manual'
}

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  activationMode = 'automatic',
  ...props
}: TabsProps) {
  return (
    <TabsProvider
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      orientation={orientation}
      activationMode={activationMode}
    >
      <div
        data-slot="tabs"
        className={cn(
          'flex gap-3',
          orientation === 'vertical' ? 'flex-row' : 'flex-col',
          className,
        )}
        {...props}
      />
    </TabsProvider>
  )
}

function TabsList({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof listVariants>) {
  const { orientation, onListKeyDown } = useTabs()

  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      aria-orientation={orientation}
      onKeyDown={onListKeyDown}
      className={cn(
        listVariants({ variant, orientation }),
        variant === 'underline' ? '' : radius.control,
        'w-fit',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  variant,
  value,
  ...props
}: Omit<ComponentProps<'button'>, 'value'> &
  VariantProps<typeof triggerVariants> & { value: string }) {
  const { value: selected, select, baseId } = useTabs()
  const active = selected === value
  const ids = tabIds(baseId, value)

  return (
    <button
      type="button"
      role="tab"
      id={ids.trigger}
      data-slot="tabs-trigger"
      data-value={value}
      data-state={active ? 'active' : 'inactive'}
      aria-selected={active}
      // Only the active panel is mounted, so only the active trigger can point
      // at one. Setting it unconditionally leaves every inactive tab with a
      // dangling reference to an element that is not in the document.
      aria-controls={active ? ids.panel : undefined}
      // Only the active tab is in the tab order; arrows move between the rest.
      tabIndex={active ? 0 : -1}
      onClick={() => select(value)}
      className={cn(triggerVariants({ variant }), className)}
      {...props}
    />
  )
}

/**
 * A panel.
 *
 * Unmounted when it is not selected, which is usually what you want: a panel
 * that keeps a video playing or a subscription open behind another tab is a
 * bug, and a fresh mount is the cheapest way to guarantee it cannot happen.
 *
 * `keepMounted` is for the case where the content has to exist whether or not
 * anyone is looking at it — the one that prompted this was documentation, where
 * the source behind a Code tab is the page's actual content and unmounting it
 * meant it never reached the HTML a crawler reads. Hidden, not removed: the
 * panel keeps its markup, and `hidden` takes it out of the view and out of the
 * accessibility tree just as unmounting did.
 */
function TabsContent({
  className,
  value,
  keepMounted = false,
  ...props
}: ComponentProps<'div'> & { value: string; keepMounted?: boolean }) {
  const { value: selected, baseId } = useTabs()
  const active = selected === value
  if (!active && !keepMounted) return null

  const ids = tabIds(baseId, value)

  return (
    <div
      role="tabpanel"
      id={ids.panel}
      data-slot="tabs-content"
      aria-labelledby={ids.trigger}
      // A panel nobody can see is not a tab stop.
      tabIndex={active ? 0 : -1}
      hidden={!active}
      className={cn(active && enterFade, 'outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger, listVariants, triggerVariants }
export type { TabsProps }
