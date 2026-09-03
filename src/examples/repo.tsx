import { useMemo, useState } from 'react'
import {
  Book, Circle, Code2, Copy, Download, Eye, GitFork, GitPullRequest,
  History, Play, Search, Settings, Star,
} from 'lucide-react'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BranchSelect } from '@/components/ui/branch-select'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '@/components/ui/code-block'
import { CommitList } from '@/components/ui/commit-list'
import { DeployList } from '@/components/ui/deploy-list'
import { Empty } from '@/components/ui/empty'
import { FileTree } from '@/components/ui/file-tree'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { REPO_FILES, REPO_TREE } from './repo-data'
import type { ExampleEntry } from './types'

const BRANCHES = [
  { name: 'main', isDefault: true, protected: true },
  { name: 'next', protected: true },
  { name: 'feat/ai-components' },
  { name: 'fix/switch-contrast' },
  { name: 'v2.1.0', kind: 'tag' as const },
]

const day = (offset: number, hour: number) => {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  d.setHours(hour, 12, 0, 0)
  return d
}

const COMMITS = [
  { sha: 'a1b2c3d4e5f6', message: 'Drop Radix, add own Slot primitive', author: 'Ada Lovelace', date: day(0, 14), status: 'passed' as const, verified: true, additions: 248, deletions: 96 },
  { sha: 'b2c3d4e5f6a7', message: 'Field padding derives from control height', author: 'Katherine Johnson', date: day(0, 11), status: 'passed' as const, additions: 64, deletions: 41 },
  { sha: 'c3d4e5f6a7b8', message: 'Fix switch thumb contrast in dark mode', author: 'Alan Turing', date: day(1, 17), status: 'failed' as const, additions: 12, deletions: 8 },
  { sha: 'd4e5f6a7b8c9', message: 'Toast queue and provider', author: 'Grace Hopper', date: day(1, 9), status: 'passed' as const, verified: true, additions: 310, deletions: 4 },
]

const DEPLOYS = [
  { id: '1', environment: 'production' as const, status: 'ready' as const, branch: 'main', commit: 'a1b2c3d4', message: 'Drop Radix, add own Slot primitive', author: 'Ada Lovelace', duration: 192, when: '4h ago', url: '#' },
  { id: '2', environment: 'preview' as const, status: 'building' as const, branch: 'feat/ai-components', commit: 'b2c3d4e5', message: 'Prompt input and context picker', author: 'Grace Hopper', when: 'just now' },
  { id: '3', environment: 'preview' as const, status: 'failed' as const, branch: 'fix/switch-contrast', commit: 'c3d4e5f6', message: 'Fix switch thumb contrast', author: 'Alan Turing', duration: 41, when: 'yesterday' },
]

const LANGUAGES = [
  { name: 'TypeScript', share: 78.4, token: 'blue' },
  { name: 'CSS', share: 18.2, token: 'violet' },
  { name: 'HTML', share: 3.4, token: 'amber' },
] as const

