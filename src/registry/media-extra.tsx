import { useState } from 'react'
import { ImageCropper, type CropRect } from '@/components/ui/image-cropper'
import { PdfViewer } from '@/components/ui/pdf-viewer'
import type { ComponentEntry } from './types'

/* ------------------------------------------------------------ pdf viewer */

/** A tiny real PDF, inline — so the demo works with no network. */
const SAMPLE_PDF =
  'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCAzMDAgMTQ0XS9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNCAwIFI+Pj4+L0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSAxOCBUZgoyMCA4MCBUZAooQXN0cmFseXggVUkgLSBQREYpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTYgMDAwMDAgbiAKMDAwMDAwMDExMSAwMDAwMCBuIAowMDAwMDAwMjM0IDAwMDAwIG4gCjAwMDAwMDAzMDMgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozOTcKJSVFT0YK'

export const pdfViewerEntry: ComponentEntry = {
  id: 'pdf-viewer',
  label: 'PDF Viewer',
  isNew: true,
  description:
    'A PDF in the browser’s own viewer with a toolbar around it. It delegates the rendering on purpose, and always shows a download link — because embedded PDFs fail routinely.',
  usage: `import { PdfViewer } from '@/components/ui/pdf-viewer'

<PdfViewer src="/invoice.pdf" title="Invoice 2026-04" pageCount={3} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'toolbar', label: 'toolbar', default: true },
      { type: 'number', prop: 'height', label: 'height', default: 320, min: 200, max: 560, step: 40 },
    ],
    render: (state) => (
      <PdfViewer
        className="w-full"
        src={SAMPLE_PDF}
        title="Astralyx UI — sample.pdf"
        size="1.2 kB"
        pageCount={1}
        toolbar={Boolean(state.toolbar)}
        height={Number(state.height) || 320}
      />
    ),
    code: (state) =>
      `<PdfViewer\n  src="/invoice.pdf"\n  title="Invoice 2026-04"\n  pageCount={3}\n  toolbar={${Boolean(state.toolbar)}}\n/>`,
  },
  api: [
    { name: 'src', type: 'string', description: 'Framed, so it must be same-origin or serve permissive frame-ancestors. A cross-origin PDF that refuses framing shows the fallback, which is the correct outcome.' },
    { name: 'delegates rendering', type: 'on purpose', description: 'Every browser ships a sandboxed, accessible, keyboard-navigable PDF viewer with search and printing. The alternative is ~350 kB of pdf.js plus a worker to arrive at a worse version of what is installed.' },
    { name: 'when to use pdf.js', type: 'stated', description: 'Extracting text, drawing annotations, rendering a page to an image, a thumbnail rail. This component is honest that it is not that.' },
    { name: 'the fallback', type: 'always visible', description: 'iOS Safari has rendered only the first page, enterprise builds disable the plugin, and Content-Disposition: attachment means it never displays. A viewer without a download link fails silently and looks broken.' },
    { name: 'page / zoom', type: 'open parameters', description: 'A hint, not a standard every viewer implements — Chrome and Firefox honour them, others ignore them.' },
    { name: 'vs FilePreview', type: 'the gap it fills', description: '`FilePreview` dispatches images, audio, text and code, and gives PDFs an honest "no preview". This is the branch it was missing.' },
  ],
  demos: [
    {
      title: 'A document with a toolbar',
      stack: true,
      code: `<PdfViewer src="/invoice.pdf" title="Invoice 2026-04" pageCount={3} />`,
      render: () => (
        <PdfViewer className="w-full" src={SAMPLE_PDF} title="sample.pdf" size="1.2 kB" pageCount={1} height={280} />
      ),
    },
  ],
}

/* --------------------------------------------------------- image cropper */

/** A generated photo-ish image, so the demo needs no network either. */
const SAMPLE_IMAGE =
  'data:image/svg+xml;base64,' +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/><stop offset="60%" stop-color="#7dd3fc"/>
    </linearGradient>
    <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#166534"/><stop offset="100%" stop-color="#052e16"/>
    </linearGradient>
  </defs>
  <rect width="640" height="420" fill="url(#sky)"/>
  <circle cx="500" cy="90" r="44" fill="#fde68a"/>
  <path d="M0 300 L160 190 L280 300 L420 170 L640 320 L640 420 L0 420 Z" fill="url(#hill)"/>
  <path d="M0 350 L200 280 L380 360 L640 300 L640 420 L0 420 Z" fill="#022c22" opacity="0.7"/>
</svg>`)

