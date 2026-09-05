import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ApiComponent, ApiDocs, ApiPropRow, ApiSignature, ApiType } from '@/registry/props'
import type { ApiProp } from '@/registry/types'

/**
 * The API reference of one component file, one table per kind of export.
 *
 * Props belong to a component, so each exported component gets its own
 * table under its own name — `DialogContent` has a `size`, `Dialog` does not,
 * and one merged list could not say which. Hooks, functions and types follow,
 * then behaviour notes, which describe the component rather than a prop.
 */
function ApiReference({ api }: { api: ApiDocs }) {
  return (
    <div className="space-y-10">
      {api.components.map((component) => (
        <ComponentGroup key={component.name} component={component} />
      ))}
      {api.hooks.length > 0 && (
        <Group title="Hooks">
          <SignatureTable rows={api.hooks} heading="Hook" />
        </Group>
      )}
      {api.functions.length > 0 && (
        <Group title="Functions">
          <SignatureTable rows={api.functions} heading="Function" />
        </Group>
      )}
      {api.types.length > 0 && <Types types={api.types} />}
      {api.notes.length > 0 && (
        <Group title="Behaviour">
          <NotesTable rows={api.notes} />
        </Group>
      )}
    </div>
  )
}

function Group({
  id,
  title,
  description,
  note,
  children,
}: {
  id?: string
  title: ReactNode
  description?: string
  note?: ReactNode
  children?: ReactNode
}) {
  return (
    <div id={id} className="scroll-mt-8">
      <div className="mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {description && (
          <p className="text-muted-foreground mt-0.5 max-w-2xl text-xs">
            <Prose text={description} />
          </p>
        )}
        {note && <p className="text-muted-foreground mt-1 text-xs">{note}</p>}
      </div>
      {children}
    </div>
  )
}

function ComponentGroup({ component }: { component: ApiComponent }) {
  const bases = component.extends ?? []
  const note = bases.length ? (
    <>
      Extends{' '}
      {bases.map((base, index) => (
        <span key={base}>
          {index > 0 && ', '}
          <code className="font-mono">{base}</code>
        </span>
      ))}
      .
    </>
  ) : component.props.length === 0 ? (
    'Takes no props.'
  ) : undefined

  return (
    <Group
      // Case-preserving, and namespaced by kind. `Fmt` and `FMT` are both
      // exported from one file, so a lowercased anchor collided.
      id={`api-${component.name}`}
      title={
        <code className="font-mono">
          {component.name}
          {component.generics && (
            <span className="text-muted-foreground font-normal">{component.generics}</span>
          )}
        </code>
      }
      description={component.description}
      note={note}
    >
      {component.props.length > 0 && <PropsTable props={component.props} />}
    </Group>
  )
}

const Missing = () => <span className="text-muted-foreground/40">—</span>

/**
 * Description text with `backticked` spans set in code. JSDoc and curated
 * prose both use the markdown convention, and a raw backtick in a table cell
 * reads as a typo.
 */
function Prose({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/)
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code key={index} className="text-foreground/80 font-mono">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}

