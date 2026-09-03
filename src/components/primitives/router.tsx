import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react'

type NavigateOptions = { replace?: boolean }

type RouterValue = {
  path: string
  navigate: (to: string, options?: NavigateOptions) => void
}

const RouterContext = createContext<RouterValue | null>(null)

/**
 * A minimal History API router — enough for a static, data-less site.
 *
 * Deliberately hand-rolled to keep the kit dependency-free. The surface
 * (`Link`, `useRoute`, `useLocation`, `navigate`) mirrors React Router's, so
 * swapping in the real thing later is an import change.
 */
function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string, options: NavigateOptions = {}) => {
    if (to === window.location.pathname) return

    window.history[options.replace ? 'replaceState' : 'pushState']({}, '', to)
    setPath(to)
  }, [])

  const value = useMemo(() => ({ path, navigate }), [path, navigate])

  return <RouterContext value={value}>{children}</RouterContext>
}

function useRouter() {
  const value = use(RouterContext)

  if (!value) throw new Error('useRouter must be used inside <Router>')

  return value
}

function useLocation() {
  return useRouter().path
}

function useNavigate() {
  return useRouter().navigate
}

/**
 * Match the current path against a pattern with `:param` segments.
 * Returns the params on a match, or `null`.
 */
function matchRoute(pattern: string, path: string) {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = path.split('/').filter(Boolean)

  if (patternParts.length !== pathParts.length) return null

  const params: Record<string, string> = {}

  for (const [index, part] of patternParts.entries()) {
    const value = pathParts[index]

    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(value)
      continue
    }

    if (part !== value) return null
  }

  return params
}

function useRoute(pattern: string) {
  const path = useLocation()

  return useMemo(() => matchRoute(pattern, path), [pattern, path])
}

type LinkProps = ComponentProps<'a'> & {
  to: string
  replace?: boolean
}

/** An `<a>` that navigates in-app, while staying a real, openable link. */
function Link({ to, replace, onClick, target, ...props }: LinkProps) {
  const navigate = useNavigate()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)

    // Leave modified clicks and non-self targets to the browser.
    if (event.defaultPrevented) return
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (target && target !== '_self') return

    event.preventDefault()
    navigate(to, { replace })
  }

  return <a href={to} target={target} onClick={handleClick} {...props} />
}

export { Link, Router, matchRoute, useLocation, useNavigate, useRoute }
export type { LinkProps }
