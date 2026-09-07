'use client'

import { usePathname } from 'next/navigation'
import { NotFound } from '@/screens/not-found'

export function NotFoundBody() {
  return <NotFound path={usePathname() ?? ''} />
}
