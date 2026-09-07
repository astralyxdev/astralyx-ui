'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * The theme, with the DOM as the single source of truth.
 *
 * Nothing here writes the class from an effect. That ordering is the trap: an
 * effect that reads the class and an effect that writes it run in the same
 * commit, the writer goes second with whatever the initial state was, and
 * mounting the hook on a light page turns it dark. So `setDark` writes the
 * class directly and the observer does everything else.
 *
 * Watching rather than owning also covers the case that matters here: the
 * catalogue documents `ThemeToggle` by rendering live ones, and an uncontrolled
 * toggle writes the class itself. Persisting from the observer means that
 * choice is remembered too, whichever toggle made it.
 *
 * The initial value is `true` on both sides of hydration because the document
 * ships with `class="dark"`. A reader on light sees one frame of the wrong icon
 * and no hydration mismatch, which is the better half of that trade.
 */
export function useTheme() {
  const [dark, setDarkState] = useState(true)

  useEffect(() => {
    const root = document.documentElement

    const sync = () => {
      const isDark = root.classList.contains('dark')
      setDarkState(isDark)
      try {
        localStorage.setItem('astralyx-theme', isDark ? 'dark' : 'light')
      } catch {
        // Private mode, or storage is full. The class is still applied.
      }
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const setDark = useCallback((next: boolean) => {
    document.documentElement.classList.toggle('dark', next)
  }, [])

  return { dark, setDark }
}