/** Props reference, rendered with the kit's own Table. */
function PropsTable({ props }: { props: ApiPropRow[] }) {
  return (
    <Table className="min-w-140">
      <TableHeader>
        <TableRow>
          <TableHead className="w-44">Prop</TableHead>
          <TableHead className="w-56">Type</TableHead>
          <TableHead className="w-28">Default</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.map((prop) => (
          <TableRow key={prop.name} className="align-top">
            <TableCell className="font-mono text-xs font-medium">{prop.name}</TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">{prop.type}</TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">
              {prop.default ?? (prop.required ? <span className="font-sans italic">required</span> : <Missing />)}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {/* An em dash, like the Default column. A prop whose name, type
                  and default say everything — `submitLabel: ReactNode = 'Sign
                  in'` — needs no sentence, and inventing one for all of them
                  would be filler that makes the table harder to scan. */}
              {prop.description ? <Prose text={prop.description} /> : <Missing />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SignatureTable({ rows, heading }: { rows: ApiSignature[]; heading: string }) {
  return (
    <Table className="min-w-140">
      <TableHeader>
        <TableRow>
          <TableHead className="w-44">{heading}</TableHead>
          <TableHead className="w-80">Signature</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name} className="align-top">
            <TableCell className="font-mono text-xs font-medium">{row.name}</TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs break-words whitespace-normal">
              {row.signature}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {row.description ? <Prose text={row.description} /> : <Missing />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * Exported types. A data shape — `SelectOption`, `GanttTask` — reads as a
 * table of fields, like a component's props; a union or a function type has
 * no fields and shows its definition verbatim.
 */
function Types({ types }: { types: ApiType[] }) {
  const shapes = types.filter((type) => type.fields)
  const aliases = types.filter((type) => !type.fields)
  return (
    <Group title="Types">
      <div className="space-y-8">
        {shapes.map((type) => (
          <div key={type.name} id={`api-type-${type.name}`} className="scroll-mt-8">
            <div className="mb-3">
              <h4 className="text-sm font-medium">
                <TypeName type={type} />
              </h4>
              {type.description && (
                <p className="text-muted-foreground mt-0.5 max-w-2xl text-xs">
                  <Prose text={type.description} />
                </p>
              )}
            </div>
            <FieldsTable fields={type.fields ?? []} />
          </div>
        ))}
        {aliases.length > 0 && <AliasTable types={aliases} />}
      </div>
    </Group>
  )
}

function TypeName({ type }: { type: ApiType }) {
  return (
    <code className="font-mono">
      {type.name}
      {type.generics && <span className="text-muted-foreground font-normal">{type.generics}</span>}
      {type.aliases?.map((alias) => (
        <span key={alias} className="text-muted-foreground font-normal">
          {' '}
          = {alias}
        </span>
      ))}
    </code>
  )
}

function FieldsTable({ fields }: { fields: ApiPropRow[] }) {
  return (
    <Table className="min-w-140">
      <TableHeader>
        <TableRow>
          <TableHead className="w-44">Field</TableHead>
          <TableHead className="w-56">Type</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fields.map((field) => (
          <TableRow key={field.name} className="align-top">
            <TableCell className="font-mono text-xs font-medium">
              {field.name}
              {/* The TypeScript spelling of optional, so the table reads like
                  the declaration it came from. */}
              {!field.required && <span className="text-muted-foreground font-normal">?</span>}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">{field.type}</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {field.description ? <Prose text={field.description} /> : <Missing />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function AliasTable({ types }: { types: ApiType[] }) {
  return (
    <Table className="min-w-140">
      <TableHeader>
        <TableRow>
          <TableHead className="w-44">Type</TableHead>
          <TableHead className="w-80">Definition</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {types.map((type) => (
          <TableRow key={type.name} className="align-top">
            <TableCell className="text-xs font-medium">
              <TypeName type={type} />
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">
              {/* Definitions keep their line breaks: an object type is read
                  one member per line, not as a paragraph. */}
              <pre className="font-mono whitespace-pre">{type.definition}</pre>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {type.description ? <Prose text={type.description} /> : <Missing />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Curated rows that describe how the component behaves, not a named export. */
function NotesTable({ rows }: { rows: ApiProp[] }) {
  return (
    <Table className="min-w-140">
      <TableHeader>
        <TableRow>
          <TableHead className="w-44">Topic</TableHead>
          <TableHead className="w-56">Detail</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name} className="align-top">
            <TableCell className="text-xs font-medium">{row.name}</TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">
              {row.type && row.type !== '—' ? row.type : <Missing />}
              {row.default && <span className="block">= {row.default}</span>}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {row.description ? <Prose text={row.description} /> : <Missing />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { ApiReference }
