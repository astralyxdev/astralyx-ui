import type { Metadata } from 'next'
import { NotFoundBody } from './not-found-body'

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: true },
  // The layout sets a canonical of `/` for the site. Inheriting it here would
  // tell a crawler that this 404 *is* the home page.
  alternates: { canonical: null },
}

export default function NotFound() {
  return <NotFoundBody />
}
