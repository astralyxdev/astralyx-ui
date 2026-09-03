import type { ComponentProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * An HTTP status code with its meaning.
 *
 * The number alone is only legible to people who have memorised the table, and
 * the ones that matter most are the ones nobody memorises — 409, 422, 429 are
 * each a different action for the reader. The reason phrase is shown beside the
 * code rather than behind a tooltip.
 *
 * Colour follows the class, not the individual code: every 2xx is the same
 * green, every 5xx the same red. Grading within a class invents a severity
 * ordering that does not exist — a 503 is not "worse" than a 500, it is
 * different.
 *
 * 3xx is treated as informational rather than as success. A redirect is not a
 * completed request, and colouring it green hides a redirect loop.
 */
const PHRASES: Record<number, string> = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
  405: 'Method Not Allowed', 409: 'Conflict', 410: 'Gone', 413: 'Payload Too Large',
  418: "I'm a teapot", 422: 'Unprocessable Content', 429: 'Too Many Requests',
  500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway',
  503: 'Service Unavailable', 504: 'Gateway Timeout',
}

/** Colour by class. Grading inside a class implies an ordering that is not real. */
function toneFor(status: number) {
  if (status >= 500) return 'destructive'
  if (status >= 400) return 'amber'
  if (status >= 300) return 'blue'
  if (status >= 200) return 'green'
  return 'neutral'
}

function HttpStatus({
  status,
  phrase,
  showPhrase = true,
  size = 'sm',
  className,
  ...props
}: Omit<ComponentProps<typeof Badge>, 'color' | 'children'> & {
  status: number
  /** Overrides the built-in reason phrase. */
  phrase?: string
  showPhrase?: boolean
  size?: 'sm' | 'default'
}) {
  const text = phrase ?? PHRASES[status]

  return (
    <Badge
      data-slot="http-status"
      data-status={status}
      color={toneFor(status)}
      size={size}
      className={cn('font-mono tabular-nums', className)}
      {...props}
    >
      {status}
      {showPhrase && text && <span className="font-sans font-normal">{text}</span>}
    </Badge>
  )
}

export { HttpStatus, PHRASES as httpPhrases, toneFor as httpStatusTone }
