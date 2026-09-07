import type { Metadata } from 'next'
import { NotFoundBody } from './not-found-body'

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return <NotFoundBody />
}
