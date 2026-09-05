import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import type { ComponentEntry, ComposerState } from './types'

const LANGUAGES = [
  'tsx',
  'jsx',
  'typescript',
  'javascript',
  'css',
  'html',
  'json',
  'bash',
] as const

function composeCodeBlock(state: ComposerState) {
  const attrs = [`language="${state.language}"`]

  if (state.filePath) attrs.push(`filePath="${state.filePath}"`)
  else if (state.title) attrs.push(`title="${state.title}"`)
  if (!state.copyable) attrs.push('copyable={false}')
  if (state.editable) attrs.push('editable')
  if (state.lineNumbers) attrs.push('lineNumbers')
  if (state.wrap) attrs.push('wrap')
  if (state.collapse) attrs.push('maxLines={4}')

  return `<CodeBlock\n  ${attrs.join('\n  ')}\n  code={source}\n/>`
}

const SAMPLE = `import { cn } from '@/lib/utils'

export function Stack({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}`

export const codeBlockEntry: ComponentEntry = {
  id: 'code-block',
  label: 'Code Block',
  description:
    'Syntax-highlighted source with an optional title or file path, copy, inline editing, line numbers and collapsing.',
  usage: `import { CodeBlock } from '@/components/ui/code-block'

<CodeBlock
  filePath="src/components/ui/button.tsx"
  language="tsx"
  lineNumbers
  code={source}
/>`,
  composer: {
    tall: true,
    controls: [
      {
        type: 'select',
        prop: 'language',
        label: 'language',
        options: LANGUAGES,
        default: 'tsx',
      },
      { type: 'text', prop: 'title', label: 'title', default: '' },
      {
        type: 'text',
        prop: 'filePath',
        label: 'filePath',
        default: 'src/components/ui/stack.tsx',
        placeholder: 'src/…',
      },
      { type: 'boolean', prop: 'copyable', label: 'copyable', default: true },
      { type: 'boolean', prop: 'editable', label: 'editable', default: false },
      {
        type: 'boolean',
        prop: 'lineNumbers',
        label: 'lineNumbers',
        default: false,
      },
      { type: 'boolean', prop: 'wrap', label: 'wrap', default: false },
      {
        type: 'boolean',
        prop: 'collapse',
        label: 'maxLines={4}',
        default: false,
      },
    ],
    render: (state) => (
      <div className="w-full">
        <CodeBlock
          code={SAMPLE}
          language={String(state.language) as (typeof LANGUAGES)[number]}
          title={state.title ? String(state.title) : undefined}
          filePath={state.filePath ? String(state.filePath) : undefined}
          copyable={Boolean(state.copyable)}
          editable={Boolean(state.editable)}
          lineNumbers={Boolean(state.lineNumbers)}
          wrap={Boolean(state.wrap)}
          maxLines={state.collapse ? 4 : undefined}
        />
      </div>
    ),
    code: composeCodeBlock,
  },
  api: [
    {
      name: 'footer',
      type: 'ReactNode',
      description:
        'A control bar under the code — a Run button, a language switch, a status line. Rendered below the expand row, so "show more" stays attached to the code it expands.',
    },
    {
      name: 'code',
      type: 'string',
      description: 'The source to render. Acts as the initial value when editable.',
    },
    {
      name: 'language',
      type: LANGUAGES.map((l) => `'${l}'`).join(' | '),
      default: "'tsx'",
      description: 'Grammar to highlight with. Each one loads as its own chunk.',
    },
    {
      name: 'title',
      type: 'string',
      description: 'Free-form header label. Falls back to the language name.',
    },
    {
      name: 'filePath',
      type: 'string',
      description:
        'A path in the same header slot as title, with the directory muted and the file emphasized.',
    },
    {
      name: 'showLanguage',
      type: 'boolean',
      default: 'derived',
      description: 'Language chip on the right. On whenever the header has a label.',
    },
    {
      name: 'copyable',
      type: 'boolean',
      default: 'true',
      description: 'Copy button, showing a checkmark for 1.5s.',
    },
    {
      name: 'editable',
      type: 'boolean',
      default: 'false',
      description:
        'Type into the block; highlighting follows every keystroke via a transparent overlay.',
    },
    {
      name: 'onCodeChange',
      type: '(code: string) => void',
      description: 'Fires on every edit.',
    },
    {
      name: 'resettable',
      type: 'boolean',
      default: 'editable',
      description: 'Revert button, shown only once the code differs from the prop.',
    },
    {
      name: 'lineNumbers',
      type: 'boolean',
      default: 'false',
      description: 'Counter gutter down the left edge.',
    },
    {
      name: 'wrap',
      type: 'boolean',
      default: 'false',
      description: 'Soft-wrap long lines instead of scrolling horizontally.',
    },
    {
      name: 'highlightLines',
      type: 'number[]',
      description: '1-based lines to emphasize with an accent background and ring bar.',
    },
    {
      name: 'maxLines',
      type: 'number',
      description: 'Collapse past this many lines behind an animated Show more toggle.',
    },
    {
      name: 'header',
      type: 'boolean',
      default: 'derived',
      description: 'Force the header on or off. On whenever it would hold anything.',
    },
  ],
  demos: [
    {
      title: 'Footer controls',
      stack: true,
      code: `<CodeBlock
  code={snippet}
  language="typescript"
  title="script.ts"
  footer={
    <>
      <Button variant="secondary" size="xs"><Play />Run code</Button>
      <span className="ms-auto text-xs">Ready</span>
    </>
  }
/>`,
      render: () => (
        <CodeBlock
          code={'const total = items.reduce((sum, n) => sum + n, 0)\nconsole.log(total)'}
          language="typescript"
          title="script.ts"
          footer={
            <>
              <Button variant="secondary" size="xs">
                <Play />
                Run code
              </Button>
              <span className="ms-auto text-xs">Ready</span>
            </>
          }
        />
      ),
    },
    {
      title: 'Default',
      stack: true,
      code: `<CodeBlock language="tsx" code={source} />`,
      render: () => <CodeBlock language="tsx" code={SAMPLE} />,
    },
    {
      title: 'Header — title, file path, language chip',
      stack: true,
      code: `<CodeBlock title="Variants" code={source} />
<CodeBlock filePath="src/components/ui/button.tsx" code={source} />
<CodeBlock showLanguage={false} filePath="components.json" code={source} />`,
      render: () => (
        <>
          <CodeBlock title="Variants" code={SAMPLE} maxLines={3} />
          <CodeBlock
            filePath="src/components/ui/button.tsx"
            code={SAMPLE}
            maxLines={3}
          />
          <CodeBlock
            showLanguage={false}
            filePath="components.json"
            language="json"
            code={`{ "style": "new-york" }`}
          />
        </>
      ),
    },
    {
      title: 'Editable',
      stack: true,
      code: `<CodeBlock
  editable
  filePath="src/components/ui/stack.tsx"
  code={source}
  onCodeChange={setSource}
/>`,
      render: () => (
        <CodeBlock
          editable
          filePath="src/components/ui/stack.tsx"
          code={SAMPLE}
        />
      ),
    },
    {
      title: 'Line numbers and highlighted lines',
      stack: true,
      code: `<CodeBlock lineNumbers highlightLines={[4, 5, 6]} code={source} />`,
      render: () => (
        <CodeBlock lineNumbers highlightLines={[4, 5, 6]} code={SAMPLE} />
      ),
    },
    {
      title: 'Collapsed past maxLines',
      stack: true,
      code: `<CodeBlock maxLines={4} code={source} />`,
      render: () => <CodeBlock maxLines={4} lineNumbers code={SAMPLE} />,
    },
    {
      title: 'Bare — no header, not copyable',
      stack: true,
      code: `<CodeBlock header={false} language="bash" code="npm install astralyx-ui" />`,
      render: () => (
        <CodeBlock
          header={false}
          language="bash"
          code="npm install astralyx-ui"
        />
      ),
    },
    {
      title: 'Other languages',
      stack: true,
      code: `<CodeBlock language="css" filePath="src/index.css" code={css} />
<CodeBlock language="json" filePath="components.json" code={json} />`,
      render: () => (
        <>
          <CodeBlock
            language="css"
            filePath="src/index.css"
            code={`:root {\n  --radius: 0.875rem;\n}`}
          />
          <CodeBlock
            language="json"
            filePath="components.json"
            code={`{ "style": "new-york", "tsx": true }`}
          />
        </>
      ),
    },
    {
      title: 'Wrapped',
      stack: true,
      code: `<CodeBlock wrap code={longLine} />`,
      render: () => (
        <CodeBlock
          wrap
          language="typescript"
          code={`export const controlBase = 'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold select-none transition-colors'`}
        />
      ),
    },
  ],
}
