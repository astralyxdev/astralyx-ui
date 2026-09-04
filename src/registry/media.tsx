import { CompareSlider } from '@/components/ui/compare-slider'
import { Image } from '@/components/ui/image'
import { Masonry } from '@/components/ui/masonry'
import { MediaGallery, type MediaItem } from '@/components/ui/media-gallery'
import { UploadList } from '@/components/ui/upload-list'
import { VideoPlayer } from '@/components/ui/video-player'
import type { Attachment } from '@/components/ui/attachment-preview'
import type { ComponentEntry, ComposerState } from './types'

const SAMPLE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

/* ------------------------------------------------------------- video player */

export const videoPlayerEntry: ComponentEntry = {
  id: 'video-player',
  label: 'Video Player',
  description:
    'A player with a scrubber, quality and subtitle menus. Controls are real buttons on a real timeline, so the keyboard reaches every one of them — a div-based scrubber never does.',
  usage: `import { VideoPlayer } from '@/components/ui/video-player'

<VideoPlayer src={src} poster={poster} qualities={qualities} subtitles={tracks} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'qualities', label: 'quality menu', default: true },
      { type: 'boolean', prop: 'subtitles', label: 'subtitle menu', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <VideoPlayer
          src={SAMPLE}
          title="Big Buck Bunny"
          qualities={state.qualities ? [
            { id: 'auto', label: 'Auto' },
            { id: '1080', label: '1080p' },
            { id: '720', label: '720p' },
            { id: '480', label: '480p' },
          ] : undefined}
          subtitles={state.subtitles ? [
            { id: 'en', label: 'English' },
            { id: 'fr', label: 'Français' },
          ] : undefined}
        />
      </div>
    ),
    code: () => `<VideoPlayer src={src} qualities={qualities} subtitles={tracks} />`,
  },
  api: [
    { name: 'src / poster', type: 'string', description: 'Passed to the underlying `<video>`. The poster is what fills the frame before play, instead of a black rectangle.' },
    { name: 'qualities / quality / onQualityChange', type: 'VideoTrack[]', description: 'Controlled: switching a rendition means changing the source, which is yours to do. Omit to hide the menu.' },
    { name: 'subtitles / subtitle', type: 'VideoTrack[] | null', description: '`null` is "off", which is a real selection and appears in the menu as one.' },
    { name: 'keyboard', type: 'space, arrows, m, f', description: 'Play/pause, seek, mute, fullscreen. The scrubber is a slider, so arrow keys seek from it too.' },
    { name: 'time display', type: 'hours when needed', description: 'A 40-minute video shows `12:04`, a 2-hour one shows `1:12:04`. Padding everything to hours wastes the width.' },
  ],
}

/* ------------------------------------------------------------ media gallery */

const IMAGES: MediaItem[] = [
  { id: 'g1', src: 'https://picsum.photos/seed/astralyx1/800/600', alt: 'Overhead view of a mountain lake', caption: 'Lake, from above' },
  { id: 'g2', src: 'https://picsum.photos/seed/astralyx2/800/600', alt: 'A city street at night in the rain' },
  { id: 'g3', src: 'https://picsum.photos/seed/astralyx3/800/600', alt: 'Close-up of fern fronds unfurling' },
  { id: 'g4', src: 'https://picsum.photos/seed/astralyx4/800/600', alt: 'Concrete stairwell seen from below' },
  { id: 'g5', src: 'https://picsum.photos/seed/astralyx5/800/600', alt: 'Sand dunes at sunset' },
  { id: 'g6', src: 'https://picsum.photos/seed/astralyx6/800/600', alt: 'A red door in a white wall' },
]

export const mediaGalleryEntry: ComponentEntry = {
  id: 'media-gallery',
  label: 'Media Gallery',
  description:
    'A grid that opens into a lightbox. `alt` is required by the type rather than optional, because a gallery is exactly where missing alt text accumulates.',
  usage: `import { MediaGallery } from '@/components/ui/media-gallery'

<MediaGallery items={items} columns={3} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'columns', label: 'columns', default: 3, min: 2, max: 5, step: 1 },
      { type: 'number', prop: 'ratio', label: 'ratio', default: 1, min: 0.6, max: 1.8, step: 0.1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-lg">
        <MediaGallery
          items={IMAGES}
          columns={Number(state.columns) as 2 | 3 | 4 | 5}
          ratio={Number(state.ratio)}
        />
      </div>
    ),
    code: (state: ComposerState) => `<MediaGallery items={items} columns={${state.columns}} />`,
  },
  api: [
    { name: 'items', type: 'MediaItem[]', description: '`{ id, src, alt, thumbnail?, caption? }`. `alt` is not optional.' },
    { name: 'columns', type: '2 | 3 | 4 | 5', default: '3', description: 'The count at full width; the grid steps down on narrow screens on its own.' },
    { name: 'lightbox', type: 'native dialog', description: 'Opens in a `<dialog>` with `showModal()`, which gives focus trapping, Escape and inertness for free rather than reimplemented.' },
    { name: 'navigation', type: 'arrows, Escape', description: 'Arrow keys move between images while the lightbox is open, and focus returns to the tile you opened.' },
    { name: 'ratio', type: 'number', default: '1', description: 'Tile aspect ratio. Tiles are uniform so the grid stays a grid; the full image is shown uncropped in the lightbox.' },
  ],
}

