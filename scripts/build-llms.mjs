/**
 * The markdown twin of every page, and the index that points at it.
 *
 * Emits, into `out/`:
 *
 * - `<route>.md` beside each page — the same content as prose a model can read
 *   without running JavaScript or digging it out of a bundle.
 * - `llms.txt`, indexing them, per the llms.txt convention.
 *
 * This used to do three more jobs: prerender each route's HTML, write the
 * sitemap and write robots.txt. The static export writes real HTML for every
 * route now, and `app/sitemap.ts` and `app/robots.ts` cover the other two, so
 * what is left is the half Next has no opinion about.
 *
 * Nothing here is hand-listed. A hand-written index is stale the first time
 * someone adds a component, and nothing visibly breaks when it is.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const SITE = process.env.SITE_URL ?? 'https://ui.astralyx.dev'
const SITE_NAME = 'Astralyx UI'
const OUT = path.join(process.cwd(), 'out')

// Doc bodies are rendered to markdown through `renderToStaticMarkup`, and
// several components reach for a browser global at module scope. Nothing reads
// these; they only have to exist.
globalThis.window ??= {
  location: { pathname: '/' },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { ENTRIES, TIERED, componentPath, findCategory } = await server.ssrLoadModule('/src/registry/index.ts')

/**
 * The counts every description quotes, taken from the registry rather than
 * typed into the HTML.
 *
 * They were typed in once and said 253 for as long as it took to add ninety
 * more — in the meta description, the OG and Twitter descriptions, and the
 * structured data, which is the copy a search result and a link unfurl
 * actually show. A number nobody owns is a number that rots.
 */
const COMPONENT_COUNT = ENTRIES.length
const { DOCS } = await server.ssrLoadModule('/src/docs/pages.tsx')
const { EXAMPLES, examplePath } = await server.ssrLoadModule('/src/examples/index.ts')
const { clampDescription } = await server.ssrLoadModule('/src/lib/seo.ts')
// The same merge the component page renders, so the markdown twin cannot show
// a smaller API than the HTML one.
const { apiDocs, hasApi } = await server.ssrLoadModule('/src/registry/props.ts')
// Doc bodies contain `Link`, which reads router context and throws without a
// provider. Same wrapper the SSR audit uses.
const { Router } = await server.ssrLoadModule('/src/components/primitives/router.tsx')

function write(relative, contents) {
  const file = path.join(OUT, relative)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, contents)
}

/* -------------------------------------------------------------- markdown */

/**
 * A small HTML-to-markdown pass for the documentation bodies.
 *
 * The docs are JSX, not markdown, so there is no source text to copy — the
 * body has to be rendered and converted back. This handles what the docs
 * actually contain (headings, paragraphs, lists, code, links) and drops the
 * rest, which is the right trade for a file whose job is to be readable.
 */
