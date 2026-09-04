import type { CSSProperties } from 'react'

/**
 * The kit's global style contract.
 *
 * ---------------------------------------------------------------------------
 * Rule: prefer `secondary` over `outline`.
 *
 * Where a component offers both, reach for the tinted `secondary` treatment. An
 * outline draws a line around everything it touches; a screen full of them
 * turns into a grid of boxes with no hierarchy, and the borders start competing
 * with the ones that carry real structure — a card edge, a table rule, a
 * divider. A tint separates without adding another line.
 *
 * The same applies to fields: `variant="secondary"` (filled) rather than the
 * bordered default. `outline` stays in the API for the case it is actually
 * right — a control sitting on an already-tinted surface, where a second fill
 * would compete instead of separate.
 * ---------------------------------------------------------------------------
 *
 * Every component composes these fragments instead of spelling out its own
 * focus ring, radius or control height — change a line here and the whole kit
 * follows. Anything colour- or radius-shaped resolves to a CSS variable
 * declared in `index.css`, so themes stay in one place too.
 */

/** Focus treatment shared by every interactive element. */
export const focusRing =
  'outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

/** Inset variant, for controls that sit flush against a container edge. */
export const focusRingInset =
  'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-inset'

export const disabledState = 'disabled:pointer-events-none disabled:opacity-50'

export const invalidState =
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20'

/** Auto-size any icon a component is handed, unless it sets its own size. */
export const iconChild =
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

/**
 * Corner scale, driven by `--radius` in `index.css`. Generously rounded by
 * design, but every step stays under half its control height so nothing
 * collapses into a pill.
 *
 * Keep prose here free of bare utility names: Tailwind scans this file as
 * plain text and will emit CSS for any it finds, even inside a comment.
 */
export const radius = {
  /** Chips, gutters, inline code. */
  xs: 'rounded-sm',
  /** Buttons, inputs, tabs — anything control-sized. */
  control: 'rounded-lg',
  /** Cards, code blocks, popovers. */
  surface: 'rounded-2xl',
  /** Dialogs, sheets, page-level panels. */
  panel: 'rounded-3xl',
} as const

/**
 * Height / padding scale shared by controls, so a Button and an Input of the
 * same size line up. Each step carries its own radius: a fixed one would read
 * as a pill on the short sizes and as a square on the tall ones.
 */
export const controlSize = {
  // Sizes keep the kit-wide `corner-shape: squircle` — iOS-style continuous
  // corners at half their height, which is as round as a squircle goes.
  //
  // xs is the exception: it opts out to circular corners with
  // `[corner-shape:round]`, because a squircle at 50% reads as a rounded
  // rectangle and that size is meant to be a true pill.
  xs: "h-7 gap-1.5 px-3.5 text-xs rounded-full [corner-shape:round] has-[>svg]:px-3 [&_svg:not([class*='size-'])]:size-3.5",
  sm: 'h-8 gap-1.5 px-3.5 text-sm rounded-[var(--radius-control-sm)] has-[>svg]:px-3',
  md: 'h-9 gap-2 px-4.5 text-sm rounded-[var(--radius-control-md)] has-[>svg]:px-3.5',
  lg: 'h-10 gap-2 px-6 text-sm rounded-[var(--radius-control-lg)] has-[>svg]:px-4.5',
  xl: "h-12 gap-2.5 px-8 text-base rounded-[var(--radius-control-xl)] has-[>svg]:px-6 [&_svg:not([class*='size-'])]:size-5",
  icon: 'size-9 rounded-[var(--radius-control-md)]',
  iconXs: 'size-7 rounded-full [corner-shape:round]',
  iconSm: 'size-8 rounded-[var(--radius-control-sm)]',
  iconLg: 'size-10 rounded-[var(--radius-control-lg)]',
  iconXl: "size-12 rounded-[var(--radius-control-xl)] [&_svg:not([class*='size-'])]:size-5",
} as const