/* --------------------------------------------------------------- upload list */

const UPLOADS: Attachment[] = [
  { id: 'u1', name: 'quarterly-report-final-v4.pdf', type: 'application/pdf', size: 4_211_003, progress: 0.72 },
  { id: 'u2', name: 'hero-render.psd', type: 'image/vnd.adobe.photoshop', size: 184_339_201, progress: 0.18 },
  { id: 'u3', name: 'notes.txt', type: 'text/plain', size: 2_048 },
  { id: 'u4', name: 'archive.zip', type: 'application/zip', size: 512_000_000, error: 'Exceeds the 200 MB limit' },
]

export const uploadListEntry: ComponentEntry = {
  id: 'upload-list',
  label: 'Upload List',
  description:
    'Files in flight, with per-file progress and a retry for the ones that failed. A failed upload keeps its row rather than vanishing — silently dropping it is how people lose work.',
  usage: `import { UploadList } from '@/components/ui/upload-list'

<UploadList uploads={uploads} onRetry={retry} onRemove={remove} onCancelAll={cancel} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'cancelAll', label: 'cancel all', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <UploadList
          uploads={UPLOADS}
          onRetry={() => {}}
          onRemove={() => {}}
          onCancelAll={state.cancelAll ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<UploadList uploads={uploads} onRetry={retry} onRemove={remove} />`,
  },
  api: [
    { name: 'uploads', type: 'Attachment[]', description: 'The same shape `AttachmentPreview` takes, so one list can carry files mid-upload and files already attached.' },
    { name: 'summary', type: 'derived', description: 'Overall progress is weighted by file size, not by count — 3 of 4 files done means little when the fourth is 180 MB.' },
    { name: 'onRetry', type: '(id: string) => void', description: 'Shown only on rows with an `error`.' },
    { name: 'onCancelAll', type: '() => void', description: 'Appears while anything is still uploading. Omit for a list that cannot be interrupted.' },
  ],
}


/* -------------------------------------------------------------------- image */

// A 20x12 JPEG at almost no bytes — the low-resolution stand-in a blur mask
// exists to show. Inline, so the demo needs no second request to prove it.
const LQIP =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 12"><rect width="20" height="12" fill="#3f4a5a"/><circle cx="6" cy="5" r="4" fill="#7d8ba1"/><rect y="8" width="20" height="4" fill="#232a35"/></svg>`,
  )

const PHOTO = 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6'

