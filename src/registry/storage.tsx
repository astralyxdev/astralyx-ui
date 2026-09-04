import { useState } from 'react'
import { AssetGrid, type Asset } from '@/components/ui/asset-grid'
import { AudioPlayer } from '@/components/ui/audio-player'
import { BackupList, type Backup } from '@/components/ui/backup-list'
import { BucketList, type Bucket } from '@/components/ui/bucket-list'
import { FilePreview } from '@/components/ui/file-preview'
import { ObjectList, type StorageObject } from '@/components/ui/object-list'
import { StorageUsage } from '@/components/ui/storage-usage'
import type { ComponentEntry } from './types'

const PHOTO = 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6'
const AUDIO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'

/* ------------------------------------------------------- storage usage */

const SEGMENTS = [
  { id: 'img', label: 'Images', bytes: 42_000_000_000 },
  { id: 'vid', label: 'Video', bytes: 118_000_000_000 },
  { id: 'db', label: 'Database backups', bytes: 24_000_000_000 },
  { id: 'logs', label: 'Logs', bytes: 900_000_000 },
]

export const storageUsageEntry: ComponentEntry = {
  id: 'storage-usage',
  label: 'Storage Usage',
  isNew: true,
  description:
    'A quota and what is filling it. The bar is scaled to the quota, not to what is used, so free space reads as free space — a bar normalised to the total consumed is always full, which is backwards for a component answering “how much room is left”.',
  usage: `import { StorageUsage } from '@/components/ui/storage-usage'

<StorageUsage segments={segments} quota={200 * 1024 ** 3} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'quota', label: 'quota (GB)', default: 200, min: 100, max: 400, step: 20 },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <StorageUsage segments={SEGMENTS} quota={Number(state.quota) * 1024 ** 3} />
      </div>
    ),
    code: (state) => `<StorageUsage segments={segments} quota={${Number(state.quota)} * 1024 ** 3} />`,
  },
  api: [
    { name: 'segments / quota', type: 'StorageSegment[] / number', description: '{ id, label, bytes, color? }. Omit the quota for an unmetered store and the bar scales to the total instead.' },
    { name: 'over quota', type: 'not clamped', description: 'An object store keeps accepting writes and billing for them; pinning the bar at 100% hides the one number someone is about to be charged for.' },
    { name: 'minimum segment', type: '2px', description: '“Logs are tiny” and “there are no logs” must not render identically.' },
  ],
  demos: [
    { title: 'Comfortable, and over quota', stack: true, code: `<StorageUsage segments={segments} quota={quota} />`,
      render: () => (<div className="flex w-full max-w-xl flex-col gap-3"><StorageUsage segments={SEGMENTS} quota={400 * 1024 ** 3} /><StorageUsage segments={SEGMENTS} quota={150 * 1024 ** 3} /></div>) },
  ],
}

/* ---------------------------------------------------------- bucket list */

const BUCKETS: Bucket[] = [
  { name: 'astralyx-uploads', region: 'eu-west-2', size: 42_000_000_000, objects: 1_204_918, badges: ['versioned'] },
  { name: 'astralyx-public-assets', region: 'eu-west-2', size: 8_400_000_000, objects: 18_402, public: true },
  { name: 'astralyx-db-backups', region: 'eu-west-1', size: 24_000_000_000, objects: 892, badges: ['object-lock'] },
  { name: 'astralyx-terraform-state', region: 'us-east-1', size: 12_000_000, objects: 41, badges: ['versioned'] },
]

export const bucketListEntry: ComponentEntry = {
  id: 'bucket-list',
  label: 'Bucket List',
  isNew: true,
  description:
    'Object-storage buckets, with public access rendered as a warning rather than as one small grey tag among five. Every storage breach of the last decade is a bucket nobody realised was world-readable.',
  usage: `import { BucketList } from '@/components/ui/bucket-list'

<BucketList buckets={buckets} onSelect={open} />`,
  composer: {
    tall: true,
    controls: [],
    render: () => (<div className="w-full max-w-2xl"><BucketList buckets={BUCKETS} onSelect={() => {}} selectedName="astralyx-uploads" /></div>),
    code: () => `<BucketList buckets={buckets} onSelect={open} />`,
  },
  api: [
    { name: 'buckets', type: 'Bucket[]', description: '{ name, region?, size?, objects?, public?, badges?, createdAt? }.' },
    { name: 'public', type: 'boolean', description: 'Drawn as a destructive badge with a warning glyph, not a tag. This is the fact the list exists to surface.' },
    { name: 'region', type: 'string', description: 'Immutable and expensive to get wrong — a bucket in the wrong region is a migration, not a setting.' },
  ],
  demos: [
    { title: 'One bucket is public', stack: true, code: `<BucketList buckets={buckets} />`,
      render: () => (<div className="w-full max-w-2xl"><BucketList buckets={BUCKETS} /></div>) },
  ],
}

/* ---------------------------------------------------------- object list */

const OBJECTS: StorageObject[] = [
  { key: 'avatars/ada.png', size: 84_000, modified: '3 Sep', storageClass: 'STANDARD' },
  { key: 'avatars/marc.png', size: 91_400, modified: '2 Sep', storageClass: 'STANDARD' },
  { key: 'exports/2026-08/ledger.csv', size: 41_800_000, modified: '1 Sep', storageClass: 'STANDARD' },
  { key: 'exports/2026-07/ledger.csv', size: 39_200_000, modified: '1 Aug', storageClass: 'GLACIER', archived: true },
  { key: 'exports/2026-06/ledger.csv', size: 37_100_000, modified: '1 Jul', storageClass: 'GLACIER', archived: true },
  { key: 'README.md', size: 8_420, modified: '4 Sep', storageClass: 'STANDARD' },
]

export const objectListEntry: ComponentEntry = {
  id: 'object-list',
  label: 'Object List',
  isNew: true,
  description:
    'Objects in a bucket, with the prefix hierarchy object stores only pretend to have. There are no folders in S3-shaped storage — `a/b/c.png` is one flat key — so keys deeper than the current prefix collapse into a prefix row with a count.',
  usage: `import { ObjectList } from '@/components/ui/object-list'

<ObjectList objects={objects} onSelect={open} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'searchable', label: 'searchable', default: true }],
    render: (state) => (<div className="w-full max-w-2xl"><ObjectList objects={OBJECTS} searchable={Boolean(state.searchable)} onSelect={() => {}} /></div>),
    code: (state) => `<ObjectList objects={objects} searchable={${Boolean(state.searchable)}} onSelect={open} />`,
  },
  api: [
    { name: 'objects', type: 'StorageObject[]', description: '{ key, size?, modified?, storageClass?, archived? }. Keys are flat; the folders are derived.' },
    { name: 'prefix / onPrefixChange', type: 'string / (next) => void', description: 'Controlled navigation. Uncontrolled by default.' },
    { name: 'archived', type: 'boolean', description: 'Not immediately readable — it needs a restore request and hours. A list showing only size and date makes it look available.' },
    { name: 'searching', type: 'goes flat', description: 'A filter that still hides matches behind folders is not a search.' },
    { name: 'groupByPrefix', type: '(objects, prefix) => { files, folders }', description: 'Exported, for building your own layout on the same grouping.' },
  ],
  demos: [
    { title: 'Browsing prefixes', stack: true, code: `<ObjectList objects={objects} />`,
      render: () => (<div className="w-full max-w-2xl"><ObjectList objects={OBJECTS} /></div>) },
  ],
}

