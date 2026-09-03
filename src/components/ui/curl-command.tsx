import { useMemo, type ComponentProps } from 'react'
import { CodeBlock } from '@/components/ui/code-block'

/**
 * A request rendered as a runnable curl command.
 *
 * Every value is shell-quoted with single quotes and an escape for embedded
 * ones. A JSON body pasted straight into a command line is the classic way to
 * produce a command that looks right and silently truncates at the first
 * apostrophe in someone's surname.
 *
 * Headers matching `redact` are masked. The whole point of this component is
 * that the output gets pasted into a terminal, a ticket, or a chat — and an
 * Authorization header pasted into a ticket is a leaked credential.
 *
 * Long commands are broken across lines with a trailing backslash, which is
 * what makes the difference between something a reader can check and a
 * 400-character single line.
 */
export type CurlHeader = { name: string; value: string }

/** POSIX single-quoting: end the quote, escape the quote, reopen. */
function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function CurlCommand({
  method = 'GET',
  url,
  headers = [],
  body,
  redact = [/^authorization$/i, /^cookie$/i, /api[-_]?key/i, /^x-.*-token$/i],
  mask = '••••••••',
  insecure = false,
  title = 'curl',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  method?: string
  url: string
  headers?: CurlHeader[]
  /** Sent with `--data`. An object is JSON-encoded. */
  body?: string | object
  /** Header names whose values are masked. */
  redact?: RegExp[]
  mask?: string
  /** Adds `-k`. Worth showing when it is genuinely in play. */
  insecure?: boolean
  title?: string
}) {
  const command = useMemo(() => {
    const parts = [`curl -X ${method.toUpperCase()}`]
    if (insecure) parts.push('-k')
    parts.push(shellQuote(url))

    for (const header of headers) {
      // Masked before quoting, so the mask itself is quoted safely.
      const secret = redact.some((pattern) => pattern.test(header.name))
      parts.push(`-H ${shellQuote(`${header.name}: ${secret ? mask : header.value}`)}`)
    }

    if (body !== undefined) {
      const text = typeof body === 'string' ? body : JSON.stringify(body, null, 2)
      parts.push(`--data ${shellQuote(text)}`)
    }

    // Backslash continuations: a 400-character line cannot be reviewed.
    return parts.join(' \\\n  ')
  }, [method, url, headers, body, redact, mask, insecure])

  return (
    <div data-slot="curl-command" className={className} {...props}>
      <CodeBlock code={command} language="bash" title={title} />
    </div>
  )
}

export { CurlCommand, shellQuote }
