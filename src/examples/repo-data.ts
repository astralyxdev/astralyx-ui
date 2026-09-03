import type { FileNode } from '@/components/ui/file-tree'
import type { Language } from '@/lib/highlighter'

/** File contents for the repository example, keyed by tree path. */
export type RepoFile = {
  language: Language
  size: string
  lines: number
  commit: string
  when: string
  content: string
}

export const REPO_TREE: FileNode[] = [
  {
    name: 'src',
    defaultOpen: true,
    children: [
      {
        name: 'components',
        defaultOpen: true,
        children: [
          {
            name: 'ui',
            defaultOpen: true,
            children: [
              { name: 'button.tsx', meta: '4h ago' },
              { name: 'input.tsx', meta: '2d ago' },
              { name: 'card.tsx', meta: '1d ago' },
            ],
          },
          {
            name: 'primitives',
            children: [
              { name: 'slot.tsx', meta: '1w ago' },
              { name: 'popper.tsx', meta: '3d ago' },
            ],
          },
        ],
      },
      {
        name: 'lib',
        children: [
          { name: 'styles.ts', meta: '4h ago' },
          { name: 'utils.ts', meta: '3w ago' },
        ],
      },
      { name: 'index.css', meta: '4h ago' },
    ],
  },
  { name: 'components.json', meta: '2w ago' },
  { name: 'package.json', meta: '1w ago' },
  { name: 'README.md', meta: '4h ago' },
]

