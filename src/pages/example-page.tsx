import type { ExampleEntry } from '@/examples'

/**
 * A fullscreen example. No chrome of its own — the example supplies its entire
 * layout, because the point is to see the kit assemble a whole product surface
 * rather than a widget in a documentation frame.
 */
function ExamplePage({ example }: { example: ExampleEntry }) {
  return <div className="h-full">{example.render()}</div>
}

export { ExamplePage }