/**
 * Button label sizes: one 2px step below `controlSize`'s text scale.
 *
 * Kept separate from `controlSize` on purpose — a Button's label is a short,
 * semibold action word and reads fine tighter, while a field holds arbitrary
 * user text and should not shrink with it.
 */
export const buttonText = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-xs',
  xl: 'text-sm',
} as const

/**
 * Hover and press feedback shared by every control.
 *
 * Colour only, by design: nothing in this kit moves, resizes or gains elevation
 * on interaction, and clicking animates nothing at all — only hover transitions.
 * State reads through background, border and text colour, so layout is never
 * disturbed by a pointer.
 */
export const interactive = [
  'transition-colors duration-150 ease-out',
  // The press colour lands with no transition, so a click feels answered
  // rather than faded into; the release still eases back over 150ms.
  'active:duration-0',
  'motion-reduce:transition-none',
].join(' ')

/**
 * Colour sets. Each assigns the six `--ui-*` variables that colourable variants
 * read, so one prop restyles solid, soft, outline and ghost together.
 *
 * Hover values are real tokens rather than a derived mix: a mix has to pick a
 * direction, and the right direction flips between themes — light fills need to
 * darken, dark ones to lighten. `index.css` tunes both per theme. `neutral`
 * points at the theme's own primary/secondary pair.
 *
 * These MUST stay written out in full. Tailwind extracts class names by
 * scanning source text, so a helper that builds them with template literals
 * generates no CSS at all and every colour silently disappears.
 */
export const colorSet = {
  neutral:
    '[--ui:var(--primary)] [--ui-fg:var(--primary-foreground)] [--ui-hover:var(--primary-hover)] [--ui-soft:var(--secondary)] [--ui-soft-fg:var(--secondary-foreground)] [--ui-soft-hover:var(--secondary-hover)] [--ui-soft-fg-hover:var(--secondary-foreground-hover)]',
  blue: '[--ui:var(--blue)] [--ui-fg:var(--blue-foreground)] [--ui-hover:var(--blue-hover)] [--ui-soft:var(--blue-soft)] [--ui-soft-fg:var(--blue-soft-foreground)] [--ui-soft-hover:var(--blue-soft-hover)] [--ui-soft-fg-hover:var(--blue-soft-foreground-hover)]',
  violet:
    '[--ui:var(--violet)] [--ui-fg:var(--violet-foreground)] [--ui-hover:var(--violet-hover)] [--ui-soft:var(--violet-soft)] [--ui-soft-fg:var(--violet-soft-foreground)] [--ui-soft-hover:var(--violet-soft-hover)] [--ui-soft-fg-hover:var(--violet-soft-foreground-hover)]',
  cyan: '[--ui:var(--cyan)] [--ui-fg:var(--cyan-foreground)] [--ui-hover:var(--cyan-hover)] [--ui-soft:var(--cyan-soft)] [--ui-soft-fg:var(--cyan-soft-foreground)] [--ui-soft-hover:var(--cyan-soft-hover)] [--ui-soft-fg-hover:var(--cyan-soft-foreground-hover)]',
  green:
    '[--ui:var(--green)] [--ui-fg:var(--green-foreground)] [--ui-hover:var(--green-hover)] [--ui-soft:var(--green-soft)] [--ui-soft-fg:var(--green-soft-foreground)] [--ui-soft-hover:var(--green-soft-hover)] [--ui-soft-fg-hover:var(--green-soft-foreground-hover)]',
  amber:
    '[--ui:var(--amber)] [--ui-fg:var(--amber-foreground)] [--ui-hover:var(--amber-hover)] [--ui-soft:var(--amber-soft)] [--ui-soft-fg:var(--amber-soft-foreground)] [--ui-soft-hover:var(--amber-soft-hover)] [--ui-soft-fg-hover:var(--amber-soft-foreground-hover)]',
  rose: '[--ui:var(--rose)] [--ui-fg:var(--rose-foreground)] [--ui-hover:var(--rose-hover)] [--ui-soft:var(--rose-soft)] [--ui-soft-fg:var(--rose-soft-foreground)] [--ui-soft-hover:var(--rose-soft-hover)] [--ui-soft-fg-hover:var(--rose-soft-foreground-hover)]',
  destructive:
    '[--ui:var(--destructive)] [--ui-fg:var(--destructive-foreground)] [--ui-hover:var(--destructive-hover)] [--ui-soft:var(--destructive-soft)] [--ui-soft-fg:var(--destructive-soft-foreground)] [--ui-soft-hover:var(--destructive-soft-hover)] [--ui-soft-fg-hover:var(--destructive-soft-foreground-hover)]',
} as const