export const REPO_FILES: Record<string, RepoFile> = {
  'src/components/ui/button.tsx': {
    language: 'tsx',
    size: '2.1 KB',
    lines: 78,
    commit: 'Drop Radix, add own Slot primitive',
    when: '4h ago',
    content: `import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@/components/primitives/slot'
import { colorSet, controlBase, controlSize } from '@/lib/styles'
import { cn } from '@/lib/utils'

const buttonVariants = cva(controlBase, {
  variants: {
    variant: {
      default: 'bg-[var(--ui)] text-[var(--ui-fg)] hover:bg-[var(--ui-hover)]',
      secondary: 'bg-[var(--ui-soft)] text-[var(--ui-soft-fg)]',
      outline: 'border border-[var(--ui-soft-fg)] bg-transparent',
      ghost: 'text-[var(--ui-soft-fg)] hover:bg-[var(--ui-soft)]',
      link: 'text-[var(--ui-soft-fg)] underline-offset-4 hover:underline',
    },
    color: colorSet,
    size: {
      xs: controlSize.xs,
      sm: controlSize.sm,
      default: controlSize.md,
      lg: controlSize.lg,
    },
  },
  defaultVariants: { variant: 'default', color: 'neutral', size: 'default' },
})

export function Button({ className, variant, color, size, asChild, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, color, size, className }))}
      {...props}
    />
  )
}`,
  },
  'src/components/ui/input.tsx': {
    language: 'tsx',
    size: '3.4 KB',
    lines: 142,
    commit: 'Field padding derives from control height',
    when: '2d ago',
    content: `import { useRef, useState } from 'react'
import { Field } from '@/components/primitives/field'
import { fieldBase, fieldInput, fieldSize } from '@/lib/styles'

/**
 * The styled box is a wrapper, not the <input>: that is what lets an icon sit
 * inside the field and keeps the focus treatment around the whole control.
 */
export function Input({ icon, iconPosition = 'start', clearable, ...props }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState(false)

  return (
    <Field.Root className={fieldBase}>
      {iconPosition === 'start' && icon}
      <Field.Control ref={inputRef} className={fieldInput} {...props} />
      {iconPosition === 'end' && icon}
    </Field.Root>
  )
}`,
  },
  'src/components/ui/card.tsx': {
    language: 'tsx',
    size: '2.8 KB',
    lines: 118,
    commit: 'Tint the card header',
    when: '1d ago',
    content: `import { createContext, use } from 'react'
import { cardPadding, radius, surface } from '@/lib/styles'

/**
 * Header and footer draw their own dividers, so a Card holding only a CardBody
 * is just a padded box with no stray rules.
 */
const CardContext = createContext<CardSize>('default')

export function Card({ size = 'default', ...props }) {
  return (
    <CardContext value={size}>
      <div data-slot="card" className={cn(surface, radius.panel)} {...props} />
    </CardContext>
  )
}`,
  },
  'src/components/primitives/slot.tsx': {
    language: 'tsx',
    size: '1.9 KB',
    lines: 84,
    commit: 'Drop Radix, add own Slot primitive',
    when: '1w ago',
    content: `import { Children, cloneElement, isValidElement } from 'react'
import { cn } from '@/lib/utils'

/**
 * Merge a parent's props onto a child element's own props.
 *
 * Handlers chain child-then-parent, className merges through cn, style
 * shallow-merges, and a parent never overwrites a child value with undefined.
 */
function mergeProps(parent, child) {
  const merged = { ...child }
  for (const key in parent) {
    if (/^on[A-Z]/.test(key)) {
      merged[key] = (...args) => { child[key]?.(...args); parent[key]?.(...args) }
    } else if (key === 'className') {
      merged[key] = cn(parent[key], child[key])
    } else if (parent[key] !== undefined) {
      merged[key] = parent[key]
    }
  }
  return merged
}

export function Slot({ children, ...props }) {
  const child = Children.only(children)
  if (!isValidElement(child)) return null
  return cloneElement(child, mergeProps(props, child.props))
}`,
  },
  'src/components/primitives/popper.tsx': {
    language: 'tsx',
    size: '4.2 KB',
    lines: 176,
    commit: 'Move Select onto the shared popper',
    when: '3d ago',
    content: `/**
 * position: fixed is deliberate — it takes the layer out of every ancestor's
 * overflow, so a menu inside a scrolling panel is not clipped by it. The cost
 * is recomputing on scroll and resize, which is what the listeners below do.
 */
export function usePopper({ open, anchorRef, floatingRef, side, align }) {
  const [state, setState] = useState({ style: { visibility: 'hidden' }, side })

  const update = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect()
    if (!anchor) return
    // flip to the opposite side when the preferred one does not fit,
    // then clamp along the cross axis so the layer stays on screen
  }, [anchorRef, floatingRef, side, align])

  return state
}`,
  },
  'src/lib/styles.ts': {
    language: 'typescript',
    size: '9.6 KB',
    lines: 340,
    commit: 'Give menu rows hover and focus states',
    when: '4h ago',
    content: `/**
 * The kit's global style contract.
 *
 * Every component composes these fragments instead of spelling out its own
 * focus ring, radius or control height.
 */
export const focusRing =
  'outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

export const controlSize = {
  xs: 'h-7 gap-1.5 px-3.5 text-xs rounded-full [corner-shape:round]',
  sm: 'h-8 gap-1.5 px-3.5 text-sm rounded-[var(--radius-control-sm)]',
  md: 'h-9 gap-2 px-4.5 text-sm rounded-[var(--radius-control-md)]',
  lg: 'h-10 gap-2 px-6 text-sm rounded-[var(--radius-control-lg)]',
} as const

export const colorSet = {
  neutral: '[--ui:var(--primary)] [--ui-fg:var(--primary-foreground)]',
  blue: '[--ui:var(--blue)] [--ui-fg:var(--blue-foreground)]',
} as const`,
  },
  'src/lib/utils.ts': {
    language: 'typescript',
    size: '0.3 KB',
    lines: 12,
    commit: 'Initial commit',
    when: '3w ago',
    content: `import { cn as merge, type ClassValue } from 'cn'

/**
 * Merge class names, resolving conflicting Tailwind utilities in favour of the
 * last one passed. Use it in every component that accepts a className prop.
 */
export function cn(...inputs: ClassValue[]) {
  return merge(...inputs)
}`,
  },
  'src/index.css': {
    language: 'css',
    size: '14.2 KB',
    lines: 620,
    commit: 'rounded-full means a real circle',
    when: '4h ago',
    content: `@import 'tailwindcss';

:root {
  --radius: 1.25rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
}

@layer base {
  @supports (corner-shape: squircle) {
    *, *::before, *::after { corner-shape: squircle; }

    /* Fully rounded means a real circle, never a squircle: a superellipse at
       50% is a rounded rectangle, so a spinner would render as a cube. */
    .rounded-full { corner-shape: round; }
  }
}`,
  },
  'components.json': {
    language: 'json',
    size: '0.4 KB',
    lines: 18,
    commit: 'Point aliases at src',
    when: '2w ago',
    content: `{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "css": "src/index.css", "baseColor": "neutral" },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}`,
  },
  'package.json': {
    language: 'json',
    size: '1.1 KB',
    lines: 42,
    commit: 'Add react-hook-form and zod',
    when: '1w ago',
    content: `{
  "name": "astralyx-ui-kit",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.9.1",
    "class-variance-authority": "^0.7.1",
    "cn": "^0.2.4",
    "lucide-react": "^1.39.0",
    "react": "^19.2.8",
    "react-hook-form": "^7.87.0",
    "shiki": "^4.4.3",
    "zod": "^4.5.4"
  }
}`,
  },
  'README.md': {
    language: 'html',
    size: '3.8 KB',
    lines: 96,
    commit: 'Document the style contract',
    when: '4h ago',
    content: `# Astralyx UI

A component kit built on its own primitives.

## Principles

- No headless-UI dependency. Every primitive is in this repo.
- One global style contract in \`src/lib/styles.ts\`.
- Interaction feedback is colour only: nothing moves, resizes or
  gains elevation on hover.
- iOS-style continuous corners, with a circular fallback.

## Install

    npm install

## Structure

    src/components/primitives   behaviour, no styling
    src/components/ui           the components themselves
    src/lib/styles.ts           the style contract`,
  },
}
