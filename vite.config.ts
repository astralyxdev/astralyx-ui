import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

/**
 * Not the site's bundler any more — Next builds that.
 *
 * What is left is the module loader four generator scripts use to read the
 * registry: `build-docs`, `build-registry`, `build-llms` and `check-api` all
 * need to import TypeScript that imports 343 components, and Vite's
 * `ssrLoadModule` is the thing in this repo that already does it. All it needs
 * from a config is the `@` alias; esbuild handles the JSX.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
