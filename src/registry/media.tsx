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