/**
 * The sidebar ground: black with light ink, identically in both themes.
 *
 * Deliberately not a themed surface. The rail is chrome, not content — it
 * frames the page rather than being part of it, so it stays put while the
 * document beside it switches between light and dark.
 *
 * Note what this cannot do: recolour the controls inside it. Every Button
 * carries its own colour set (`color` defaults to `neutral`), which reassigns
 * the `--ui-*` variables on the element itself and so outranks anything set on
 * an ancestor. Put a plain Button on this ground and it will style itself for
 * the page theme, not for the rail — prefer `SidebarMenuButton`, which is
 * built for it.
 */
export const sidebarSurface = 'bg-[var(--sidebar)] text-[var(--sidebar-foreground)]'

/** Ink steps for content on `sidebarSurface`. */
export const sidebarInk = {
  label: 'text-[var(--sidebar-foreground)]/60',
  row: 'text-[var(--sidebar-foreground)]/70',
  strong: 'text-[var(--sidebar-foreground)]',
  hover: 'hover:bg-[var(--sidebar-foreground)]/10 hover:text-[var(--sidebar-foreground)]',
  active: 'bg-[var(--sidebar-foreground)]/15 text-[var(--sidebar-foreground)]',
  ring: 'outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--sidebar-foreground)]/40',
} as const

/**
 * Colour roles, measured rather than assumed.
 *
 *   `--{hue}`                  a FILL. Pair it with `--{hue}-foreground`.
 *   `--{hue}-soft-foreground`  TEXT and icons, on any page surface.
 *
 * Using a base hue as text fails WCAG AA in the light theme — measured against
 * `--card`: amber 2.04:1, cyan 3.42:1, green 4.01:1, rose 4.40:1, all short of
 * the 4.5 needed. The soft-foreground variants land between 7.2 and 8.2 in
 * light and 11 to 14 in dark. The base hues look fine in dark, which is exactly
 * why this goes unnoticed when dark is the default.
 */

/**
 * The categorical palette for data display — charts, segments, legends.
 *
 * Each entry pairs a fill with the ink that belongs on it. That pairing is the
 * whole point: `--amber` is a light oklch(0.78) whose foreground token is dark,
 * so white text on an amber segment fails contrast in both themes. Anything
 * that draws a label *on* a fill must read `ink`, not assume white.
 *
 * Previously copied into five components; a palette that drifts between a chart
 * and its own legend is worse than no palette.
 */
export const dataPalette = [
  { fill: 'var(--blue)', ink: 'var(--blue-foreground)' },
  { fill: 'var(--violet)', ink: 'var(--violet-foreground)' },
  { fill: 'var(--green)', ink: 'var(--green-foreground)' },
  { fill: 'var(--amber)', ink: 'var(--amber-foreground)' },
  { fill: 'var(--cyan)', ink: 'var(--cyan-foreground)' },
  { fill: 'var(--rose)', ink: 'var(--rose-foreground)' },
] as const

/** Fills alone, for charts that never draw text on a segment. */
export const dataFills = dataPalette.map((entry) => entry.fill)