export const imageEntry: ComponentEntry = {
  id: 'image',
  label: 'Image',
  isNew: true,
  description:
    'An img that reserves its space, covers its own load with a skeleton, shimmer or blurred thumbnail, builds a srcset from a list of widths, and renders a fallback in the same box when the URL is dead.',
  usage: `import { CompareSlider } from '@/components/ui/compare-slider'
import { Image } from '@/components/ui/image'
import { Masonry } from '@/components/ui/masonry'

<Image
  src="/hero.jpg"
  alt="The console, mid-deploy"
  ratio={16 / 9}
  mask="blur"
  blurSrc={lqip}
  widths={[480, 960, 1440]}
  sizes="(min-width: 1024px) 640px, 100vw"
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'mask', label: 'mask', options: ['skeleton', 'shimmer', 'blur', 'none'], default: 'blur' },
      { type: 'select', prop: 'fit', label: 'fit', options: ['cover', 'contain', 'fill', 'scale-down'], default: 'cover' },
      { type: 'boolean', prop: 'broken', label: 'broken URL', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <Image
          // Keyed on the controls so switching one re-runs the load and the
          // mask is actually visible rather than resolved from cache.
          key={`${state.mask}-${state.broken}`}
          src={state.broken ? '/does-not-exist.jpg' : `${PHOTO}?auto=format&fit=crop&w=800&q=70`}
          alt="A workstation at dusk"
          ratio={16 / 9}
          mask={String(state.mask) as 'skeleton' | 'shimmer' | 'blur' | 'none'}
          fit={String(state.fit) as 'cover' | 'contain' | 'fill' | 'scale-down'}
          blurSrc={LQIP}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<Image\n  src="/hero.jpg"\n  alt="A workstation at dusk"\n  ratio={16 / 9}\n  mask="${state.mask}"\n  fit="${state.fit}"\n${state.mask === 'blur' ? '  blurSrc={lqip}\n' : ''}/>`,
  },
  api: [
    { name: 'src / alt', type: 'string / string', description: 'alt is required, deliberately. An image with no alt is either meaningful and unreadable, or decorative and should say so — pass alt="" for the second, which is a decision rather than an omission.' },
    { name: 'mask', type: "'skeleton' | 'shimmer' | 'blur' | 'none'", default: "'skeleton'", description: 'What fills the frame until the image decodes. blur needs blurSrc and degrades to skeleton without it.' },
    { name: 'blurSrc', type: 'string', description: 'A tiny inline stand-in, blurred and scaled up under the real image. Worth it for generated images, which arrive slowly and often after their own preview.' },
    { name: 'widths / srcFor / sizes', type: 'number[] / (src, w) => string / string', description: 'Builds a srcset. The browser picks using sizes, the viewport and the device pixel ratio — facts this component does not have. srcFor defaults to a ?w= parameter.' },
    { name: 'ratio', type: 'number', description: 'Width over height. Puts the box on the page immediately, so a decoding image never shoves the rest of the page down.' },
    { name: 'fallback / errorLabel', type: 'ReactNode / string', description: 'Rendered in the same box on failure, so a dead URL costs the layout nothing.' },
    { name: 'priority', type: 'boolean', default: 'false', description: 'eager + fetchPriority="high", for the one image above the fold worth blocking on. Everything else stays lazy.' },
    { name: 'onStatusChange', type: "(status: 'loading' | 'loaded' | 'error') => void", description: 'For a gallery that wants to count what has landed.' },
  ],
  demos: [
    {
      title: 'Masks, side by side',
      stack: true,
      code: `<Image src={src} alt="…" ratio={4 / 3} mask="skeleton" />
<Image src={src} alt="…" ratio={4 / 3} mask="shimmer" />
<Image src={src} alt="…" ratio={4 / 3} mask="blur" blurSrc={lqip} />`,
      render: () => (
        <div className="grid w-full gap-3 sm:grid-cols-3">
          {(['skeleton', 'shimmer', 'blur'] as const).map((mask) => (
            <div key={mask} className="space-y-1.5">
              <Image
                src={`${PHOTO}?auto=format&fit=crop&w=600&q=70&m=${mask}`}
                alt="A workstation at dusk"
                ratio={4 / 3}
                mask={mask}
                blurSrc={LQIP}
              />
              <p className="text-muted-foreground/60 px-1 text-[11px]">{mask}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'When the URL is dead',
      stack: true,
      code: `<Image src="/gone.jpg" alt="Missing" ratio={16 / 9} errorLabel="Could not load" />`,
      render: () => (
        <div className="w-full max-w-sm">
          <Image src="/gone.jpg" alt="Missing" ratio={16 / 9} errorLabel="Could not load" />
        </div>
      ),
    },
  ],
}

/* ----------------------------------------------------------- compare slider */

// A CSS filter rather than CDN query parameters: the difference has to be
// unmistakable for the demo to demonstrate anything, and a filter renders the
// same everywhere instead of depending on what the image host supports.
const DEGRADED = 'grayscale brightness-75 contrast-150 blur-[2px] sepia'
const BEFORE_SRC = `${PHOTO}?auto=format&fit=crop&w=800&q=60`
const AFTER_SRC = `${PHOTO}?auto=format&fit=crop&w=800&q=80`

export const compareSliderEntry: ComponentEntry = {
  id: 'compare-slider',
  label: 'Compare Slider',
  isNew: true,
  description:
    'Two images stacked, with a handle that wipes between them. Side-by-side thumbnails make the reader diff from memory; a wipe puts both states in the same pixels, so the difference is the only thing that moves.',
  usage: `import { CompareSlider } from '@/components/ui/compare-slider'

<CompareSlider
  before={<img src="/before.jpg" alt="Original" />}
  after={<img src="/after.jpg" alt="Upscaled" />}
  beforeLabel="Original"
  afterLabel="Upscaled"
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'value', label: 'position', default: 50, min: 0, max: 100, step: 1 },
      { type: 'boolean', prop: 'labels', label: 'labels', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <CompareSlider
          // Uncontrolled, re-keyed on the control: the composer sets the
          // starting position, and the handle still drags from there. Passing
          // `value` with no handler would freeze it, which is a controlled
          // component behaving correctly and looking broken.
          key={Number(state.value)}
          defaultValue={Number(state.value)}
          beforeLabel={state.labels ? 'Original' : undefined}
          afterLabel={state.labels ? 'Restored' : undefined}
          before={<img src={BEFORE_SRC} alt="The original scan, degraded" className={DEGRADED} />}
          after={<img src={AFTER_SRC} alt="After restoration" />}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<CompareSlider\n  defaultValue={${Number(state.value)}}\n${state.labels ? '  beforeLabel="Original"\n  afterLabel="Restored"\n' : ''}  before={<img src="/before.jpg" alt="Original" />}\n  after={<img src="/after.jpg" alt="Restored" />}\n/>`,
  },
  api: [
    { name: 'before / after', type: 'ReactNode', description: 'Any node, not just an img — the component stretches whatever you pass to fill the frame.' },
    { name: 'value / defaultValue / onValueChange', type: 'number (0–100)', description: 'Controlled and uncontrolled.' },
    { name: 'clipping, not resizing', type: 'clip-path: inset()', description: 'The overlay is clipped rather than resized. A resized image re-lays-out and re-samples on every pointer move, which buries subtle differences under scaling artefacts and janks the drag.' },
    { name: 'accessibility', type: 'input[type=range]', description: 'The handle is a real slider in disguise, so arrows, Home and End work and it announces its position. The visible divider is decoration.' },
    { name: 'ratio', type: 'number', default: '16 / 9', description: 'Reserves the box, so nothing shifts while the images decode.' },
  ],
  demos: [
    {
      title: 'Before and after',
      stack: true,
      code: `<CompareSlider before={<img src="/before.jpg" alt="" />} after={<img src="/after.jpg" alt="" />} />`,
      render: () => (
        <div className="w-full max-w-md">
          <CompareSlider
            beforeLabel="Original"
            afterLabel="Restored"
            before={<img src={BEFORE_SRC} alt="The original scan, degraded" className={DEGRADED} />}
            after={<img src={AFTER_SRC} alt="After restoration" />}
          />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------------- masonry */

const TILES = [
  { title: 'Sensor drift', body: 'Three probes reported the same 0.4°C offset after the firmware bump.', lines: 2 },
  { title: 'Retry storm', body: 'The queue drained in 90 seconds once the backoff jitter landed.', lines: 1 },
  { title: 'Cold start', body: 'First request after a deploy pays 800ms. Warming halves it, and the warmer costs more than the latency does.', lines: 3 },
  { title: 'Cache hit rate', body: '94% and steady.', lines: 1 },
  { title: 'Token spend', body: 'The cheap model handles 91% of calls and 11% of the bill, which is the whole argument for routing.', lines: 3 },
  { title: 'Index size', body: 'Two million chunks, 4.1 GB on disk.', lines: 1 },
]

export const masonryEntry: ComponentEntry = {
  id: 'masonry',
  label: 'Masonry',
  isNew: true,
  description:
    'A column layout for items of unequal height, built on CSS columns rather than a JS layout pass — so it packs before paint and reflows on resize for free. Items order top-to-bottom within a column, which is the trade.',
  usage: `import { Masonry } from '@/components/ui/masonry'

<Masonry columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
  {items.map((item) => <Card key={item.id}>{item.body}</Card>)}
</Masonry>`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'columns', label: 'lg columns', default: 3, min: 1, max: 5, step: 1 },
      { type: 'number', prop: 'gap', label: 'gap', default: 4, min: 2, max: 8, step: 2 },
    ],
    render: (state) => (
      <Masonry
        className="w-full"
        columns={{ base: 1, sm: 2, lg: Number(state.columns) }}
        gap={Number(state.gap) as 2 | 4 | 6 | 8}
      >
        {TILES.map((tile) => (
          <div key={tile.title} className="border-border bg-card rounded-2xl border p-4">
            <p className="text-sm font-medium">{tile.title}</p>
            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{tile.body}</p>
          </div>
        ))}
      </Masonry>
    ),
    code: (state: ComposerState) =>
      `<Masonry columns={{ base: 1, sm: 2, lg: ${Number(state.columns)} }} gap={${Number(state.gap)}}>\n  {items.map((item) => (\n    <Card key={item.id}>{item.body}</Card>\n  ))}\n</Masonry>`,
  },
  api: [
    { name: 'columns', type: '{ base?, sm?, md?, lg?, xl? }', default: '{ base: 1, sm: 2, lg: 3 }', description: 'Columns per breakpoint. Written out rather than interpolated, because Tailwind scans source text and `columns-${n}` produces nothing at build time.' },
    { name: 'gap', type: '2 | 3 | 4 | 6 | 8', default: '4', description: 'Applied as both the column gap and the item’s bottom margin — CSS columns have no row gap.' },
    { name: 'reading order', type: 'top-to-bottom per column', description: 'The honest trade for not running a JS layout pass. Fine for a gallery; wrong for a ranked list or a feed, where a plain grid or Kanban is the right answer.' },
    { name: 'break-inside', type: 'avoid', description: 'Applied to every item, so a card is never sliced across a column boundary — which is the default without it.' },
  ],
  demos: [
    {
      title: 'Uneven tiles',
      stack: true,
      code: `<Masonry columns={{ base: 1, sm: 2, lg: 3 }}>{tiles}</Masonry>`,
      render: () => (
        <Masonry className="w-full" columns={{ base: 1, sm: 2, lg: 3 }}>
          {TILES.map((tile) => (
            <div key={tile.title} className="border-border bg-card rounded-2xl border p-4">
              <p className="text-sm font-medium">{tile.title}</p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{tile.body}</p>
            </div>
          ))}
        </Masonry>
      ),
    },
  ],
}
