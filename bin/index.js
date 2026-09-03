#!/usr/bin/env node
/**
 * The astralyx-ui CLI.
 *
 * Components are copied into the consumer's repo rather than imported from a
 * package. That is the thesis of the kit: once a component is in your tree it
 * is yours, and a design change is an edit rather than an argument with someone
 * else's API. The registry exists so the copy is not a manual one — it resolves
 * what a component needs and brings that too.
 *
 * No runtime dependencies. A tool whose job is to add dependencies to your
 * project has no business bringing a dozen of its own.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
// `.js` on purpose: this is emitted as ESM and Node resolves the specifier
// literally at runtime, extension and all.
import { getRegistry, resolveItems, } from './registry.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = 'components.json';
/* ------------------------------------------------------------------ output */
// Built from a code point rather than written literally: an escape byte in
// source survives copy/paste badly and is invisible in review.
const ESC = String.fromCharCode(27);
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (text) => tty ? `${ESC}[${code}m${text}${ESC}[0m` : text;
const bold = paint('1');
const dim = paint('2');
const green = paint('32');
const yellow = paint('33');
const red = paint('31');
const cyan = paint('36');
const log = (...args) => console.log(...args);
const info = (text) => log(`${cyan('.')} ${text}`);
const done = (text) => log(`${green('+')} ${text}`);
const warn = (text) => log(`${yellow('!')} ${text}`);
function fail(message) {
    console.error(`${red('x')} ${message}`);
    process.exit(1);
}
/* ------------------------------------------------------------------ config */
const DEFAULT_CONFIG = {
    tsx: true,
    tailwind: { css: 'src/index.css' },
    aliases: {
        ui: '@/components/ui',
        primitives: '@/components/primitives',
        lib: '@/lib',
    },
    paths: {
        ui: 'src/components/ui',
        primitives: 'src/components/primitives',
        lib: 'src/lib',
        styles: 'src/styles',
    },
};
function readConfig(cwd) {
    const file = path.join(cwd, CONFIG_FILE);
    if (!fs.existsSync(file))
        return undefined;
    try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    }
    catch {
        fail(`${CONFIG_FILE} is not valid JSON.`);
    }
}
function requireConfig(cwd) {
    const config = readConfig(cwd);
    if (!config)
        fail(`No ${CONFIG_FILE} here. Run ${bold('astralyx-ui init')} first.`);
    return config;
}
/* ------------------------------------------------------------------ writing */
/** Which source folder a registry path belongs to, and the alias replacing it. */
const AREAS = [
    { prefix: 'components/ui/', key: 'ui' },
    { prefix: 'components/primitives/', key: 'primitives' },
    { prefix: 'lib/', key: 'lib' },
    { prefix: 'styles/', key: 'styles' },
];
function targetFor(file, config, cwd) {
    for (const area of AREAS) {
        if (file.path.startsWith(area.prefix)) {
            return path.join(cwd, config.paths[area.key], file.path.slice(area.prefix.length));
        }
    }
    return path.join(cwd, file.path);
}
/**
 * Rewrites the kit's own `@/...` imports to wherever the consumer keeps things.
 *
 * Longest prefix first: `@/components/ui` has to be matched before
 * `@/components`, or a project that relocates only `ui` gets its primitives
 * imports pointed at the wrong folder.
 */
function rewriteImports(content, config) {
    const map = [
        ['@/components/ui', config.aliases.ui],
        ['@/components/primitives', config.aliases.primitives],
        ['@/lib', config.aliases.lib],
    ];
    map.sort((a, b) => b[0].length - a[0].length);
    let out = content;
    for (const [from, to] of map) {
        if (from === to)
            continue;
        out = out.replaceAll(`'${from}/`, `'${to}/`);
    }
    return out;
}
/**
 * Best-effort type stripping for JavaScript projects, and it is worth being
 * plain that a regex is not a TypeScript compiler. Anything non-trivial is
 * better served by keeping `tsx: true` and letting a real build handle it.
 */
