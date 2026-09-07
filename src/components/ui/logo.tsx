'use client'

import { useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A brand mark that answers to how much room it has.
 *
 * A rail shows a wordmark when it is open and a square mark when it collapses to
 * 52px, and the usual way to get that is two copies of the artwork with opposing
 * visibility classes on them. That works, and it is the thing everyone rewrites
 * per project — including this repo, where the same trick was inlined in the
 * examples' shell and again in the sidebar's own documentation, once with a
 * cropped `viewBox` to fake the square version.
 *
 * The switch is CSS by default, keyed off the sidebar's `data-state`. That is
 * deliberate: reading the sidebar's context would make every project that runs
 * `add logo` install a sidebar it may not have, and the mark belongs in headers
 * and login screens too. Outside a rail nothing matches the selector, so the
 * full artwork shows and stays shown.
 *
 * `collapsed` overrides it. Pass a boolean when something other than a sidebar
 * decides — a header that shrinks on scroll, a canvas that zooms — and only that
 * one mark renders, which is also the way to avoid fetching both files.
 *
 * The accessible name lives on the container and everything inside it is hidden
 * from assistive technology. Two copies of a logo are one logo, and a reader
 * should not hear the company's name twice for a decision made in CSS.
 */

type LogoSource = string | ReactNode

/** First letters of the first and last word — "Astralyx UI" becomes "AU". */
function initialsFrom(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * One rendition: a URL, whatever node you handed over, or the text that stands
 * in for artwork that is missing or refused to load.
 */
function Mark({
  source,
  text,
  className,
}: {
  source: LogoSource | undefined
  text: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (typeof source === 'string' && source && !failed) {
    return (
      <img
        src={source}
        alt=""
        // A broken URL falls through to the text rather than leaving the
        // browser's torn-page icon where a brand mark should be.
        onError={() => setFailed(true)}
        className={cn('h-full w-auto object-contain', className)}
      />
    )
  }

  if (source != null && typeof source !== 'string') {
    return <span className={cn('flex h-full items-center [&_svg]:h-full [&_svg]:w-auto', className)}>{source}</span>
  }

  return (
    <span className={cn('truncate text-sm font-semibold tracking-tight', className)}>{text}</span>
  )
}

function Logo({
  icon,
  full,
  alt,
  fallbackText = '',
  collapsed,
  className,
  ...props
}: Omit<ComponentProps<'span'>, 'children'> & {
  /** The square mark, for when the rail is collapsed. */
  icon?: LogoSource
  /** The full artwork — mark and wordmark together. */
  full?: LogoSource
  /**
   * The accessible name for whichever rendition is showing. Pass an empty
   * string when the product name is already written beside it, which makes the
   * mark decorative rather than announcing it twice.
   */
  alt: string
  /** Drawn when there is no artwork, or when the image fails. Collapsed, it is
   * reduced to initials — a rail is 52px and a name does not fit. */
  fallbackText?: string
  /** Overrides the sidebar's own state. Renders one mark instead of both. */
  collapsed?: boolean
}) {
  const short = initialsFrom(fallbackText)

  const shell = cn('flex h-6 shrink-0 items-center', className)
  const label = alt ? { role: 'img' as const, 'aria-label': alt } : { 'aria-hidden': true }

  if (collapsed !== undefined) {
    return (
      <span data-slot="logo" data-state={collapsed ? 'collapsed' : 'expanded'} className={shell} {...label} {...props}>
        <Mark
          source={collapsed ? (icon ?? full) : (full ?? icon)}
          text={collapsed ? short : fallbackText}
        />
      </span>
    )
  }

  return (
    <span data-slot="logo" className={shell} {...label} {...props}>
      <Mark
        source={full ?? icon}
        text={fallbackText}
        className="group-data-[state=collapsed]/sidebar:hidden"
      />
      <Mark
        source={icon ?? full}
        text={short}
        className="hidden group-data-[state=collapsed]/sidebar:flex group-data-[state=collapsed]/sidebar:items-center"
      />
    </span>
  )
}

export { Logo }
export type { LogoSource }