function htmlToMarkdown(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Anything visually hidden is duplicated context for screen readers; in a
    // flat text file it reads as a stutter.
    .replace(/<[^>]+class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/gi, '')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, body) => {
      const code = body.replace(/<[^>]+>/g, '')
      return `\n\n\`\`\`\n${decode(code).trim()}\n\`\`\`\n\n`
    })
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, body) => `\`${body.replace(/<[^>]+>/g, '')}\``)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<\/(p|div|section|article|ul|ol|table|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // A space, not nothing. Adjacent inline elements — two buttons, a row of
    // badges — otherwise concatenate into "passedfailedrunningqueued".
    .replace(/<[^>]+>/g, ' ')

  return decode(text)
    .replace(/[ \t]+/g, ' ')
    // Undo the space that separator introduced in front of punctuation.
    .replace(/ +([,.;:!?)\]])/g, '$1')
    .replace(/([(\[]) +/g, '$1')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function decode(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}

/** One component, as markdown: what it is, how to install it, its full API. */
function componentMarkdown(entry) {
  const category = findCategory(entry.id)
  const lines = [
    `# ${entry.label}`,
    '',
    entry.description,
    '',
    `- Category: ${category ? category.label : 'Uncategorised'}`,
    `- Page: ${SITE}${componentPath(entry.id)}/`,
    '',
    '## Install',
    '',
    '```sh',
    `npx astralyx-ui add ${entry.id}`,
    '```',
  ]

  if (entry.usage) {
    lines.push('', '## Import', '', '```tsx', entry.usage.trim(), '```')
  }

  if (hasApi(entry.id, entry.api)) {
    const api = apiDocs(entry.id, entry.api)
    // Pipes inside a type union would split the row.
    const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
    const code = (value) => (value ? `\`${cell(value)}\`` : '—')
    lines.push('', '## API')

    for (const component of api.components) {
      lines.push('', `### ${component.name}${component.generics ?? ''}`)
      if (component.description) lines.push('', component.description)
      if (component.extends?.length) {
        lines.push('', `Extends ${component.extends.map((base) => `\`${base}\``).join(', ')}.`)
      } else if (!component.props.length) {
        lines.push('', 'Takes no props.')
      }
      if (component.props.length) {
        lines.push('', '| Prop | Type | Default | Description |', '| --- | --- | --- | --- |')
        for (const prop of component.props) {
          const fallback = prop.required ? 'required' : '—'
          lines.push(
            `| ${code(prop.name)} | ${code(prop.type)} | ${prop.default ? code(prop.default) : fallback} | ${cell(prop.description)} |`,
          )
        }
      }
    }

    for (const [title, rows] of [['Hooks', api.hooks], ['Functions', api.functions]]) {
      if (!rows.length) continue
      lines.push('', `### ${title}`, '', '| Name | Signature | Description |', '| --- | --- | --- |')
      for (const row of rows) {
        lines.push(`| ${code(row.name)} | ${code(row.signature)} | ${cell(row.description)} |`)
      }
    }

    if (api.types.length) {
      lines.push('', '### Types')
      for (const type of api.types) {
        const names = [type.name, ...(type.aliases ?? [])].join(' = ')
        lines.push('', `#### ${names}${type.generics ?? ''}`)
        if (type.description) lines.push('', type.description)
        if (type.fields) {
          lines.push('', '| Field | Type | Description |', '| --- | --- | --- |')
          for (const field of type.fields) {
            lines.push(`| ${code(`${field.name}${field.required ? '' : '?'}`)} | ${code(field.type)} | ${cell(field.description)} |`)
          }
        } else {
          lines.push('', '```ts', `type ${type.name}${type.generics ?? ''} = ${type.definition}`, '```')
        }
      }
    }

    if (api.notes.length) {
      lines.push('', '### Behaviour', '', '| Topic | Detail | Description |', '| --- | --- | --- |')
      for (const note of api.notes) {
        lines.push(`| ${cell(note.name)} | ${code(note.type)} | ${cell(note.description)} |`)
      }
    }
  }

  for (const demo of entry.demos ?? []) {
    lines.push('', `## ${demo.title}`, '', `\`\`\`${demo.language ?? 'tsx'}`, demo.code.trim(), '```')
  }

  return `${lines.join('\n')}\n`
}

let markdown = 0

for (const entry of ENTRIES) {
  write(`${componentPath(entry.id).slice(1)}.md`, componentMarkdown(entry))
  markdown++
}

for (const doc of DOCS) {
  let body = htmlToMarkdown(
    renderToStaticMarkup(createElement(Router, null, doc.render())),
  )
  // The rendered page opens with its own title. Keeping ours as well gives the
  // file two identical H1s.
  body = body.replace(new RegExp(`^# ${doc.label}\\s*`), '')

  write(
    `docs/${doc.id}.md`,
    `# ${doc.label}\n\n${doc.description}\n\n- Page: ${SITE}/docs/${doc.id}/\n\n${body}\n`,
  )
  markdown++
}

for (const example of EXAMPLES) {
  write(
    `${examplePath(example.id).slice(1)}.md`,
    [
      `# ${example.label}`,
      '',
      example.description,
      '',
      `- Page: ${SITE}${examplePath(example.id)}/`,
      '',
      '## Components used',
      '',
      ...example.uses.map((id) => `- [${id}](${SITE}${componentPath(id)}.md)`),
      '',
    ].join('\n'),
  )
  markdown++
}

/* --------------------------------------------------------------- llms.txt */

const llms = [
  `# ${SITE_NAME}`,
  '',
  `> ${ENTRIES.length} accessible React components and 12 primitives for React 19 and Tailwind v4. The CLI copies component source into your repository rather than installing a runtime dependency, so every file is yours to edit.`,
  '',
  `Install the CLI with \`npm i -D astralyx-ui\`, then \`npx astralyx-ui init\` and \`npx astralyx-ui add <component>\`. Adding a component also writes whatever it imports.`,
  '',
  '## Docs',
  '',
  ...DOCS.map((doc) => `- [${doc.label}](${SITE}/docs/${doc.id}.md): ${doc.description}`),
  '',
  '## Examples',
  '',
  ...EXAMPLES.map(
    (example) =>
      `- [${example.label}](${SITE}${examplePath(example.id)}.md): ${clampDescription(example.description, 120)}`,
  ),
  '',
  '## Components',
  '',
]

// Grouped Basics-then-Blocks, matching the site, so a reader of this file gets
// the same first distinction a reader of the rail does: the components that
// belong in any product, then the ones that already know a domain.
for (const tier of TIERED) {
  llms.push(
    `### ${tier.label}`,
    '',
    tier.blurb,
    '',
  )
  for (const category of tier.categories) {
    llms.push(`#### ${category.label}`, '')
    for (const entry of category.items) {
      llms.push(`- [${entry.label}](${SITE}${componentPath(entry.id)}.md): ${entry.description}`)
    }
    llms.push('')
  }
}

write('llms.txt', `${llms.join('\n')}\n`)

await server.close()

console.log(
  `llms ok — ${ENTRIES.length} component pages, ${DOCS.length} docs, ` +
    `${EXAMPLES.length} examples, llms.txt written`,
)