/* ----------------------------------------------------------- asset grid */

const ASSETS: Asset[] = [
  { id: 'a1', name: 'hero-dusk.jpg', src: `${PHOTO}?auto=format&fit=crop&w=400&q=60`, type: 'image/jpeg', size: 842_000, modified: '3 Sep' },
  { id: 'a2', name: 'hero-dawn.jpg', src: `${PHOTO}?auto=format&fit=crop&w=400&q=60&sat=-40`, type: 'image/jpeg', size: 791_000, modified: '3 Sep' },
  { id: 'a3', name: 'launch-clip.mp4', type: 'video/mp4', size: 24_800_000, modified: '2 Sep' },
  { id: 'a4', name: 'theme.mp3', type: 'audio/mpeg', size: 4_100_000, modified: '1 Sep' },
  { id: 'a5', name: 'gone.png', src: '/does-not-exist.png', type: 'image/png', size: 12_000, modified: '18 Aug' },
  { id: 'a6', name: 'brief.pdf', type: 'application/pdf', size: 402_000, modified: '12 Aug' },
]

function AssetGridDemo({ single = false }: { single?: boolean }) {
  const [picked, setPicked] = useState<string[]>(['a1'])
  return <AssetGrid className="w-full" assets={ASSETS} value={picked} onValueChange={setPicked} single={single} />
}

