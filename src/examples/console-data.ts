import type { Deploy } from '@/components/ui/deploy-list'
import type { BuildStep } from '@/components/ui/build-log'
import type { StatusCheck } from '@/components/ui/status-checks'
import type { Invoice } from '@/components/ui/invoice-list'
import type { PaymentMethod } from '@/components/ui/payment-method'
import type { Permission, PermissionRole } from '@/components/ui/permission-matrix'

/**
 * Everything the Console example pretends to know.
 *
 * In a file of its own because the example is already long, and because
 * separating the fixture from the screen is the honest version of what a real
 * app does — the sections below read as though they were handed this by an API,
 * which is the only way to tell whether the components can actually take it.
 *
 * Dates are frozen. A fixture built from `new Date()` renders differently on
 * every prerender and turns "2 hours ago" into a diff.
 */
export const NOW = new Date('2026-09-07T09:00:00Z')

const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

export type Project = {
  id: string
  name: string
  repo: string
  framework: string
  environment: 'production' | 'preview'
  status: 'ready' | 'building' | 'failed'
  domain: string
  lastDeploy: string
  visits7d: number
  errorRate: number
  trend: number[]
}

export const PROJECTS: Project[] = [
  {
    id: 'astralyx-ui',
    name: 'astralyx-ui',
    repo: 'astralyxdev/astralyx-ui',
    framework: 'Vite',
    environment: 'production',
    status: 'ready',
    domain: 'ui.astralyx.dev',
    lastDeploy: '2m ago',
    visits7d: 48_210,
    errorRate: 0.12,
    trend: [31, 38, 34, 46, 52, 49, 61],
  },
  {
    id: 'marketing',
    name: 'marketing',
    repo: 'astralyxdev/marketing',
    framework: 'Next.js',
    environment: 'production',
    status: 'building',
    domain: 'astralyx.dev',
    lastDeploy: 'building',
    visits7d: 128_940,
    errorRate: 0.04,
    trend: [88, 92, 90, 104, 118, 121, 129],
  },
  {
    id: 'docs-search',
    name: 'docs-search',
    repo: 'astralyxdev/docs-search',
    framework: 'Workers',
    environment: 'production',
    status: 'ready',
    domain: 'search.astralyx.dev',
    lastDeploy: '4h ago',
    visits7d: 9_140,
    errorRate: 1.8,
    trend: [12, 9, 14, 11, 8, 10, 9],
  },
  {
    id: 'status',
    name: 'status',
    repo: 'astralyxdev/status',
    framework: 'Astro',
    environment: 'production',
    status: 'failed',
    domain: 'status.astralyx.dev',
    lastDeploy: '1d ago',
    visits7d: 2_480,
    errorRate: 0.0,
    trend: [3, 2, 4, 2, 3, 2, 2],
  },
]

export const DEPLOYS: (Deploy & { project: string; additions: number; deletions: number })[] = [
  { id: '1482', project: 'astralyx-ui', environment: 'production', status: 'ready', branch: 'main', commit: 'a3f19c2', message: 'Square the table inset', author: 'Ada Lovelace', duration: 192, when: '2m ago', url: 'ui.astralyx.dev', additions: 148, deletions: 96 },
  { id: '1481', project: 'marketing', environment: 'production', status: 'building', branch: 'main', commit: '7b21e04', message: 'Autumn pricing page', author: 'Grace Hopper', when: 'now', additions: 402, deletions: 31 },
  { id: '1480', project: 'astralyx-ui', environment: 'preview', status: 'ready', branch: 'feat/motion', commit: '1c8d5aa', message: 'Numbers count, bars grow', author: 'Alan Turing', duration: 210, when: '18m ago', url: 'feat-motion.astralyx.dev', additions: 2781, deletions: 858 },
  { id: '1479', project: 'status', environment: 'production', status: 'failed', branch: 'main', commit: 'd90b117', message: 'Move to the new uptime feed', author: 'Katherine Johnson', duration: 41, when: '1h ago', additions: 88, deletions: 210 },
  { id: '1478', project: 'docs-search', environment: 'production', status: 'ready', branch: 'main', commit: '5ef0a83', message: 'Rank exact matches first', author: 'Margaret Hamilton', duration: 156, when: '4h ago', url: 'search.astralyx.dev', additions: 64, deletions: 12 },
  { id: '1477', project: 'astralyx-ui', environment: 'preview', status: 'canceled', branch: 'fix/slider', commit: '2aa71f9', message: 'Thumb follows the pointer', author: 'Ada Lovelace', duration: 12, when: '6h ago', additions: 96, deletions: 74 },
  { id: '1476', project: 'marketing', environment: 'preview', status: 'ready', branch: 'feat/og', commit: 'b4c0d21', message: 'Link previews for every page', author: 'Grace Hopper', duration: 178, when: '8h ago', url: 'feat-og.astralyx.dev', additions: 51, deletions: 8 },
  { id: '1475', project: 'astralyx-ui', environment: 'production', status: 'ready', branch: 'main', commit: '9d3e77c', message: 'Sidebars on either edge', author: 'Alan Turing', duration: 188, when: '1d ago', url: 'ui.astralyx.dev', additions: 640, deletions: 122 },
]