function Repo() {
  const [path, setPath] = useState('README.md')
  const [branch, setBranch] = useState('main')
  const [query, setQuery] = useState('')

  const file = REPO_FILES[path]
  const segments = path.split('/')

  // Search filters the tree down to matching leaves, keeping their ancestors.
  const tree = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return REPO_TREE

    const filter = (nodes: typeof REPO_TREE): typeof REPO_TREE =>
      nodes
        .map((node) => {
          if (!node.children) {
            return node.name.toLowerCase().includes(needle) ? node : null
          }
          const children = filter(node.children)
          return children.length ? { ...node, children, defaultOpen: true } : null
        })
        .filter(Boolean) as typeof REPO_TREE

    return filter(REPO_TREE)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      {/* ------------------------------------------------------- app bar */}
      <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:gap-4 sm:px-4">
        <Logo className="h-5 shrink-0" />
        <Separator orientation="vertical" className="hidden sm:block" />

        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink href="#">astralyx</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">ui-kit</BreadcrumbPage>
            </BreadcrumbItem>
            <Badge size="sm" shape="rounded" className="ms-1">
              Public
            </Badge>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex shrink-0 items-center gap-2">
          {/* Counts stay, labels go: on a phone the number is the information. */}
          <Button size="xs" variant="secondary" className="hidden sm:inline-flex">
            <Eye /> Watch <Badge size="sm">24</Badge>
          </Button>
          <Button size="xs" variant="secondary" className="hidden lg:inline-flex">
            <GitFork /> Fork <Badge size="sm">102</Badge>
          </Button>
          <Button size="xs" variant="secondary">
            <Star />
            <span className="hidden sm:inline">Star</span>
            <Badge size="sm">1.4k</Badge>
          </Button>
          <Separator orientation="vertical" className="hidden sm:block" />
          <Avatar size="sm" name="Ada Lovelace" />
        </div>
      </header>

      {/* --------------------------------------------------------- tabs */}
      <Tabs defaultValue="code" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="border-border shrink-0 overflow-x-auto border-b px-3 sm:px-4">
          <TabsList variant="underline" className="w-max border-b-0">
            <TabsTrigger value="code" variant="underline">
              <Code2 /> Code
            </TabsTrigger>
            <TabsTrigger value="commits" variant="underline">
              <History /> Commits <Badge size="sm">4</Badge>
            </TabsTrigger>
            <TabsTrigger value="deploys" variant="underline">
              <Play /> Deployments
            </TabsTrigger>
            <TabsTrigger value="issues" variant="underline">
              <Circle /> Issues <Badge size="sm">7</Badge>
            </TabsTrigger>
            <TabsTrigger value="pulls" variant="underline">
              <GitPullRequest /> Pull requests
            </TabsTrigger>
            <TabsTrigger value="settings" variant="underline">
              <Settings /> Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ------------------------------------------------------- code */}
        <TabsContent value="code" className="flex min-h-0 flex-1">
          {/* Stacked below md so the tree sits above the file rather than
              squeezing it into a column too narrow to read code in. */}
          <div className="flex min-h-0 w-full flex-col md:flex-row">
            {/* file tree rail */}
            <aside className="border-border flex max-h-64 shrink-0 flex-col border-b md:max-h-none md:w-72 md:border-e md:border-b-0">
              <div className="border-border flex shrink-0 items-center gap-2 border-b p-3">
                <BranchSelect
                  branches={BRANCHES}
                  value={branch}
                  onValueChange={setBranch}
                  size="sm"
                />
              </div>
              <div className="border-border shrink-0 border-b p-3">
                <Input variant="secondary"
                  size="sm"
                  icon={<Search />}
                  placeholder="Go to file"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  clearable
                  onClear={() => setQuery('')}
                />
              </div>
              <ScrollArea className="min-h-0 flex-1 p-2">
                {tree.length ? (
                  <FileTree
                    key={query}
                    nodes={tree}
                    value={path}
                    onSelect={setPath}
                    showMeta={false}
                  />
                ) : (
                  <Empty
                    bordered={false}
                    icon={<Search />}
                    title="No files match"
                    description={`Nothing named “${query}”.`}
                  />
                )}
              </ScrollArea>
            </aside>

            {/* file viewer */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="border-border flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
                <Breadcrumb className="min-w-0 flex-1">
                  <BreadcrumbList className="text-xs">
                    {segments.map((segment, index) => {
                      const last = index === segments.length - 1
                      return (
                        <BreadcrumbItem key={`${segment}-${index}`}>
                          {last ? (
                            <BreadcrumbPage className="font-mono">
                              {segment}
                            </BreadcrumbPage>
                          ) : (
                            <>
                              <span className="text-muted-foreground font-mono">
                                {segment}
                              </span>
                              <BreadcrumbSeparator>/</BreadcrumbSeparator>
                            </>
                          )}
                        </BreadcrumbItem>
                      )
                    })}
                  </BreadcrumbList>
                </Breadcrumb>

                {file && (
                  <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
                    <span className="hidden sm:inline">{file.lines} lines</span>
                    <span className="hidden sm:inline">{file.size}</span>
                    <Tooltip content="Copy path">
                      <Button variant="ghost" size="icon-xs" aria-label="Copy path">
                        <Copy />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Download">
                      <Button variant="ghost" size="icon-xs" aria-label="Download">
                        <Download />
                      </Button>
                    </Tooltip>
                  </div>
                )}
              </div>

              <ScrollArea className="min-h-0 flex-1 p-4">
                {file ? (
                  <div className="space-y-3">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Avatar size="xs" name="Ada Lovelace" />
                      <span className="text-foreground font-medium">Ada Lovelace</span>
                      <span className="truncate">{file.commit}</span>
                      <span className="ms-auto shrink-0">{file.when}</span>
                    </div>
                    <CodeBlock
                      key={path}
                      filePath={path}
                      language={file.language}
                      code={file.content}
                      lineNumbers
                      maxLines={40}
                    />
                  </div>
                ) : (
                  <Empty
                    icon={<Book />}
                    title="Directory"
                    description="Pick a file from the tree to read it."
                  />
                )}
              </ScrollArea>
            </div>

            {/* about rail — the last thing to earn space, so it appears last */}
            <aside className="border-border hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-s p-4 xl:flex">
              <Card>
                <CardHeader>
                  <CardTitle as="h2">About</CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    60 components, built on their own primitives.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge size="sm" color="blue">react</Badge>
                    <Badge size="sm" color="violet">tailwind</Badge>
                    <Badge size="sm" color="green">typescript</Badge>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Languages</p>
                    <div className="bg-secondary flex h-1.5 overflow-hidden rounded-full">
                      {LANGUAGES.map((lang) => (
                        <span
                          key={lang.name}
                          className={`bg-[var(--${lang.token})]`}
                          style={{ width: `${lang.share}%` }}
                        />
                      ))}
                    </div>
                    {LANGUAGES.map((lang) => (
                      <div
                        key={lang.name}
                        className="text-muted-foreground flex items-center gap-1.5 text-xs"
                      >
                        <span className={`size-2 rounded-full bg-[var(--${lang.token})]`} />
                        {lang.name}
                        <span className="ms-auto tabular-nums">{lang.share}%</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Contributors</p>
                    <AvatarGroup size="sm" max={4}>
                      {['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson', 'Margaret Hamilton'].map((name) => (
                        <Avatar key={name} name={name} />
                      ))}
                    </AvatarGroup>
                  </div>
                </CardBody>
              </Card>
            </aside>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------- commits */}
        <TabsContent value="commits" className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">
            <CommitList commits={COMMITS} />
          </div>
        </TabsContent>

        {/* ---------------------------------------------------- deploys */}
        <TabsContent value="deploys" className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-2xl">
            <DeployList deploys={DEPLOYS} onRedeploy={() => {}} />
          </div>
        </TabsContent>

        {(['issues', 'pulls', 'settings'] as const).map((tab) => (
          <TabsContent
            key={tab}
            value={tab}
            className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
          >
            <div className="mx-auto max-w-2xl pt-10">
              <Empty
                icon={<Circle />}
                title={`Nothing in ${tab} yet`}
                description="This tab is part of the shell but not the demo."
                action={<Button size="sm">Open the Code tab</Button>}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export const repoExample: ExampleEntry = {
  id: 'repo',
  label: 'Repository',
  description:
    'A source forge: browse the file tree, open any file into a highlighted viewer, filter by name, switch branches, and read the commit and deployment history.',
  uses: [
    'File Tree', 'Code Block', 'Branch Select', 'Commit List', 'Deploy List',
    'Tabs', 'Breadcrumb', 'Scroll Area', 'Empty', 'Avatar', 'Badge', 'Input',
  ],
  render: () => <Repo />,
}