function CropperDemo({ aspect = 1, round = true }: { aspect?: number; round?: boolean }) {
  const [crop, setCrop] = useState<CropRect | null>(null)
  const [output, setOutput] = useState<string | null>(null)

  return (
    <div className="flex w-full flex-col gap-3 md:flex-row md:items-start">
      <ImageCropper
        className="min-w-0 flex-1"
        src={SAMPLE_IMAGE}
        aspect={aspect}
        round={round}
        onChange={setCrop}
        onCrop={(blob) => setOutput(URL.createObjectURL(blob))}
      />
      <div className="flex w-36 shrink-0 flex-col gap-2">
        <p className="text-muted-foreground text-xs">
          {crop ? `${Math.round(crop.width)}×${Math.round(crop.height)} px` : 'Drag to crop'}
        </p>
        {output && (
          <img
            src={output}
            alt="Cropped result"
            className={round ? 'size-28 rounded-full object-cover' : 'size-28 rounded-md object-cover'}
          />
        )}
      </div>
    </div>
  )
}

export const imageCropperEntry: ComponentEntry = {
  id: 'image-cropper',
  label: 'Image Cropper',
  isNew: true,
  description:
    'The step between picking an image and saving it. The crop is stored in natural image coordinates and exported with toBlob, so it survives a resize and uploads directly.',
  usage: `import { ImageCropper } from '@/components/ui/image-cropper'

<ImageCropper src={src} aspect={1} round onCrop={(blob) => upload(blob)} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'aspect', label: 'aspect', default: '1', options: ['1', '1.7778', 'free'] },
      { type: 'boolean', prop: 'round', label: 'round', default: true },
    ],
    render: (state) => (
      <CropperDemo
        aspect={state.aspect === 'free' ? undefined : Number(state.aspect)}
        round={Boolean(state.round)}
      />
    ),
    code: (state) =>
      `<ImageCropper\n  src={src}\n  ${state.aspect === 'free' ? '' : `aspect={${state.aspect}}\n  `}round={${Boolean(state.round)}}\n  onCrop={(blob) => upload(blob)}\n/>`,
  },
  api: [
    { name: 'value / onChange', type: 'CropRect', description: 'Natural image pixels, not displayed ones. A crop in screen pixels silently means something different after a resize, and produces a different output on a phone than on a desktop.' },
    { name: 'onCrop', type: '(blob, crop) => void', description: '`toBlob`, not `toDataURL`: base64 is a third larger, has to be built as one string, and usually gets converted back to a blob to upload anyway.' },
    { name: 'cross-origin', type: 'taints the canvas', description: '`crossOrigin="anonymous"` is set so a CORS-permissive server works; one that is not will throw at export, and `onError` reports it rather than leaving a dead button.' },
    { name: 'the gap it fills', type: 'dropzone → save', description: 'A kit with a dropzone, a file input and an upload list still cannot set an avatar, because every avatar needs a square and every photo is a rectangle.' },
    { name: 'round', type: 'boolean', default: 'false', description: 'Cosmetic mask for avatars. The export is still a rectangle.' },
    { name: 'handles', type: 'keyboard too', description: 'Arrow keys resize, shift for a larger step — a drag handle that only answers a pointer is unusable without one.' },
  ],
  demos: [
    {
      title: 'Cropping an avatar',
      stack: true,
      code: `<ImageCropper src={src} aspect={1} round onCrop={(blob) => upload(blob)} />`,
      render: () => <CropperDemo />,
    },
  ],
}
