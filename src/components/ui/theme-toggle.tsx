import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'

/**
 * Switches the document between light and dark.
 *
 * The class goes on `document.documentElement`, not on a wrapper. `.dark`
 * defines the token values on the element it lands on and everything below
 * inherits them, so a wrapper deeper in the tree cannot switch a subtree back —
 * a descendant has no way to undo variables set above it.
 *
 * Uncontrolled by default: it reads the class already on the element, so it
 * agrees with whatever the page shipped with instead of flashing to its own
 * idea of the default on mount. Pass `dark`/`onDarkChange` when the app owns
 * the state.
 */
function ThemeToggle({
  dark: darkProp,
  onDarkChange,
  variant = 'secondary',
  size = 'icon-sm',
  className,
  ...props
}: Omit<ButtonProps, 'children' | 'onChange'> & {
  dark?: boolean
  onDarkChange?: (dark: boolean) => void
}) {
  const controlled = darkProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(false)

  // Read the live class on mount rather than assuming a default.
  useEffect(() => {
    if (controlled) return
    setUncontrolled(document.documentElement.classList.contains('dark'))
  }, [controlled])

  const dark = controlled ? darkProp : uncontrolled

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={dark}
      className={className}
      onClick={() => {
        const next = !dark
        if (!controlled) setUncontrolled(next)
        onDarkChange?.(next)
      }}
      {...props}
    >
      {dark ? <Moon /> : <Sun />}
    </Button>
  )
}

export { ThemeToggle }
