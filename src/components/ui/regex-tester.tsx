import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A regular expression against a test string, with matches highlighted.
 *
 * The pattern is compiled in a try/catch and the error is shown as you type. An
 * unfinished pattern is the normal state while typing, so a syntax error is a
 * hint, not a failure — the previous good match set is not thrown away.
 *
 * Zero-length matches are guarded. `/a*\/g` matches empty at every position and
 * a naive `exec` loop over it never terminates; the index is advanced manually
 * when a match consumes nothing. This is the bug in most hand-rolled regex
 * testers.
 *
 * Named and numbered capture groups are listed per match. A pattern that
 * matches but captures the wrong thing is the failure people actually hit, and
 * a highlight alone cannot show it.
 */
export type RegexMatch = {
  index: number
  text: string
  groups: { name: string; value: string | undefined }[]
}

const FLAG_SET = ['g', 'i', 'm', 's', 'u', 'y'] as const

function RegexTester({
  pattern: patternProp,
  onPatternChange,
  flags: flagsProp,
  onFlagsChange,
  input: inputProp,
  onInputChange,
  patternLabel = 'Pattern',
  flagsLabel = 'Flags',
  inputLabel = 'Test string',
  matchesLabel = 'Matches',
  noMatchLabel = 'No matches',
  groupsLabel = 'Groups',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange' | 'children'> & {
  pattern?: string
  onPatternChange?: (pattern: string) => void
  flags?: string
  onFlagsChange?: (flags: string) => void
  input?: string
  onInputChange?: (input: string) => void
  patternLabel?: ReactNode
  flagsLabel?: ReactNode
  inputLabel?: ReactNode
  matchesLabel?: ReactNode
  noMatchLabel?: ReactNode
  groupsLabel?: ReactNode
}) {
  const [ownPattern, setOwnPattern] = useState(patternProp ?? '')
  const [ownFlags, setOwnFlags] = useState(flagsProp ?? 'g')
  const [ownInput, setOwnInput] = useState(inputProp ?? '')

  const pattern = patternProp ?? ownPattern
  const flags = flagsProp ?? ownFlags
  const input = inputProp ?? ownInput

  const { matches, error } = useMemo(() => {
    if (!pattern) return { matches: [] as RegexMatch[], error: undefined }
    let regex: RegExp
    try {
      regex = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`)
    } catch (exception) {
      return { matches: [] as RegexMatch[], error: (exception as Error).message }
    }

    const found: RegexMatch[] = []
    let hit: RegExpExecArray | null
    let guard = 0
    while ((hit = regex.exec(input)) && guard++ < 5000) {
      found.push({
        index: hit.index,
        text: hit[0],
        groups: [
          ...hit.slice(1).map((value, i) => ({ name: String(i + 1), value })),
          ...Object.entries(hit.groups ?? {}).map(([name, value]) => ({ name, value })),
        ],
      })
      // A zero-length match leaves lastIndex where it was; without this the
      // loop never terminates.
      if (hit[0] === '') regex.lastIndex++
    }
    return { matches: found, error: undefined }
  }, [pattern, flags, input])

  /** Splits the input into plain and matched runs for highlighting. */
  const segments = useMemo(() => {
    const out: { text: string; hit: boolean }[] = []
    let cursor = 0
    for (const match of matches) {
      if (match.index > cursor) out.push({ text: input.slice(cursor, match.index), hit: false })
      out.push({ text: match.text, hit: true })
      cursor = match.index + match.text.length
    }
    if (cursor < input.length) out.push({ text: input.slice(cursor), hit: false })
    return out
  }, [matches, input])

  const setPattern = (next: string) => {
    if (patternProp === undefined) setOwnPattern(next)
    onPatternChange?.(next)
  }
  const setFlags = (next: string) => {
    if (flagsProp === undefined) setOwnFlags(next)
    onFlagsChange?.(next)
  }
  const setInput = (next: string) => {
    if (inputProp === undefined) setOwnInput(next)
    onInputChange?.(next)
  }

  return (
    <div
      data-slot="regex-tester"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="regex-pattern">{patternLabel}</Label>
          <Input
            id="regex-pattern"
            value={pattern}
            error={Boolean(error)}
            placeholder="(\w+)@(\w+)\.com"
            className="font-mono text-xs"
            onChange={(event) => setPattern(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="regex-flags">{flagsLabel}</Label>
          <Input
            id="regex-flags"
            value={flags}
            placeholder="gi"
            containerClassName="w-24"
            className="font-mono text-xs"
            onChange={(event) =>
              setFlags([...new Set(event.target.value.split(''))]
                .filter((f) => (FLAG_SET as readonly string[]).includes(f))
                .join(''))
            }
          />
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="regex-input">{inputLabel}</Label>
        <Textarea
          id="regex-input"
          rows={4}
          value={input}
          className="font-mono text-xs"
          onChange={(event) => setInput(event.target.value)}
        />
      </div>

      <div className={cn('bg-secondary/60 p-3 font-mono text-xs whitespace-pre-wrap', radius.control)}>
        {segments.length === 0 ? (
          <span className="text-muted-foreground/60">{noMatchLabel}</span>
        ) : (
          segments.map((segment, index) =>
            segment.hit ? (
              <mark
                key={index}
                className="bg-[color-mix(in_oklab,var(--amber)_35%,transparent)] text-foreground"
              >
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
          {matchesLabel}
          <Badge size="sm">{matches.length}</Badge>
        </span>

        {matches.length > 0 && (
          <ul className="flex list-none flex-col gap-1.5">
            {matches.slice(0, 20).map((match, index) => (
              <li key={index} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground/60 w-8 shrink-0 text-end tabular-nums">
                  {match.index}
                </span>
                <code className="font-mono">{match.text || '∅'}</code>
                {/* A pattern that matches but captures the wrong thing is the
                    failure people actually hit; a highlight cannot show it. */}
                {match.groups.length > 0 && (
                  <span className="text-muted-foreground flex flex-wrap gap-x-2">
                    <span className="opacity-70">{groupsLabel}:</span>
                    {match.groups.map((group) => (
                      <span key={group.name} className="font-mono">
                        {group.name}={group.value === undefined ? '—' : `"${group.value}"`}
                      </span>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export { RegexTester }
