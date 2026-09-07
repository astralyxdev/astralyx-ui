import type { NextConfig } from 'next'

/**
 * A static site, and nothing but.
 *
 * `output: 'export'` emits real HTML for every route at build time — which is
 * the whole reason for the move. The previous build shipped one shell and let
 * the bundle fill it in, so a crawler that does not execute JavaScript saw a
 * page with a title and an empty body.
 *
 * `trailingSlash` is not a style choice here: the site is already indexed with
 * canonicals like `/components/button/`, and dropping the slash would move
 * every URL Google has. It stays.
 *
 * Images are unoptimised because there is no server to optimise them on; the
 * only raster assets are the favicon and the OG card, both already sized.
 */
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // The same React Compiler the Vite build ran through Babel. It bails on any
  // file carrying an eslint-disable comment, so there are none in this repo.
  reactCompiler: true,
}

export default config
