import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/**
 * Imperative screen-reader announcements.
 *
 * For things that happen without a visible change a reader would notice: a
 * background save finishing, a filter narrowing a list, a shortcut taking
 * effect. Anything with a visible region of its own should carry `aria-live`
 * there instead — this is the fallback, not the default.
 *
 * Two regions, not one. Politeness cannot be changed on a live region after the
 * fact in any reliable way, so `polite` and `assertive` each get their own and
 * the message goes to the matching one.
 *
 * Repeating an identical message is the classic failure here: setting the same
 * text twice is not a mutation, so nothing is announced the second time. The
 * counter appended below forces a change the observer will see.
 */
type Politeness = 'polite' | 'assertive'

type Announce = (message: string, politeness?: Politeness) => void

const AnnouncerContext = createContext<Announce | null>(null)

function useAnnouncer() {
  const announce = use(AnnouncerContext)
  if (!announce) {
    throw new Error('useAnnouncer must be used inside a <LiveAnnouncer>')
  }
  return announce
}

function LiveAnnouncer({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('')
  const [assertive, setAssertive] = useState('')
  const nonce = useRef(0)

  const announce = useCallback<Announce>((message, politeness = 'polite') => {
    // A zero-width space count, so an identical message still reads as a
    // change to the live region without altering what is spoken.
    nonce.current += 1
    const text = message + '​'.repeat(nonce.current % 2)
    if (politeness === 'assertive') setAssertive(text)
    else setPolite(text)
  }, [])

  const value = useMemo(() => announce, [announce])

  return (
    <AnnouncerContext value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-slot="live-region"
        className="sr-only"
      >
        {polite}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        data-slot="live-region"
        className="sr-only"
      >
        {assertive}
      </div>
    </AnnouncerContext>
  )
}

export { LiveAnnouncer, useAnnouncer }
export type { Politeness }