export const BUILD_STEPS: BuildStep[] = [
  { id: 'checkout', name: 'Checkout', status: 'success', duration: 1_200 },
  { id: 'restore', name: 'Restore cache', status: 'success', duration: 4_800, output: 'Restored node_modules from key linux-node24-8f2ac91\n1,412 packages, 0 downloaded' },
  { id: 'install', name: 'Install dependencies', status: 'success', duration: 41_200, output: 'added 0 packages, audited 1412 packages in 41s\nfound 0 vulnerabilities' },
  { id: 'typecheck', name: 'Typecheck', status: 'success', duration: 12_400, output: '$ tsc -b --force\n(no output)' },
  { id: 'build', name: 'Build', status: 'success', duration: 9_070, defaultOpen: true, output: '$ vite build\nvite v8.2.2 building for production...\n✓ 214 modules transformed\ndist/assets/index-4f2a1c9.css   92.4 kB │ gzip:  18.2 kB\ndist/assets/index-4f2a1c9.js   748.1 kB │ gzip: 210.4 kB\n✓ built in 9.07s' },
  { id: 'prerender', name: 'Prerender', status: 'success', duration: 6_300, output: 'seo ok — 370 prerendered pages, 367 markdown files' },
  { id: 'deploy', name: 'Deploy', status: 'success', duration: 3_100 },
]

export const FAILED_STEPS: BuildStep[] = [
  { id: 'checkout', name: 'Checkout', status: 'success', duration: 1_100 },
  { id: 'install', name: 'Install dependencies', status: 'success', duration: 38_900 },
  { id: 'typecheck', name: 'Typecheck', status: 'failed', duration: 8_400, defaultOpen: true, output: "src/feed/uptime.ts(42,18): error TS2345: Argument of type 'string' is not\n  assignable to parameter of type 'Date'.\n\n42   return window(incident.startedAt)\n                    ~~~~~~~~~~~~~~~~~~\n\nFound 1 error." },
  { id: 'build', name: 'Build', status: 'skipped' },
  { id: 'deploy', name: 'Deploy', status: 'skipped' },
]

export const CHECKS: StatusCheck[] = [
  { id: 'lint', name: 'oxlint', status: 'success', duration: '11s', required: true, description: '0 errors, 283 warnings' },
  { id: 'types', name: 'typecheck', status: 'success', duration: '12s', required: true },
  { id: 'registry', name: 'registry', status: 'success', duration: '6s', required: true, description: '366 items, graph closed and acyclic' },
  { id: 'a11y', name: 'accessibility', status: 'success', duration: '48s', required: true, description: '343 components rendered and asserted' },
  { id: 'size', name: 'bundle size', status: 'failure', duration: '9s', required: false, description: 'Main chunk grew 4.2 kB over the 1 MB budget' },
  { id: 'visual', name: 'visual diff', status: 'running', required: false },
]

export const USAGE = [
  { id: 'build', label: 'Build minutes', used: 8_420, cap: 10_000, unit: 'min' },
  { id: 'bandwidth', label: 'Bandwidth', used: 214, cap: 500, unit: 'GB' },
  { id: 'storage', label: 'Storage', used: 47, cap: 50, unit: 'GB' },
  { id: 'functions', label: 'Function calls', used: 1_240_000, cap: 5_000_000, unit: '' },
]

export const TRAFFIC = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [
    { name: 'Production', values: [42_100, 48_900, 46_200, 61_400, 58_800, 21_400, 18_900] },
    { name: 'Preview', values: [3_200, 4_100, 3_800, 5_600, 5_100, 900, 640] },
  ],
}

export const BUILDS_BY_DAY = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [
    { name: 'Passed', values: [38, 52, 27, 68, 61, 11, 7] },
    { name: 'Failed', values: [4, 6, 4, 6, 5, 1, 1] },
  ],
}

export type Member = {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'invited'
  lastActive: string
  projects: number
}