export const assetGridEntry: ComponentEntry = {
  id: 'asset-grid',
  label: 'Asset Grid',
  isNew: true,
  description:
    'A media library as a selectable grid, built on this kit’s Image so every tile gets a placeholder, a reserved box and a failure state. A broken asset stays in the grid — it is exactly the one someone came to find and replace.',
  usage: `import { AssetGrid } from '@/components/ui/asset-grid'

<AssetGrid assets={assets} value={selected} onValueChange={setSelected} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'single', label: 'single select', default: false }],
    render: (state) => <AssetGridDemo single={Boolean(state.single)} />,
    code: (state) => `<AssetGrid\n  assets={assets}\n  value={selected}\n  onValueChange={setSelected}\n  single={${Boolean(state.single)}}\n/>`,
  },
  api: [
    { name: 'assets', type: 'Asset[]', description: '{ id, src?, name, type?, size?, modified?, meta? }. No src falls back to a glyph for the MIME type.' },
    { name: 'value / onValueChange', type: 'string[] / (next) => void', description: 'Controlled selection. Omit both for a read-only library; the tiles then call onOpen instead.' },
    { name: 'broken assets', type: 'kept and marked', description: 'A library that hides failures makes a rotted URL invisible while its reference is still live in production.' },
    { name: 'minTile / ratio', type: 'number', description: 'The grid is auto-fill, so tiles reflow to the container rather than to a fixed column count.' },
  ],
  demos: [
    { title: 'Picking assets, one of them broken', stack: true, code: `<AssetGrid assets={assets} value={selected} onValueChange={setSelected} />`,
      render: () => <AssetGridDemo /> },
  ],
}

/* --------------------------------------------------------- file preview */

const SAMPLE_TEXT = `id,email,plan,seats,created_at
cus_8812,ada@example.com,team,12,2026-03-14
cus_8813,marc@example.com,pro,3,2026-04-02
cus_8814,iris@example.com,team,8,2026-05-19`

export const filePreviewEntry: ComponentEntry = {
  id: 'file-preview',
  label: 'File Preview',
  isNew: true,
  description:
    'One file rendered as whatever it actually is — image, text, audio, or an honest “no preview” panel. The MIME type decides, never the extension: a .png served as text/html is the oldest upload attack there is.',
  usage: `import { FilePreview } from '@/components/ui/file-preview'

<FilePreview file={file} onDownload={download} />`,
  composer: {
    tall: true,
    controls: [{ type: 'select', prop: 'kind', label: 'file', options: ['image', 'text', 'audio', 'binary'], default: 'image' }],
    render: (state) => {
      const file =
        state.kind === 'text'
          ? { name: 'customers.csv', type: 'text/csv', size: 8_420, text: SAMPLE_TEXT, language: 'text' }
          : state.kind === 'audio'
            ? { name: 'theme.mp3', type: 'audio/mpeg', size: 4_100_000, url: AUDIO }
            : state.kind === 'binary'
              ? { name: 'archive.tar.zst', type: 'application/zstd', size: 184_000_000 }
              : { name: 'hero-dusk.jpg', type: 'image/jpeg', size: 842_000, url: `${PHOTO}?auto=format&fit=crop&w=800&q=70` }
      return (<div className="w-full max-w-xl"><FilePreview file={file} onDownload={() => {}} /></div>)
    },
    code: (state) => `<FilePreview\n  file={{ name: '…', type: '${state.kind === 'text' ? 'text/csv' : state.kind === 'audio' ? 'audio/mpeg' : state.kind === 'binary' ? 'application/zstd' : 'image/jpeg'}', … }}\n  onDownload={download}\n/>`,
  },
  api: [
    { name: 'file', type: 'PreviewFile', description: '{ name, type?, size?, url?, text?, language? }. `text` is already fetched — this renders, it does not load.' },
    { name: 'type over extension', type: 'previewKind', description: 'The store’s MIME type decides. The extension is consulted only when there is no type at all, never as an override.' },
    { name: 'maxChars', type: 'number', default: '20_000', description: 'A 40MB log rendered into the DOM freezes the tab, and a preview only has to answer whether you want the file.' },
    { name: 'audio / video', type: 'real elements', description: 'Audio uses this kit’s AudioPlayer; video uses a native <video>, which brings buffering, captions and OS controls with it.' },
  ],
  demos: [
    { title: 'A text file', stack: true, code: `<FilePreview file={{ name: 'customers.csv', type: 'text/csv', text }} />`,
      render: () => (<div className="w-full max-w-xl"><FilePreview file={{ name: 'customers.csv', type: 'text/csv', size: 8_420, text: SAMPLE_TEXT }} onDownload={() => {}} /></div>) },
    { title: 'Something with no preview', stack: true, code: `<FilePreview file={{ name: 'archive.tar.zst', type: 'application/zstd' }} />`,
      render: () => (<div className="w-full max-w-xl"><FilePreview file={{ name: 'archive.tar.zst', type: 'application/zstd', size: 184_000_000 }} onDownload={() => {}} /></div>) },
  ],
}

/* --------------------------------------------------------- audio player */

export const audioPlayerEntry: ComponentEntry = {
  id: 'audio-player',
  label: 'Audio Player',
  isNew: true,
  description:
    'A player built on the real <audio> element, so buffering, codecs, media keys, the OS lock screen and Bluetooth controls all keep working. State is read back off the element rather than mirrored, so anything else touching playback stays in sync.',
  usage: `import { AudioPlayer } from '@/components/ui/audio-player'

<AudioPlayer src="/theme.mp3" title="Theme" artist="Astralyx" peaks={peaks} />`,
  composer: {
    controls: [
      { type: 'boolean', prop: 'peaks', label: 'waveform', default: true },
      { type: 'boolean', prop: 'skip', label: 'skip buttons', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <AudioPlayer
          src={AUDIO}
          title="For bigger joyrides"
          artist="Sample audio"
          showSkip={Boolean(state.skip)}
          peaks={
            state.peaks
              ? Array.from({ length: 64 }, (_, i) => 0.25 + Math.abs(Math.sin(i / 3.1)) * 0.7)
              : undefined
          }
        />
      </div>
    ),
    code: (state) => `<AudioPlayer\n  src="/theme.mp3"\n  title="Theme"\n  artist="Astralyx"\n  showSkip={${Boolean(state.skip)}}\n${state.peaks ? '  peaks={peaks}\n' : ''}/>`,
  },
  api: [
    { name: 'src / title / artist', type: 'string / ReactNode', description: 'The element does the playing; this draws the surface over it.' },
    { name: 'peaks', type: 'number[]', description: 'Precomputed amplitudes 0–1, drawn behind the scrubber. Computing them here would mean decoding the whole file on the main thread before the first frame.' },
    { name: 'scrubbing', type: 'input[type=range]', description: 'Keyboard seeking, page-up jumps and screen-reader announcement are native. `timeupdate` is suspended while dragging, or playback yanks the thumb out of your hand.' },
    { name: 'state', type: 'read from the element', description: 'Every listener reads back off <audio>, so a media key or the OS lock screen keeps this UI correct without going through it.' },
    { name: 'skipBy / showSkip', type: 'number / boolean', description: 'Seconds a skip button moves, and whether they render at all.' },
  ],
  demos: [
    { title: 'With a waveform', stack: true, code: `<AudioPlayer src={src} title="Theme" peaks={peaks} />`,
      render: () => (<div className="w-full max-w-xl"><AudioPlayer src={AUDIO} title="For bigger joyrides" artist="Sample audio" peaks={Array.from({ length: 64 }, (_, i) => 0.25 + Math.abs(Math.sin(i / 3.1)) * 0.7)} /></div>) },
    { title: 'Bare', stack: true, code: `<AudioPlayer src={src} showSkip={false} />`,
      render: () => (<div className="w-full max-w-xl"><AudioPlayer src={AUDIO} title="For bigger joyrides" showSkip={false} /></div>) },
  ],
}

/* --------------------------------------------------------- backup list */

const BACKUPS: Backup[] = [
  { id: 'b1', createdAt: '4 Sep 03:00', size: 8_400_000_000, kind: 'full', verified: true, status: 'complete' },
  { id: 'b2', createdAt: '3 Sep 03:00', size: 412_000_000, kind: 'incremental', status: 'complete' },
  { id: 'b3', createdAt: '2 Sep 03:00', size: 398_000_000, kind: 'incremental', status: 'complete' },
  { id: 'b4', createdAt: '1 Sep 03:00', kind: 'incremental', status: 'failed', meta: 'Ran out of disk on the backup host.' },
]

export const backupListEntry: ComponentEntry = {
  id: 'backup-list',
  label: 'Backup List',
  isNew: true,
  description:
    'Snapshots, and whether any of them would actually restore. A backup nobody has restored is a hypothesis, so an untested one is drawn as a warning rather than as a success.',
  usage: `import { BackupList } from '@/components/ui/backup-list'

<BackupList backups={backups} newestAge="6 hours ago" onRestore={restore} />`,
  composer: {
    tall: true,
    controls: [],
    render: () => (<div className="w-full max-w-2xl"><BackupList backups={BACKUPS} newestAge="6 hours ago" onRestore={() => {}} /></div>),
    code: () => `<BackupList backups={backups} newestAge="6 hours ago" onRestore={restore} />`,
  },
  api: [
    { name: 'backups', type: 'Backup[]', description: '{ id, createdAt, size?, kind?, verified?, status?, meta? }. `createdAt` is pre-formatted.' },
    { name: 'verified', type: 'boolean', description: 'A restore has actually been tested. Unverified is a warning, because the failure mode of backups is finding out at the worst moment that they have been empty for a month.' },
    { name: 'newestAge', type: 'ReactNode', description: 'Stated in the header rather than left to be worked out from timestamps — “how much data would we lose” is the only question anyone brings here.' },
    { name: 'no backups', type: 'destructive', description: 'An empty list is rendered as a failure, not as an empty box.' },
  ],
  demos: [
    { title: 'One failed, two unverified', stack: true, code: `<BackupList backups={backups} onRestore={restore} />`,
      render: () => (<div className="w-full max-w-2xl"><BackupList backups={BACKUPS} newestAge="6 hours ago" onRestore={() => {}} /></div>) },
  ],
}
