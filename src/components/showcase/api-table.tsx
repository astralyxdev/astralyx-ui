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
              {prop.description}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { ApiTable }
