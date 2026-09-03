import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Play, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { CodeBlock } from '@/components/ui/code-block'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A SQL editor with a run action and a guard on destructive statements.
 *
 * An UPDATE or DELETE without a WHERE clause requires confirmation. This is the
 * single most expensive mistake anyone makes in a query console, it is trivial
 * to detect, and detecting it is worth far more than syntax highlighting.
 *
 * Cmd/Ctrl+Enter runs. Anyone who has used a query console expects it, and
 * making them reach for a button breaks the loop that makes a console useful.
 *
 * The editor is a `CodeBlock` in editable mode rather than a bare textarea, so
 * the SQL is syntax-highlighted as it is typed. A console where every statement
 * is one undifferentiated grey block is a console people paste out of into a
 * real editor.
 *
 * Statement count is shown when the buffer holds more than one. "Run" on a
 * multi-statement buffer does something quite different from what a single
 * statement does, and the difference should not be a surprise.
 */
const DESTRUCTIVE = /^\s*(update|delete)\b/i
const HAS_WHERE = /\bwhere\b/i
const SCHEMA_CHANGE = /^\s*(drop|truncate|alter)\b/i

/** Statement split on semicolons outside quotes — good enough to count. */
function statements(sql: string) {
  return sql
    .replace(/'([^'\\]|\\.)*'/g, "''")
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_STATEMENTS_LABEL: (count: number) => ReactNode = (count) => `${count} statements`

function QueryEditor({
  value: valueProp,
  onValueChange,
  onRun,
  running = false,
  dialect = 'SQL',
  rows = 8,
  lineNumbers = true,
  runLabel = 'Run',
  confirmLabel = 'Run anyway',
  cancelLabel = 'Cancel',
  editorLabel = 'SQL query',
  unguardedNote = 'This statement has no WHERE clause — it will affect every row in the table.',
  schemaChangeNote = 'This changes the schema and cannot be rolled back on every engine.',
  statementsLabel = DEFAULT_STATEMENTS_LABEL,
  shortcutKeys = '⌘+↵',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange' | 'children'> & {
  value?: string
  onValueChange?: (value: string) => void
  onRun?: (sql: string) => void
  running?: boolean
  dialect?: ReactNode
  /** Minimum visible lines. The editor grows past this with the query. */
  rows?: number
  lineNumbers?: boolean
  runLabel?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  editorLabel?: string
  unguardedNote?: ReactNode
  schemaChangeNote?: ReactNode
  statementsLabel?: (count: number) => ReactNode
  /** Run chord, as a `+`-separated string for `Kbd`. Pass `null` to hide it. */
  shortcutKeys?: string | null
}) {
  const [own, setOwn] = useState(valueProp ?? '')
  const [confirming, setConfirming] = useState(false)
  const sql = valueProp ?? own

  const parsed = useMemo(() => statements(sql), [sql])

  // The mistake worth catching: a mass update with no predicate.
  const unguarded = parsed.some((s) => DESTRUCTIVE.test(s) && !HAS_WHERE.test(s))
  const schemaChange = parsed.some((s) => SCHEMA_CHANGE.test(s))
  const risky = unguarded || schemaChange

  const set = (next: string) => {
    if (valueProp === undefined) setOwn(next)
    onValueChange?.(next)
  }

  const run = () => {
    if (risky && !confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    onRun?.(sql)
  }

  return (
    <div
      data-slot="query-editor"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <span className="text-muted-foreground text-xs font-medium">{dialect}</span>
        {parsed.length > 1 && (
          <Badge size="sm" color="amber">
            {statementsLabel(parsed.length)}
          </Badge>
        )}
        {shortcutKeys && <Kbd keys={shortcutKeys} className="ms-auto" />}
      </div>

      {/* The chord is caught on the wrapper: keydown bubbles out of the
          editable overlay, so the shortcut works without CodeBlock having to
          know anything about running a query. */}
      <div
        role="presentation"
        className={cn(
          'min-w-0',
          '[&_[data-slot=code-block]]:rounded-none [&_[data-slot=code-block]]:border-x-0 [&_[data-slot=code-block]]:border-t-0',
        )}
        onKeyDown={(event) => {
          // The loop a console lives or dies by.
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            run()
          }
        }}
      >
        <CodeBlock
          code={sql}
          language="sql"
          editable
          header={false}
          copyable={false}
          resettable={false}
          lineNumbers={lineNumbers}
          minLines={rows}
          aria-label={editorLabel}
          onCodeChange={set}
        />
      </div>

      {risky && (
        <p className="border-border flex items-start gap-1.5 border-t p-3 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {unguarded ? unguardedNote : schemaChangeNote}
        </p>
      )}

      {onRun && (
        <div className="border-border flex flex-wrap items-center gap-2 border-t p-3">
          {confirming ? (
            <>
              <Button size="sm" variant="colored" color="destructive" onClick={run}>
                {confirmLabel}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                {cancelLabel}
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={running || !sql.trim()} onClick={run}>
              <Play />
              {runLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export { QueryEditor, statements as splitStatements }