export const MEMBERS: Member[] = [
  { id: 'ada', name: 'Ada Lovelace', email: 'ada@astralyx.dev', role: 'owner', status: 'active', lastActive: '2m ago', projects: 4 },
  { id: 'grace', name: 'Grace Hopper', email: 'grace@astralyx.dev', role: 'admin', status: 'active', lastActive: '18m ago', projects: 4 },
  { id: 'alan', name: 'Alan Turing', email: 'alan@astralyx.dev', role: 'member', status: 'active', lastActive: '1h ago', projects: 2 },
  { id: 'katherine', name: 'Katherine Johnson', email: 'katherine@astralyx.dev', role: 'member', status: 'active', lastActive: '4h ago', projects: 3 },
  { id: 'margaret', name: 'Margaret Hamilton', email: 'margaret@astralyx.dev', role: 'viewer', status: 'active', lastActive: '2d ago', projects: 1 },
  { id: 'edsger', name: 'edsger@contractor.dev', email: 'edsger@contractor.dev', role: 'viewer', status: 'invited', lastActive: '—', projects: 0 },
]

export const PERMISSIONS: Permission[] = [
  { id: 'deploy.read', label: 'View deployments', group: 'Deployments' },
  { id: 'deploy.create', label: 'Trigger deployments', group: 'Deployments' },
  { id: 'deploy.rollback', label: 'Roll back', group: 'Deployments', description: 'Promotes an older build to production.' },
  { id: 'env.read', label: 'View variables', group: 'Environment' },
  { id: 'env.write', label: 'Edit variables', group: 'Environment', description: 'Includes production secrets.' },
  { id: 'domain.manage', label: 'Manage domains', group: 'Environment' },
  { id: 'team.invite', label: 'Invite members', group: 'Team' },
  { id: 'billing.manage', label: 'Manage billing', group: 'Team' },
]

export const ROLES: PermissionRole[] = [
  { id: 'owner', label: 'Owner', granted: PERMISSIONS.map((permission) => permission.id), locked: true },
  { id: 'admin', label: 'Admin', granted: ['deploy.read', 'deploy.create', 'deploy.rollback', 'env.read', 'env.write', 'domain.manage', 'team.invite'] },
  { id: 'member', label: 'Member', granted: ['deploy.read', 'deploy.create', 'env.read'], inherited: ['deploy.rollback'] },
  { id: 'viewer', label: 'Viewer', granted: ['deploy.read'] },
]

export const INVOICES: Invoice[] = [
  { id: 'in_9', number: 'AX-2026-009', date: ago(60 * 24 * 6), amount: 288, status: 'paid', description: 'Team — 12 seats' },
  { id: 'in_8', number: 'AX-2026-008', date: ago(60 * 24 * 36), amount: 288, status: 'paid', description: 'Team — 12 seats' },
  { id: 'in_7', number: 'AX-2026-007', date: ago(60 * 24 * 67), amount: 264, status: 'paid', description: 'Team — 11 seats' },
  { id: 'in_6', number: 'AX-2026-006', date: ago(60 * 24 * 97), amount: 264, status: 'refunded', description: 'Team — 11 seats' },
]

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm_visa', kind: 'card', brand: 'Visa', last4: '4242', expiry: '11/28', holder: 'Astralyx Ltd', isDefault: true },
  { id: 'pm_amex', kind: 'card', brand: 'Amex', last4: '0005', expiry: '01/26', holder: 'Astralyx Ltd' },
]

export const ACTIVITY = [
  { id: 'a1', title: 'Deployed astralyx-ui to production', who: 'Ada Lovelace', at: '2m ago', tone: 'success' as const },
  { id: 'a2', title: 'Started a build for marketing', who: 'Grace Hopper', at: '4m ago', tone: 'info' as const },
  { id: 'a3', title: 'status build failed on typecheck', who: 'Katherine Johnson', at: '1h ago', tone: 'danger' as const },
  { id: 'a4', title: 'Added DATABASE_URL to production', who: 'Grace Hopper', at: '3h ago', tone: 'warning' as const },
  { id: 'a5', title: 'Invited edsger@contractor.dev as viewer', who: 'Ada Lovelace', at: '5h ago', tone: 'default' as const },
]

export const ENV_VARS = [
  { id: 'e1', key: 'DATABASE_URL', value: 'postgres://app:••••••••@db.internal:5432/production', scope: 'Production', secret: true },
  { id: 'e2', key: 'SESSION_SECRET', value: '••••••••••••••••••••••••', scope: 'Production', secret: true },
  { id: 'e3', key: 'NEXT_PUBLIC_API_URL', value: 'https://api.astralyx.dev', scope: 'All', secret: false },
  { id: 'e4', key: 'SENTRY_DSN', value: 'https://••••••@o1.ingest.sentry.io/42', scope: 'All', secret: true },
  { id: 'e5', key: 'FEATURE_MOTION', value: 'true', scope: 'Preview', secret: false },
]

export const DOMAINS = [
  { id: 'd1', name: 'ui.astralyx.dev', kind: 'Production', ssl: 'Active', verified: true },
  { id: 'd2', name: 'astralyx-ui.pages.dev', kind: 'Preview', ssl: 'Active', verified: true },
  { id: 'd3', name: 'docs.astralyx.dev', kind: 'Redirect', ssl: 'Pending', verified: false },
]