export type ColorSet = keyof typeof colorSet

/**
 * Build a one-off colour set from any CSS colour, for when the eight named sets
 * are not enough. Everything is derived from the single value:
 *
 * - solid fill        the colour itself, shifted in lightness on hover
 * - solid text        black or white, whichever the colour can carry
 * - tinted background the colour at 12% (20% on hover)
 * - tinted text       the colour itself, shifted on hover
 * - border            the same colour as the text it sits with
 *
 * Returned as inline styles on purpose: inline declarations beat the class that
 * a `color` prop would apply, so the two can never half-override each other.
 *
 * `oklch(from …)` is relative colour syntax — Chrome 119+, Safari 16.4+,
 * Firefox 128+. `color-mix` is older and safe. Accepts anything CSS parses as a
 * colour, including a `var(--token)`.
 */
export function tintStyle(color: string) {
  return {
    '--ui': color,
    // Lightness above ~0.62 takes black text, below it takes white. The
    // multiply-and-clamp collapses that comparison into a single number.
    '--ui-fg': `oklch(from ${color} clamp(0, (0.62 - l) * 1000, 1) 0 0)`,
    '--ui-hover': `oklch(from ${color} calc(l + var(--tint-shift)) c h)`,
    '--ui-soft': `color-mix(in oklab, ${color}, transparent 88%)`,
    // Not the raw colour: used as text on the page surface a mid-tone tint
    // measures around 3.5:1. Shifted away from the surface in both themes,
    // which is exactly what the named sets' `-soft-foreground` tokens do.
    '--ui-soft-fg': `oklch(from ${color} clamp(0, calc(l + var(--tint-text-shift)), 1) c h)`,
    '--ui-soft-fg-hover': `oklch(from ${color} clamp(0, calc(l + var(--tint-text-shift) + var(--tint-shift)), 1) c h)`,
    '--ui-soft-hover': `color-mix(in oklab, ${color}, transparent 80%)`,
  } as CSSProperties
}

export const COLOR_SETS = Object.keys(colorSet) as ColorSet[]

/** Bordered container on the card surface. */
export const surface = 'border-border bg-card text-card-foreground border'

/** Base every interactive control starts from. */
export const controlBase = [
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap',
  'font-semibold select-none',
  interactive,
  focusRing,
  disabledState,
  invalidState,
  iconChild,
].join(' ')

/**
 * Base for a field: a control-shaped box that wraps a real input, so the border,
 * ring and icon slots live on the wrapper while text and caret stay native.
 * Pairs with `controlSize`, exactly like `controlBase` does for buttons.
 */
export const fieldBase = [
  'flex w-full items-center',
  interactive,
  // No ring — focus reads as a higher-contrast border and nothing else. The
  // border box is always reserved, even on the borderless variants, so this
  // never shifts layout.
  'outline-none',
  'focus-within:border-[var(--border-active)]',
  iconChild,
  // Adornments read as secondary text until the field is focused.
  '[&_[data-slot=field-slot]]:text-muted-foreground',
  'focus-within:[&_[data-slot=field-slot]]:text-foreground',
  '[&_[data-slot=field-slot]]:flex [&_[data-slot=field-slot]]:shrink-0',
  'has-[input:disabled]:pointer-events-none has-[input:disabled]:opacity-50',
].join(' ')

/**
 * Field sizing. Heights, radii and text match `controlSize` exactly, so an Input
 * and a Button of the same size still line up in a row.
 *
 * Padding derives from one number per size: the *vertical* inset, which is half
 * the space a line box leaves inside the height. The trailing side uses it as
 * is, and the leading side takes it plus 4px — text reads from the leading edge,
 * so that side carries slightly more room than the other three. The icon-to-text
 * gap uses the plain inset.
 *
 *   size  height  line box  inset   ps (inset+4)  pe
 *   xs    28px    16px       6px    10px           6px
 *   sm    32px    20px       6px    10px           6px
 *   md    36px    20px       8px    12px           8px
 *   lg    40px    20px      10px    14px          10px
 *   xl    48px    24px      12px    16px          12px
 *
 * Logical properties, so this follows writing direction rather than assuming
 * left-to-right. Icons run one step below the control text so they read as
 * adornments rather than competing with the value.
 */