function toJs(content) {
    return content
        .replace(/^import type .*$/gm, '')
        .replace(/^export type .*$/gm, '')
        .replace(/,\s*type [A-Z]\w+/g, '');
}
/* -------------------------------------------------------------- installing */
function detectPackageManager(cwd) {
    if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml')))
        return 'pnpm';
    if (fs.existsSync(path.join(cwd, 'yarn.lock')))
        return 'yarn';
    if (fs.existsSync(path.join(cwd, 'bun.lockb')))
        return 'bun';
    return 'npm';
}
function installDeps(deps, cwd, dry) {
    if (deps.length === 0)
        return;
    const manager = detectPackageManager(cwd);
    const args = manager === 'npm' ? ['install', ...deps] : ['add', ...deps];
    info(`${dry ? 'Would install' : 'Installing'} ${deps.length} package${deps.length === 1 ? '' : 's'} with ${manager}`);
    log(dim(`  ${manager} ${args.join(' ')}`));
    if (dry)
        return;
    try {
        execFileSync(manager, args, { cwd, stdio: 'inherit' });
    }
    catch {
        warn(`${manager} failed. Install these yourself: ${deps.join(' ')}`);
    }
}
/** Already-satisfied packages are dropped, so a project is never downgraded. */
function missingDeps(deps, cwd) {
    const file = path.join(cwd, 'package.json');
    if (!fs.existsSync(file))
        return deps;
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const present = new Set([
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
    ]);
    return deps.filter((dep) => !present.has(dep.replace(/@[\^~]?[\d.].*$/, '')));
}
/* ------------------------------------------------------------------ prompts */
async function confirm(question, fallback) {
    if (!process.stdin.isTTY)
        return fallback;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`${cyan('?')} ${question} ${dim(fallback ? '(Y/n)' : '(y/N)')} `);
    rl.close();
    if (!answer.trim())
        return fallback;
    return /^y/i.test(answer.trim());
}
async function ask(question, fallback) {
    if (!process.stdin.isTTY)
        return fallback;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`${cyan('?')} ${question} ${dim(fallback)} `);
    rl.close();
    return answer.trim() || fallback;
}
/* ----------------------------------------------------------------- commands */
async function addItems(names, config, flags, cwd) {
    const items = await resolveItems(names, flags.registry);
    const written = [];
    const skipped = [];
    for (const item of items) {
        for (const file of item.files ?? []) {
            const target = targetFor(file, config, cwd);
            if (fs.existsSync(target) && !flags.overwrite) {
                skipped.push(path.relative(cwd, target));
                continue;
            }
            let content = rewriteImports(file.content, config);
            let outPath = target;
            if (!config.tsx && /\.tsx?$/.test(target)) {
                content = toJs(content);
                outPath = target.replace(/\.tsx$/, '.jsx').replace(/\.ts$/, '.js');
            }
            if (!flags.dryRun) {
                fs.mkdirSync(path.dirname(outPath), { recursive: true });
                fs.writeFileSync(outPath, content);
            }
            written.push(path.relative(cwd, outPath));
        }
    }
    for (const file of written)
        done(file);
    if (skipped.length) {
        warn(`${skipped.length} file${skipped.length === 1 ? '' : 's'} already existed - pass --overwrite to replace`);
        for (const file of skipped)
            log(dim(`  ${file}`));
    }
    const deps = missingDeps([...new Set(items.flatMap((i) => i.dependencies))], cwd);
    if (deps.length && !flags.noDeps)
        installDeps(deps, cwd, flags.dryRun);
    return { written, skipped };
}
async function init(flags, cwd) {
    if (!fs.existsSync(path.join(cwd, 'package.json'))) {
        fail('No package.json here. Run this inside your project.');
    }
    if (readConfig(cwd) && !flags.overwrite) {
        fail(`${CONFIG_FILE} already exists. Pass --overwrite to replace it.`);
    }
    const config = structuredClone(DEFAULT_CONFIG);
    if (!flags.yes) {
        config.paths.ui = await ask('Where should components go?', config.paths.ui);
        config.paths.primitives = await ask('Where should primitives go?', config.paths.primitives);
        config.paths.lib = await ask('Where should shared helpers go?', config.paths.lib);
        config.paths.styles = await ask('Where should the theme CSS go?', config.paths.styles);
        config.tailwind.css = await ask('Which file holds your Tailwind entry CSS?', config.tailwind.css);
        config.aliases.ui = await ask('Import alias for components?', config.aliases.ui);
        config.aliases.primitives = await ask('Import alias for primitives?', config.aliases.primitives);
        config.aliases.lib = await ask('Import alias for helpers?', config.aliases.lib);
        config.tsx = await confirm('TypeScript?', true);
    }
    if (!flags.dryRun) {
        fs.writeFileSync(path.join(cwd, CONFIG_FILE), JSON.stringify(config, null, 2) + '\n');
    }
    done(CONFIG_FILE);
    // `lib-utils` and `lib-styles` back nearly every component, and the theme
    // carries the tokens they reference. Without all three, nothing compiles.
    await addItems(['lib-utils', 'lib-styles', 'theme'], config, flags, cwd);
    const themeFile = path.join(config.paths.styles, 'astralyx.css');
    const from = path.dirname(config.tailwind.css);
    let importPath = path.relative(from, themeFile).split(path.sep).join('/');
    if (!importPath.startsWith('.'))
        importPath = `./${importPath}`;
    log();
    log(`Import the theme from ${bold(config.tailwind.css)}:`);
    log(dim(`  @import '${importPath}';`));
    log();
    log(`Then add a component: ${bold('astralyx-ui add button')}`);
}
async function add(names, flags, cwd) {
    const config = requireConfig(cwd);
    const index = await getRegistry(flags.registry);
    const wanted = flags.all
        ? index.items.filter((i) => i.type === 'registry:ui').map((i) => i.name)
        : names;
    if (wanted.length === 0)
        fail(`Nothing to add. Try ${bold('astralyx-ui list')}.`);
    const known = new Set(index.items.map((i) => i.name));
    const unknown = wanted.filter((n) => !known.has(n));
    if (unknown.length) {
        for (const name of unknown) {
            const near = index.items
                .map((i) => i.name)
                .filter((n) => n.includes(name) || name.includes(n))
                .slice(0, 4);
            console.error(`${red('x')} Unknown component "${name}"` +
                (near.length ? dim(` - did you mean ${near.join(', ')}?`) : ''));
        }
        process.exit(1);
    }
    await addItems(wanted, config, flags, cwd);
}
async function list(flags) {
    const index = await getRegistry(flags.registry);
    const ui = index.items.filter((i) => i.type === 'registry:ui');
    const groups = new Map();
    for (const item of ui) {
        const key = item.category ?? 'Other';
        groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    for (const [category, entries] of groups) {
        log();
        log(`${bold(category)} ${dim(String(entries.length))}`);
        const width = Math.max(...entries.map((e) => e.name.length)) + 2;
        for (const entry of entries) {
            const summary = (entry.description ?? '').split('. ')[0].slice(0, 72);
            log(`  ${entry.name.padEnd(width)}${dim(summary)}`);
        }
    }
    log();
    log(dim(`${ui.length} components - astralyx-ui add <name>`));
}
async function show(name, flags) {
    const closure = await resolveItems([name], flags.registry);
    const item = closure[0];
    const files = closure.flatMap((i) => i.files ?? []);
    const deps = [...new Set(closure.flatMap((i) => i.dependencies))];
    log();
    log(`${bold(item.title)} ${dim(item.name)}`);
    if (item.description)
        log(item.description);
    log();
    log(`${bold('Files')} ${dim(String(files.length))}`);
    for (const file of files)
        log(dim(`  ${file.path}`));
    log(`${bold('Packages')} ${deps.length ? deps.join(', ') : dim('none')}`);
    log();
}
const USAGE = `
${bold('astralyx-ui')} - copy components into your project

  ${bold('init')}                 Create ${CONFIG_FILE}, add the theme and shared helpers
  ${bold('add')} <name...>        Add components and everything they depend on
  ${bold('list')}                 Every component, by category
  ${bold('info')} <name>          What a component would bring with it

Options
  -y, --yes            Accept the defaults, ask nothing
  -o, --overwrite      Replace files that already exist
      --all            With add: every component in the registry
      --dry-run        Report what would happen, change nothing
      --no-deps        Do not install npm packages
      --cwd <dir>      Run against another directory
      --registry <url> Use a remote registry instead of the bundled one

Examples
  npx astralyx-ui init
  npx astralyx-ui add button input dialog
  npx astralyx-ui info data-grid
`;
function parse(argv) {
    const flags = {
        yes: false, overwrite: false, all: false, dryRun: false, noDeps: false,
    };
    const rest = [];
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--yes' || arg === '-y')
            flags.yes = true;
        else if (arg === '--overwrite' || arg === '-o')
            flags.overwrite = true;
        else if (arg === '--all')
            flags.all = true;
        else if (arg === '--dry-run')
            flags.dryRun = true;
        else if (arg === '--no-deps')
            flags.noDeps = true;
        else if (arg === '--cwd')
            flags.cwd = argv[++i];
        else if (arg === '--registry')
            flags.registry = argv[++i];
        // `--help` and `--version` read as options but behave as commands, so they
        // pass through to the switch rather than tripping the unknown-option guard.
        else if (/^--?(h|help|v|version)$/.test(arg))
            rest.push(arg);
        else if (arg.startsWith('-'))
            fail(`Unknown option "${arg}".`);
        else
            rest.push(arg);
    }
    return { flags, rest };
}
async function main() {
    const { flags, rest } = parse(process.argv.slice(2));
    const [command, ...args] = rest;
    const cwd = path.resolve(flags.cwd ?? process.cwd());
    if (!command || command === 'help' || command === '--help' || command === '-h') {
        log(USAGE);
        return;
    }
    if (command === 'version' || command === '--version' || command === '-v') {
        const pkg = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'package.json'), 'utf8'));
        log(pkg.version);
        return;
    }
    if (flags.dryRun)
        warn('Dry run - nothing will be written.');
    switch (command) {
        case 'init':
            return init(flags, cwd);
        case 'add':
            return add(args, flags, cwd);
        case 'list':
        case 'ls':
            return list(flags);
        case 'info':
        case 'show':
            if (!args[0])
                fail('Which component? e.g. astralyx-ui info button');
            return show(args[0], flags);
        default:
            fail(`Unknown command "${command}". Run ${bold('astralyx-ui help')}.`);
    }
}
main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
});
