# astralyx-ui

**253 accessible React components you copy into your repo** — with a CLI and a
registry that work out what each one needs and bring that too.

Not a dependency. There is no package to upgrade and nothing to fight when a
design changes: the code lands in your tree and it is yours.

```bash
npm i -D astralyx-ui
npx astralyx-ui init
npx astralyx-ui add button
```

## What you get

- **253 components** across 28 categories — forms, data, overlays, commerce,
  auth, AI, crypto, observability, developer tooling.
- **12 primitives** underneath them. Slot, Popper, FocusTrap, Dismissable and
  friends — no headless-UI dependency.
- **One style contract.** Colour tokens, a surface ladder built from lightness
  alone, and eight colour sets any component can be pointed at with one prop.
- **Accessibility wired, not assumed.** Real elements, real focus management,
  state announced rather than implied. Enforced by a harness that renders every
  component and asserts against it.

## Getting started

`init` writes a `components.json`, drops in the two shared helpers every
component needs, and installs the theme:

```bash
npx astralyx-ui init
```

Then import the theme from your Tailwind entry CSS:

```css
@import 'tailwindcss';
@import './styles/astralyx.css';
```

Add whatever you need. Dependencies come with it — `data-grid` brings `table`,
`checkbox` and `empty` without being asked:

```bash
npx astralyx-ui add data-grid
```

## Commands

| Command | What it does |
| --- | --- |
| `init` | Create `components.json`, add the theme and shared helpers |
| `add <name...>` | Add components and everything they depend on |
| `add --all` | Add every component in the registry |
| `list` | Every component, by category |
| `info <name>` | What a component would bring with it |

| Option | |
| --- | --- |
| `-y, --yes` | Accept the defaults, ask nothing |
| `-o, --overwrite` | Replace files that already exist |
| `--dry-run` | Report what would happen, change nothing |
| `--no-deps` | Do not install npm packages |
| `--cwd <dir>` | Run against another directory |
| `--registry <url>` | Use a remote registry instead of the bundled one |

## Configuration

`components.json` decides where files land and which aliases their imports use.
Both are honoured — put components wherever you like and the imports follow:

```json
{
  "tsx": true,
  "tailwind": { "css": "src/index.css" },
  "aliases": {
    "ui": "@/components/ui",
    "primitives": "@/components/primitives",
    "lib": "@/lib"
  },
  "paths": {
    "ui": "src/components/ui",
    "primitives": "src/components/primitives",
    "lib": "src/lib",
    "styles": "src/styles"
  }
}
```

## Programmatic use

The registry is also a library, if you are building your own tooling on top:

```ts
import { getRegistry, resolveItems, resolveDependencies } from 'astralyx-ui'

const { items } = await getRegistry()
const files = await resolveItems(['data-grid'])
const packages = await resolveDependencies(['data-grid'])
```

Or read the JSON directly:

```ts
import index from 'astralyx-ui/registry'
import button from 'astralyx-ui/registry/button'
```

## Requirements

React 19, Tailwind CSS v4, Node 20+. The CLI itself has **no runtime
dependencies**; a tool whose job is to add packages to your project has no
business bringing a dozen of its own.

## Developing this repo

```bash
npm install
npm run dev              # the documentation site
npm run build            # typecheck + build the site
npm run build:package    # regenerate the registry and compile the CLI
npm run lint
```

The registry is generated from source — the dependency graph is derived by
parsing imports, never hand-listed. A hand-maintained manifest is wrong the
first time someone adds an import and forgets to update it, and the failure is
silent: the CLI writes a file that cannot compile.

## License

MIT