export const fieldSize = {
  xs: "h-7 ps-2.5 pe-1.5 gap-1.5 text-xs rounded-full [corner-shape:round] [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 ps-2.5 pe-1.5 gap-1.5 text-sm rounded-[var(--radius-control-sm)] [&_svg:not([class*='size-'])]:size-3.5",
  md: "h-9 ps-3 pe-2 gap-2 text-sm rounded-[var(--radius-control-md)] [&_svg:not([class*='size-'])]:size-3.5",
  lg: "h-10 ps-3.5 pe-2.5 gap-2.5 text-sm rounded-[var(--radius-control-lg)] [&_svg:not([class*='size-'])]:size-4",
  xl: "h-12 ps-4 pe-3 gap-3 text-base rounded-[var(--radius-control-xl)] [&_svg:not([class*='size-'])]:size-4.5",
} as const

/**
 * Square indicators — checkbox, and the box a radio rounds off. Sized so the
 * label text beside them sits on the same optical line as the control.
 */
export const checkSize = {
  sm: 'size-4 rounded-[var(--radius-check-sm)]',
  default: 'size-5 rounded-[var(--radius-check-md)]',
  lg: 'size-6 rounded-[var(--radius-check-lg)]',
} as const

/** Radio boxes: the same footprint as a checkbox, but always circular. */
export const radioSize = {
  sm: 'size-4',
  default: 'size-5',
  lg: 'size-6',
} as const

/** Icon drawn inside a checkbox, one step under the box itself. */
export const checkIconSize = {
  sm: '[&_svg]:size-3',
  default: '[&_svg]:size-3.5',
  lg: '[&_svg]:size-4',
} as const

/**
 * Switch track and thumb. Each track is 1px border + 1px padding per side, and
 * every size is proportioned so the thumb's travel equals its own width — which
 * is why the checked state can just translate by `--thumb`:
 *
 *   sm  28x16 track, 24x12 inner, 12px thumb, 12px travel
 *   md  36x20 track, 32x16 inner, 16px thumb, 16px travel
 *   lg  44x24 track, 40x20 inner, 20px thumb, 20px travel
 */
export const switchSize = {
  sm: 'h-4 w-7 p-px [--thumb:0.75rem]',
  default: 'h-5 w-9 p-px [--thumb:1rem]',
  lg: 'h-6 w-11 p-px [--thumb:1.25rem]',
} as const

/** Range track and thumb, read by the `.slider` rules in index.css. */
export const sliderSize = {
  sm: '[--slider-track:0.25rem] [--slider-thumb:0.875rem] h-3.5',
  default: '[--slider-track:0.375rem] [--slider-thumb:1rem] h-4',
  lg: '[--slider-track:0.5rem] [--slider-thumb:1.25rem] h-5',
} as const

/** Shared by every control that renders a box or track rather than text. */
export const indicatorBase = [
  'inline-flex shrink-0 items-center justify-center',
  'border-border border bg-background',
  interactive,
  focusRing,
  'peer-disabled:pointer-events-none peer-disabled:opacity-50',
].join(' ')

/**
 * Where a horizontal layout stops stacking.
 *
 * Components that lay children out in a row take a `responsive` prop of this
 * type. The default is `'sm'`: a row of controls almost never fits a phone, and
 * a component that only works on a wide screen pushes the media query out to
 * every call site — which is where it gets forgotten.
 *
 * `false` opts out, for a row that is genuinely fine at any width, such as three
 * icon buttons.
 *
 * Each component spells its breakpoint classes out rather than composing them:
 * Tailwind reads source text, so a prefix built by interpolation generates no
 * CSS at all.
 */
