import { createContext, use, type ComponentProps } from 'react'
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
      /**
       * A browser's tab strip: the active tab is the panel, pulled upwards.
       *
       * The strip is the recessed ground and the tabs sit flush on its bottom
       * edge, so the active one runs straight into the content below it with
       * nothing between them.
       */
      browser: 'bg-muted gap-1 px-1.5 pt-1.5',
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
        /*
         * The connected tab.
         *
         * No borders anywhere, which is the whole trick: the active tab and the
         * panel are the same fill, so where they meet there is nothing to draw
         * and nothing to line up. A bordered version has to hide one border
         * with another and comes apart at every zoom level.
         *
         * The two pseudo-elements are the outward flare at the bottom corners.
         * Each is a square of panel fill sitting just outside the tab, with a
         * quarter circle masked out of the corner that faces away from it —
         * which leaves the concave curve a browser tab has and a folder tab
         * does not.
         */
        browser: cn(
          // Tall enough to be the header's own height class. A browser's tab
          // fills its titlebar; at the default control padding it came out
          // shorter than the collapse control beside it and read as something
          // dropped into the bar rather than part of it.
          'relative h-9 rounded-t-lg px-4',
          'text-muted-foreground hover:text-foreground',
          'data-[state=active]:bg-card data-[state=active]:text-foreground',
          'data-[state=active]:before:bg-card data-[state=active]:after:bg-card',
          // The flares carry the same transition as the tab. Without it the
          // fill eases across while the two corners snap, and the shape looks
          // like it arrives in two pieces.
          'before:transition-colors before:duration-150 before:ease-out',
          'after:transition-colors after:duration-150 after:ease-out',
          'motion-reduce:before:transition-none motion-reduce:after:transition-none',
          "before:pointer-events-none before:absolute before:-left-2 before:bottom-0 before:size-2 before:content-['']",
          "after:pointer-events-none after:absolute after:-right-2 after:bottom-0 after:size-2 after:content-['']",
          'before:[mask-image:radial-gradient(circle_at_top_left,transparent_8px,black_8.5px)]',
          'after:[mask-image:radial-gradient(circle_at_top_right,transparent_8px,black_8.5px)]',
        ),
      },
    },
    defaultVariants: { variant: 'solid' },
  },
)

type TabsVariant = NonNullable<VariantProps<typeof listVariants>['variant']>

/**
 * The look, shared down the tree.
 *
 * It lives here rather than in the primitive because the primitive is
 * behaviour: roving focus, activation mode, ids. Nothing about how a tab is
 * painted belongs in it.
 *
 * A variant set on the child still wins, so the older way of writing it —
 * `variant` on the list and on each trigger — keeps working. What the context
 * adds is a variant the *panel* can see, which `browser` needs: an active tab
 * that runs into its content has to know what the content looks like.
 */
const VariantContext = createContext<TabsVariant>('solid')

function useTabsVariant(override: TabsVariant | null | undefined) {
  const inherited = use(VariantContext)
  return override ?? inherited
}

type TabsProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  /** Sets the look for the list, the triggers and the panel at once. */
  variant?: TabsVariant
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
  variant = 'solid',
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
      <VariantContext value={variant}>
        <div
          data-slot="tabs"
          data-variant={variant}
          className={cn(
            'flex',
            // The strip and the panel are one surface, so there is nothing to
            // space apart. Every other variant reads as two things.
            variant === 'browser' ? 'gap-0' : 'gap-3',
            orientation === 'vertical' ? 'flex-row' : 'flex-col',
            className,
          )}
          {...props}
        />
      </VariantContext>
    </TabsProvider>
  )
}

function TabsList({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof listVariants>) {
  const { orientation, onListKeyDown } = useTabs()
  const look = useTabsVariant(variant)

  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      aria-orientation={orientation}
      onKeyDown={onListKeyDown}
      className={cn(
        listVariants({ variant: look, orientation }),
        look === 'underline' ? '' : radius.control,
        // A browser strip spans its container and is only round on top; the
        // panel below finishes the shape.
        look === 'browser' ? 'w-full rounded-b-none' : 'w-fit',
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
  const look = useTabsVariant(variant)
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
      className={cn(triggerVariants({ variant: look }), className)}
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
  variant,
  ...props
}: ComponentProps<'div'> & {
  value: string
  keepMounted?: boolean
  variant?: TabsVariant
}) {
  const { value: selected, baseId } = useTabs()
  const look = useTabsVariant(variant)
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
      className={cn(
        active && enterFade,
        'outline-none',
        // The panel *is* the active tab, continued. Same fill, no border
        // between them, and the corners it does round are the two at the
        // bottom — the strip above rounds the other two.
        look === 'browser' && cn('bg-card p-4', radius.control, 'rounded-t-none'),
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger, listVariants, triggerVariants }
export type { TabsProps }
