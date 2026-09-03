import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

/** Languages the CodeBlock can highlight. Add a lang here and in `LANGS`. */
export const LANGUAGES = [
  'tsx',
  'jsx',
  'typescript',
  'javascript',
  'css',
  'html',
  'json',
  'bash',
  'sql',
] as const

export type Language = (typeof LANGUAGES)[number]

const LANGS = [
  import('shiki/langs/tsx.mjs'),
  import('shiki/langs/jsx.mjs'),
  import('shiki/langs/typescript.mjs'),
  import('shiki/langs/javascript.mjs'),
  import('shiki/langs/css.mjs'),
  import('shiki/langs/html.mjs'),
  import('shiki/langs/json.mjs'),
  import('shiki/langs/bash.mjs'),
  import('shiki/langs/sql.mjs'),
]

let highlighter: Promise<HighlighterCore> | undefined

/**
 * Lazily create a single shared highlighter. Both themes are loaded at once so
 * a rendered block carries light *and* dark colors and needs no re-highlight
 * when the theme flips — see the `.shiki` rules in index.css.
 */
export function getHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [
      import('shiki/themes/github-light-default.mjs'),
      import('shiki/themes/github-dark-default.mjs'),
    ],
    langs: LANGS,
    engine: createJavaScriptRegexEngine(),
  })

  return highlighter
}

export type HighlightOptions = {
  /** 1-based line numbers to mark with `data-highlighted`. */
  highlightLines?: number[]
}

export async function highlight(
  code: string,
  lang: Language,
  { highlightLines }: HighlightOptions = {},
) {
  const shiki = await getHighlighter()
  const marked = new Set(highlightLines)

  return shiki.codeToHtml(code, {
    lang,
    themes: { light: 'github-light-default', dark: 'github-dark-default' },
    defaultColor: false,
    colorReplacements: {
      '#ffffff': 'transparent',
      '#0d1117': 'transparent',
    },
    transformers: marked.size
      ? [
          {
            name: 'highlight-lines',
            line(node, line) {
              if (marked.has(line)) {
                node.properties['data-highlighted'] = ''
              }
            },
          },
        ]
      : undefined,
  })
}
