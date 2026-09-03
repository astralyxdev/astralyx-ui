import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copy to the clipboard, with the "copied" state that always comes with it.
 *
 * Written four separate times in this kit before it was extracted — CodeBlock,
 * Terminal, EnvVars and Message each had their own timer and their own reset.
 *
 * Three things it gets right that an inline version usually does not: the
 * timeout is cleared on unmount, so copying and navigating away does not set
 * state on a gone component; a second copy restarts the timer instead of
 * stacking two; and a rejected write (no permission, insecure origin) reports
 * `error` rather than silently claiming success.
 */
type ClipboardState = 'idle' | 'copied' | 'error'

function useClipboard({ timeout = 1600 } = {}) {
  const [state, setState] = useState<ClipboardState>('idle')
  const timer = useRef(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string) => {
      clearTimeout(timer.current)

      try {
        // `navigator.clipboard` is undefined on an insecure origin, which is a
        // rejection rather than a crash from the caller's point of view.
        if (!navigator.clipboard) throw new Error('Clipboard unavailable')
        await navigator.clipboard.writeText(text)
        setState('copied')
      } catch {
        setState('error')
      }

      timer.current = window.setTimeout(() => setState('idle'), timeout)
    },
    [timeout],
  )

  return { copy, state, copied: state === 'copied' }
}

export { useClipboard }
export type { ClipboardState }
