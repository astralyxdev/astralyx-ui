/**
 * Registry access, shared by the CLI and exported as this package's public API.
 *
 * The registry ships inside the package, so resolution works offline and the
 * components you get always match the version that resolved them. Pass a
 * `registry` URL to read a fork instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED = path.join(HERE, '..', 'registry');
export class RegistryError extends Error {
}
/** The catalogue: every item, without file contents. */
export async function getRegistry(remote) {
    if (remote) {
        const base = remote.replace(/\/$/, '');
        const response = await fetch(`${base}/index.json`);
        if (!response.ok) {
            throw new RegistryError(`Could not read registry at ${base} (${response.status}).`);
        }
        return (await response.json());
    }
    const local = path.join(BUNDLED, 'index.json');
    if (!fs.existsSync(local)) {
        throw new RegistryError('Bundled registry is missing - reinstall astralyx-ui.');
    }
    return JSON.parse(fs.readFileSync(local, 'utf8'));
}
/** One item, with its file contents. */
export async function getItem(name, remote) {
    if (remote) {
        const base = remote.replace(/\/$/, '');
        const response = await fetch(`${base}/items/${name}.json`);
        if (!response.ok)
            throw new RegistryError(`Registry has no item "${name}".`);
        return (await response.json());
    }
    const local = path.join(BUNDLED, 'items', `${name}.json`);
    if (!fs.existsSync(local))
        throw new RegistryError(`Registry has no item "${name}".`);
    return JSON.parse(fs.readFileSync(local, 'utf8'));
}
/**
 * Every item the named ones need, transitively.
 *
 * Depth-first, so a dependency always appears before whatever imports it —
 * which is the order they have to be written to disk in.
 */
export async function resolveItems(names, remote) {
    const resolved = new Map();
    async function visit(name) {
        if (resolved.has(name))
            return;
        const item = await getItem(name, remote);
        resolved.set(name, item);
        for (const dep of item.registryDependencies)
            await visit(dep);
    }
    for (const name of names)
        await visit(name);
    return [...resolved.values()];
}
/** npm packages the named items need, deduplicated. */
export async function resolveDependencies(names, remote) {
    const items = await resolveItems(names, remote);
    return [...new Set(items.flatMap((item) => item.dependencies))].sort();
}
