import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ApiProp } from '@/registry/types'

/** Props reference, rendered with the kit's own Table. */
function ApiTable({ props }: { props: ApiProp[] }) {
  return (
    <Table className="min-w-140">
      <TableHeader>
        <TableRow>
          <TableHead className="w-44">Prop</TableHead>
          <TableHead className="w-56">Type</TableHead>
          <TableHead className="w-24">Default</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.map((prop) => (
          <TableRow key={prop.name} className="align-top">
            <TableCell className="font-mono text-xs font-medium">
              {prop.name}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">
              {prop.type}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">
              {prop.default ?? '—'}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {/* An em dash, like the Default column. A prop whose name, type
                  and default say everything — `submitLabel: ReactNode = 'Sign
                  in'` — needs no sentence, and inventing one for all of them
                  would be filler that makes the table harder to scan. */}
              {prop.description || <span className="text-muted-foreground/40">—</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { ApiTable }
