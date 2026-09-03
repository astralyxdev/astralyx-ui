import { Avatar, AvatarBadge, AvatarGroup, AvatarWithBadge } from '@/components/ui/avatar'
import type { ComponentEntry, ComposerState } from './types'

const SIZES = ['xs', 'sm', 'default', 'lg', 'xl'] as const
const SHAPES = ['circle', 'rounded'] as const

const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%236366f1"/><stop offset="1" stop-color="%2306b6d4"/></linearGradient></defs><rect width="96" height="96" fill="url(%23g)"/></svg>`,
  )

function composeAvatar(state: ComposerState) {
  const attrs: string[] = [`name="${state.name}"`]
  if (state.src) attrs.push('src={photo}')
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.shape !== 'circle') attrs.push(`shape="${state.shape}"`)
  return `<Avatar ${attrs.join(' ')} />`
}

export const avatarEntry: ComponentEntry = {
  id: 'avatar',
  label: 'Avatar',
  description:
    'An image standing in for a person, with a fallback that always renders. Initials are derived from the name, and a broken image falls through to them.',
  usage: `import { Avatar, AvatarBadge, AvatarGroup, AvatarWithBadge } from '@/components/ui/avatar'

<Avatar src={user.photo} name="Ada Lovelace" />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'select', prop: 'shape', label: 'shape', options: SHAPES, default: 'circle' },
      { type: 'text', prop: 'name', label: 'name', default: 'Ada Lovelace' },
      { type: 'boolean', prop: 'src', label: 'src', default: false },
    ],
    render: (state) => (
      <Avatar
        size={String(state.size) as (typeof SIZES)[number]}
        shape={String(state.shape) as (typeof SHAPES)[number]}
        name={String(state.name)}
        src={state.src ? PHOTO : undefined}
      />
    ),
    code: composeAvatar,
  },
  api: [
    {
      name: 'AvatarBadge position',
      type: "'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'",
      default: "'bottom-right'",
      description: 'Corner to pin to. The short forms `tr`, `tl`, `br` and `bl` are accepted too.',
    },
    {
      name: 'AvatarBadge tone',
      type: "'online' | 'away' | 'busy' | 'offline' | 'primary' | 'neutral'",
      default: "'online'",
      description: 'Presence colour, or a filled chip when the badge carries content.',
    },
    {
      name: 'AvatarBadge ring',
      type: 'boolean',
      default: 'true',
      description: 'Ring in the surface colour. Not decoration — a dot the same colour as what sits behind it disappears.',
    },
    {
      name: 'AvatarBadge label',
      type: 'string',
      description: 'Accessible name. Without one a bare status dot is announced as nothing, so it is marked aria-hidden instead.',
    },
    {
      name: 'AvatarWithBadge',
      type: 'component',
      description: 'The positioning wrapper. Avatar clips its own overflow to round the image, so a badge inside it would be cut off at exactly the corner it sits on.',
    },
    { name: 'src', type: 'string', description: 'Image URL. On a load error the component falls back to initials instead of showing a broken image.' },
    { name: 'name', type: 'string', description: 'Alt text, and the source of the derived initials. "Ada Lovelace" becomes "AL".' },
    { name: 'fallback', type: 'ReactNode', description: 'Overrides the derived initials.' },
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Footprint, with the initials scaled to match.' },
    { name: 'shape', type: SHAPES.map((s) => `'${s}'`).join(' | '), default: "'circle'", description: 'Circle, or the kit squircle.' },
    { name: 'AvatarGroup max', type: 'number', description: 'Show this many, then a +N chip for the rest.' },
  ],
  demos: [
    {
      title: 'Badges and positions',
      code: `<AvatarWithBadge>
  <Avatar name="Ada Lovelace" />
  <AvatarBadge tone="online" label="Online" />
</AvatarWithBadge>

<AvatarWithBadge>
  <Avatar name="Grace Hopper" />
  <AvatarBadge position="tr" tone="primary">3</AvatarBadge>
</AvatarWithBadge>`,
      render: () => (
        <div className="flex flex-wrap items-center gap-4">
          <AvatarWithBadge>
            <Avatar name="Ada Lovelace" />
            <AvatarBadge tone="online" label="Online" />
          </AvatarWithBadge>
          <AvatarWithBadge>
            <Avatar name="Grace Hopper" />
            <AvatarBadge tone="away" label="Away" position="tr" />
          </AvatarWithBadge>
          <AvatarWithBadge>
            <Avatar name="Alan Turing" />
            <AvatarBadge tone="busy" label="Busy" position="tl" />
          </AvatarWithBadge>
          <AvatarWithBadge>
            <Avatar name="Katherine Johnson" />
            <AvatarBadge tone="offline" label="Offline" position="bl" />
          </AvatarWithBadge>
          <AvatarWithBadge>
            <Avatar name="Margaret Hamilton" size="lg" />
            <AvatarBadge position="tr" tone="primary" size="lg" label="3 notifications">
              3
            </AvatarBadge>
          </AvatarWithBadge>
        </div>
      ),
    },
    {
      title: 'Sizes',
      code: `<Avatar size="xs" name="Ada Lovelace" />
<Avatar size="xl" name="Ada Lovelace" />`,
      render: () => (
        <>
          {SIZES.map((size) => (
            <Avatar key={size} size={size} name="Ada Lovelace" />
          ))}
        </>
      ),
    },
    {
      title: 'Image, fallback, and a broken URL',
      code: `<Avatar src={photo} name="Ada Lovelace" />
<Avatar name="Grace Hopper" />
<Avatar src="/missing.png" name="Alan Turing" />`,
      render: () => (
        <>
          <Avatar src={PHOTO} name="Ada Lovelace" />
          <Avatar name="Grace Hopper" />
          <Avatar src="/definitely-missing.png" name="Alan Turing" />
          <Avatar fallback="?" />
        </>
      ),
    },
    {
      title: 'Shapes',
      code: `<Avatar shape="circle" name="Ada Lovelace" />
<Avatar shape="rounded" name="Ada Lovelace" />`,
      render: () => (
        <>
          <Avatar shape="circle" name="Ada Lovelace" src={PHOTO} />
          <Avatar shape="rounded" name="Ada Lovelace" src={PHOTO} />
        </>
      ),
    },
    {
      title: 'Group',
      code: `<AvatarGroup max={3}>
  <Avatar name="Ada Lovelace" />
  <Avatar name="Grace Hopper" />
  <Avatar name="Alan Turing" />
  <Avatar name="Katherine Johnson" />
</AvatarGroup>`,
      render: () => (
        <AvatarGroup max={3}>
          <Avatar name="Ada Lovelace" src={PHOTO} />
          <Avatar name="Grace Hopper" />
          <Avatar name="Alan Turing" />
          <Avatar name="Katherine Johnson" />
          <Avatar name="Margaret Hamilton" />
        </AvatarGroup>
      ),
    },
  ],
}