export type Responsive = 'sm' | 'md' | 'lg' | false

/**
 * Card section padding: square at every size, so the inset is the same on all
 * four edges. Shared by header, body and footer, so a card's sections line up
 * on one left edge and the dividers sit at consistent distances.
 */
export const cardPadding = {
  sm: 'p-3', // 12px
  default: 'p-4.5', // 18px — the midpoint of sm and lg
  lg: 'p-6', // 24px
} as const

/** Badge: short, dense, and always shorter than a control of the same name. */
export const badgeSize = {
  sm: "h-5 gap-1 px-2 text-[10px] [&_svg:not([class*='size-'])]:size-3",
  default: "h-6 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
  lg: "h-7 gap-1.5 px-3 text-sm [&_svg:not([class*='size-'])]:size-3.5",
} as const

/** Avatar footprint, with the fallback initials scaled to match. */
export const avatarSize = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  default: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-14 text-base',
} as const

/** A floating panel: menus, dropdowns, popovers. */
export const menuSurface = [
  'border-border bg-popover text-popover-foreground border',
  'z-50 overflow-auto p-1',
].join(' ')

/**
 * One row inside a menu panel.
 *
 * `iconChild` is part of the row, not the caller's problem: a lucide icon
 * defaults to 24px, so a menu that passes icons through unsized ends up with
 * rows half again as tall as one that does not — which is exactly how the
 * context menu drifted away from the dropdown it is supposed to match.
 */
export const menuItem = [
  // `text-start` is load-bearing: every menu row is a <button>, and the UA
  // default for one is `text-align: center`. Without it a row whose label sits
  // in a `flex-1` span centres that label in the leftover space, which reads as
  // a wrong gap after the icon rather than as an alignment problem. Three
  // components had each worked around it locally before it was fixed here.
  'flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-start text-sm',
  iconChild,
  'transition-colors duration-150 ease-out motion-reduce:transition-none',
  'outline-none select-none',
  // Three sources for one highlight, because the menus drive it differently:
  //
  //   data-highlighted  Select, Combobox and Command track an index and set it
  //   hover             the button-based menus (Dropdown, Context) have none
  //   focus             Dropdown moves focus programmatically with arrow keys,
  //                     and `outline-none` above would otherwise leave that
  //                     completely invisible
  //
  // Plain `focus:` rather than `focus-visible:`: a programmatic `.focus()` does
  // not reliably match focus-visible, which is exactly how the dropdown moves
  // between rows.
  'data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground',
  'hover:bg-accent hover:text-accent-foreground',
  'focus:bg-accent focus:text-accent-foreground',
  'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
  'disabled:pointer-events-none disabled:opacity-50',
].join(' ')

/** The input inside a `fieldBase` wrapper: invisible, so the wrapper shows. */
/**
 * The visible box a field sits in — border, background, nothing else.
 *
 * Deliberately separate from `fieldBase`, which carries only behaviour (focus,
 * disabled, adornment colours) because the filled and ghost variants paint
 * their own surface instead. It is exported because every control that wants to
 * look like a field needs exactly these three classes, and assuming `fieldBase`
 * already includes them produces a control that works perfectly and is
 * invisible — a mistake that is easy to make and hard to see in a diff.
 */
export const fieldOutline = 'border-border bg-background border'

export const fieldInput = [
  'w-full min-w-0 bg-transparent outline-none',
  'placeholder:text-muted-foreground/70',
  'disabled:cursor-not-allowed',
  // Chrome paints its own background on autofill; keep the wrapper's instead.
  '[&:-webkit-autofill]:[-webkit-text-fill-color:var(--foreground)]',
].join(' ')

/** Quiet, hover-lit affordance — icon buttons, tab triggers, menu items. */
export const ghostControl =
  'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
