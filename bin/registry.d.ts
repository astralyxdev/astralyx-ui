export type ItemType = 'registry:ui' | 'registry:primitive' | 'registry:lib' | 'registry:theme';
export type RegistryFile = {
    path: string;
    type: ItemType;
    content: string;
};
export type Item = {
    name: string;
    type: ItemType;
    title: string;
    description?: string;
    category?: string;
    dependencies: string[];
    registryDependencies: string[];
    files?: RegistryFile[];
};
export type Index = {
    name: string;
    version: string;
    homepage?: string;
    items: Item[];
};
export declare class RegistryError extends Error {
}
/** The catalogue: every item, without file contents. */
export declare function getRegistry(remote?: string): Promise<Index>;
/** One item, with its file contents. */
export declare function getItem(name: string, remote?: string): Promise<Item>;
/**
 * Every item the named ones need, transitively.
 *
 * Depth-first, so a dependency always appears before whatever imports it —
 * which is the order they have to be written to disk in.
 */
export declare function resolveItems(names: string[], remote?: string): Promise<Item[]>;
/** npm packages the named items need, deduplicated. */
export declare function resolveDependencies(names: string[], remote?: string): Promise<string[]>;
