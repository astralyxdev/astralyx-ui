import type { Metadata, Viewport } from 'next'
import { SITE, SITE_NAME } from '@/lib/seo'
import docs from '@/registry/docs.generated.json'
import { Chrome, type Nav } from './chrome'
import { DocIcon } from './doc-icon'
import '@/index.css'

/**
 * The document.
 *
 * Everything here is static: the metadata Next bakes into every exported page,
 * the JSON-LD, and one inline script that has to run before the first paint.
 * The interactive shell — rail, header, palette — is a client island below.
 */

const DESCRIPTION = `${Object.keys(docs.components).length} accessible React components and 12 primitives for React 19 and Tailwind v4. A CLI copies the source into your repo — nothing is imported from a package at runtime.`

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${SITE_NAME} — React components you own`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — React components you own`,
    description: DESCRIPTION,
    url: SITE,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: `${SITE_NAME} — components you actually own` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — React components you own`,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#09090b',
  colorScheme: 'dark light',
}

/*
 * The theme class has to land on <html> before the first paint, or the page
 * shows one palette and then swaps. This runs synchronously, ahead of the
 * bundle: a stored choice wins, and a first visit follows the OS.
 */
const THEME_BOOT = `try{var s=localStorage.getItem('astralyx-theme');document.documentElement.classList.toggle('dark',s?s==='dark':!window.matchMedia('(prefers-color-scheme: light)').matches)}catch(e){}`

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  name: SITE_NAME,
  description: DESCRIPTION,
  url: SITE,
  codeRepository: 'https://github.com/astralyxdev/astralyx-ui',
  programmingLanguage: 'TypeScript',
  license: 'https://opensource.org/licenses/MIT',
}

/*
 * The rail's contents, resolved on the server.
 *
 * Every row leaves the build as a real `<a href>` in the HTML rather than
 * something the bundle draws on arrival — which is the point of the move. A
 * crawler that runs no JavaScript now finds 366 internal links from any page it
 * lands on, and the client never imports the registry to build a list of names.
 */
const nav: Nav = {
  docs: docs.docs.map((doc) => ({
    id: doc.id,
    label: doc.label,
    href: doc.href,
    icon: <DocIcon id={doc.id} />,
  })),
  examples: docs.examples.map((example) => ({
    id: example.id,
    label: example.label,
    href: example.href,
  })),
  // Grouped into the two tiers here rather than in the rail, so the client
  // island receives the shape it renders and does no filtering of its own.
  tiers: docs.tiers.map((tier) => ({
    id: tier.id,
    label: tier.label,
    categories: docs.categories
      .filter((category) => category.tier === tier.id)
      .map((category) => ({
        label: category.label,
        items: category.items.map((id) => {
          const entry = docs.components[id as keyof typeof docs.components]
          return { id, label: entry.label, href: entry.href, isNew: 'isNew' in entry }
        }),
      })),
  })),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>
        <Chrome nav={nav}>{children}</Chrome>
      </body>
    </html>
  )
}
