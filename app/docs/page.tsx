import type { Metadata } from 'next'
import Link from 'next/link'
import docs from '@/registry/docs.generated.json'

/**
 * /docs is not a page — it is the thing people type after reading /docs/theming.
 *
 * `redirect()` cannot work here. There is no server to send a 308 from, so a
 * static export turns it into an empty document that only moves once the bundle
 * has loaded and run: 52 kB with nothing in the body, the home page's title, and
 * a canonical pointing at the home page. A crawler files that as a thin
 * duplicate, which is precisely the complaint this whole move is answering.
 *
 * So it redirects the way a static file can. `http-equiv="refresh"` moves any
 * browser with or without JavaScript, `noindex` keeps it out of the index, the
 * canonical hands whatever reaches it to the real first page, and the body says
 * where it went for anyone who arrives with neither.
 */
const first = docs.docs[0]

export const metadata: Metadata = {
  title: first.label,
  description: first.description,
  robots: { index: false, follow: true },
  alternates: { canonical: first.href },
  other: { refresh: `0; url=${first.href}` },
}

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        The docs start at{' '}
        <Link href={first.href} className="underline underline-offset-4">
          {first.label}
        </Link>
        .
      </p>
    </div>
  )
}
