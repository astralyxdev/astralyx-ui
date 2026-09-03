/**
 * Everything a crawler, an unfurler or a model reads, generated from the same
 * registry the app renders from.
 *
 * Emits, into `dist/`:
 *
 * - `<route>/index.html` for every route — the built shell with that page's
 *   title, description, canonical and OG tags baked in. This is the half that
 *   matters: Slack, X, iMessage and most crawlers never execute the bundle, so
 *   the `useSeo` hook is invisible to them. GitHub Pages serves the directory
 *   index for a clean URL, so `/components/button` finds its own file.
 * - `<route>.md` beside each page, and `llms.txt` indexing them, per the
 *   llms.txt convention — markdown a model can read without running JS or
 *   digging the content out of a 1.9 MB bundle.
 * - `sitemap.xml` and `robots.txt`.
 *
 * Nothing here is hand-listed. A hand-written sitemap or index is stale the
 * first time someone adds a component, and nothing visibly breaks when it is.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const SITE = process.env.SITE_URL ?? 'https://ui.astralyx.dev'
const SITE_NAME = 'Astralyx UI'
const OUT = path.join(process.cwd(), 'dist')

// The router reads window.location in a useState initialiser, and several
// components touch matchMedia at module scope.
globalThis.window ??= {
  location: { pathname: '/' },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { ENTRIES, componentPath, findCategory } = await server.ssrLoadModule('/src/registry/index.ts')
const { DOCS } = await server.ssrLoadModule('/src/docs/pages.tsx')
const { EXAMPLES, examplePath } = await server.ssrLoadModule('/src/examples/index.ts')
const { canonicalUrl, clampDescription, pageTitle } = await server.ssrLoadModule('/src/lib/seo.ts')
// Doc bodies contain `Link`, which reads router context and throws without a
// provider. Same wrapper the SSR audit uses.
const { Router } = await server.ssrLoadModule('/src/components/primitives/router.tsx')

/* ------------------------------------------------------------------ routes */

const routes = [
  {
    path: '/',
    title: undefined,
    description:
      'Accessible React components and primitives for React 19 and Tailwind v4. A CLI copies the source into your repo — nothing is imported from a package at runtime.',
    priority: '1.0',
  },
  {
    path: '/components',
    title: 'Components',
    description:
      'Every component in the kit, grouped by category. Each has a live composer, worked examples and a full props table.',
    priority: '0.9',
  },
  {
    path: '/examples',
    title: 'Examples',
    description:
      'Whole screens built from the kit — a dashboard, a mail client, a repository browser, an assistant and a settings form.',
    priority: '0.8',
  },
  ...DOCS.map((doc) => ({
    path: `/docs/${doc.id}`,
    title: doc.label,
    description: doc.description,
    priority: '0.7',
  })),
  ...EXAMPLES.map((example) => ({
    path: examplePath(example.id),
    title: `${example.label} example`,
    description: example.description,
    priority: '0.6',
  })),
  ...ENTRIES.map((entry) => ({
    path: componentPath(entry.id),
    title: entry.label,
    description: `${entry.description} Copy it into your project with npx astralyx-ui add ${entry.id}.`,
    priority: '0.5',
  })),
]

/* -------------------------------------------------------------- prerender */

const shell = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Swap the content of one meta tag, matched on its own name/property. */
function setMeta(html, attribute, key, content) {
  const pattern = new RegExp(
    `(<meta\\s+${attribute}="${key}"\\s+content=")[^"]*(")`,
    'i',
  )
  return pattern.test(html) ? html.replace(pattern, `$1${escapeHtml(content)}$2`) : html
}

function pageHtml(route) {
  const title = pageTitle(route.title)
  const description = clampDescription(route.description)
  const url = canonicalUrl(route.path)

  let html = shell.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*(")/,
    `$1${escapeHtml(url)}$2`,
  )
  html = setMeta(html, 'name', 'description', description)
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', description)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'name', 'twitter:title', title)
  html = setMeta(html, 'name', 'twitter:description', description)
  return html
}

function write(relative, contents) {
  const file = path.join(OUT, relative)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, contents)
}

let prerendered = 0
for (const route of routes) {
  // '/' already exists as dist/index.html and is rewritten in place.
  const target = route.path === '/' ? 'index.html' : `${route.path.slice(1)}/index.html`
  write(target, pageHtml(route))
  prerendered++
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
    `- Page: ${SITE}${componentPath(entry.id)}`,
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

  if (entry.api?.length) {
    lines.push('', '## Props', '', '| Prop | Type | Default | Description |', '| --- | --- | --- | --- |')
    for (const prop of entry.api) {
      // Pipes inside a type union would split the row.
      const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
      lines.push(
        `| \`${cell(prop.name)}\` | \`${cell(prop.type)}\` | ${prop.default ? `\`${cell(prop.default)}\`` : '—'} | ${cell(prop.description)} |`,
      )
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
    `# ${doc.label}\n\n${doc.description}\n\n- Page: ${SITE}/docs/${doc.id}\n\n${body}\n`,
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
      `- Page: ${SITE}${examplePath(example.id)}`,
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

const byCategory = new Map()
for (const entry of ENTRIES) {
  const category = findCategory(entry.id)
  const label = category ? category.label : 'Uncategorised'
  if (!byCategory.has(label)) byCategory.set(label, [])
  byCategory.get(label).push(entry)
}

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

for (const [label, entries] of byCategory) {
  llms.push(`### ${label}`, '')
  for (const entry of entries) {
    llms.push(`- [${entry.label}](${SITE}${componentPath(entry.id)}.md): ${entry.description}`)
  }
  llms.push('')
}

write('llms.txt', `${llms.join('\n')}\n`)

/* ------------------------------------------------- sitemap.xml, robots.txt */

const today = new Date().toISOString().slice(0, 10)

write(
  'sitemap.xml',
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map(
      (route) =>
        `  <url><loc>${canonicalUrl(route.path)}</loc><lastmod>${today}</lastmod>` +
        `<priority>${route.priority}</priority></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n'),
)

write('robots.txt', ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE}/sitemap.xml`, ''].join('\n'))

await server.close()

console.log(
  `seo ok — ${prerendered} prerendered pages, ${markdown} markdown files, ` +
    `${routes.length} sitemap urls, llms.txt written`,
)
