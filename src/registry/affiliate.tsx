import { CampaignCard, type CampaignStatus } from '@/components/ui/campaign-card'
import { PostbackConfig, type Macro } from '@/components/ui/postback-config'
import { RevenueShareTable, type RevenueShareRow } from '@/components/ui/revenue-share-table'
import { UtmBuilder } from '@/components/ui/utm-builder'
import { Badge } from '@/components/ui/badge'
import type { ComponentEntry, ComposerState } from './types'

/* ------------------------------------------------------------ campaign card */

const HISTORY = [820, 910, 1_040, 980, 1_180, 1_260, 1_190, 1_402, 1_530, 1_488, 1_610, 1_744]

export const campaignCardEntry: ComponentEntry = {
  id: 'campaign-card',
  label: 'Campaign Card',
  description:
    'An affiliate offer with its performance. EPC leads, not revenue — £40,000 and £4,000 cannot be ranked without knowing the traffic behind each, and earnings per click is the only comparable figure.',
  usage: `import { CampaignCard } from '@/components/ui/campaign-card'

<CampaignCard name="Summer sale" status="active" clicks={18402} conversions={412} revenue={38210} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'status', label: 'status', options: ['active', 'paused', 'ended', 'pending'], default: 'active' },
      { type: 'boolean', prop: 'history', label: 'sparkline', default: true },
      { type: 'boolean', prop: 'tags', label: 'tags', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <CampaignCard
          name="Summer sale — pricing page"
          advertiser="Northwind Retail"
          status={state.status as CampaignStatus}
          clicks={18_402}
          conversions={412}
          revenue={38_210}
          payout="30% rev share"
          history={state.history ? HISTORY : undefined}
          tags={state.tags ? (
            <>
              <Badge size="sm" color="neutral">EU</Badge>
              <Badge size="sm" color="neutral">mobile</Badge>
            </>
          ) : undefined}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<CampaignCard\n  name="Summer sale"\n  status="${state.status}"\n  clicks={18402}\n  conversions={412}\n  revenue={38210}\n  payout="30% rev share"\n/>`,
  },
  api: [
    { name: 'clicks / conversions / revenue', type: 'number', description: 'The three raw figures. Conversion rate and EPC are derived from them here, so the card can never print a rate that contradicts its own numbers.' },
    { name: 'status', type: 'CampaignStatus', description: "'active' | 'paused' | 'ended' | 'pending'. Anything not active is dimmed, so a paused offer does not read as a live one." },
    { name: 'payout', type: 'ReactNode', description: 'The commission terms in words — "30% rev share", "$25 CPA". Not a number, because these are rarely just a number.' },
    { name: 'history', type: 'number[]', description: 'Optional sparkline. A campaign at £1,700 a day that was at £800 last week is a different proposition from one that was at £3,000.' },
  ],
}

/* ---------------------------------------------------------- postback config */

const MACROS: Macro[] = [
  { token: 'click_id', description: 'Your click identifier. Without it nothing can be attributed.', required: true },
  { token: 'payout', description: 'Commission for the conversion, in the campaign currency.' },
  { token: 'currency', description: 'ISO 4217 code for the payout.' },
  { token: 'offer_id', description: 'The offer the conversion belongs to.' },
  { token: 'status', description: 'approved, pending or rejected.' },
  { token: 'txn_id', description: "Advertiser's transaction reference, for deduplication." },
]

export const postbackConfigEntry: ComponentEntry = {
  id: 'postback-config',
  label: 'Postback Config',
  description:
    'A server-to-server postback URL, validated against its macros. A postback missing {click_id} returns 200 and attributes nothing — this says so before it ships rather than in a reconciliation weeks later.',
  usage: `import { PostbackConfig } from '@/components/ui/postback-config'

<PostbackConfig url={url} onUrlChange={setUrl} macros={macros} status="ok" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'state', label: 'url', options: ['valid', 'missing macro', 'insecure'], default: 'valid' },
      { type: 'select', prop: 'status', label: 'status', options: ['ok', 'failing', 'untested'], default: 'ok' },
      { type: 'boolean', prop: 'method', label: 'method picker', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <PostbackConfig
          macros={MACROS}
          status={state.status as 'ok' | 'failing' | 'untested'}
          lastFired="4 minutes ago"
          onMethodChange={state.method ? () => {} : undefined}
          url={
            state.state === 'missing macro'
              ? 'https://tracker.example.com/pb?payout={payout}'
              : state.state === 'insecure'
                ? 'http://tracker.example.com/pb?cid={click_id}&payout={payout}'
                : 'https://tracker.example.com/pb?cid={click_id}&payout={payout}&cur={currency}'
          }
        />
      </div>
    ),
    code: () => `<PostbackConfig url={url} onUrlChange={setUrl} macros={macros} status="ok" />`,
  },
  api: [
    { name: 'macros', type: 'Macro[]', description: '`{ token, description, required? }`. Clicking one appends it to the URL, which beats retyping braces.' },
    { name: 'validation', type: 'live', description: 'Required macros that are missing, macros that are not in your list, and plain `http://` are each called out separately.' },
    { name: 'url / onUrlChange', type: 'string', description: 'Controlled or uncontrolled. Uncontrolled is fine for a preview; a real config screen owns the value.' },
    { name: 'status / lastFired', type: 'ReactNode', description: 'Delivery health. "Firing, last 4 minutes ago" is the answer to the only question anyone opens this screen with.' },
  ],
}

/* ------------------------------------------------------------- utm builder */

export const utmBuilderEntry: ComponentEntry = {
  id: 'utm-builder',
  label: 'UTM Builder',
  description:
    'Builds a tagged campaign URL. Values are lower-cased with underscores for spaces, because analytics tools treat Summer Sale, summer sale and summer_sale as three separate campaigns and nobody reconciles them later.',
  usage: `import { UtmBuilder } from '@/components/ui/utm-builder'

<UtmBuilder baseUrl="https://example.com/pricing" onUrlChange={setUrl} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'baseUrl', label: 'baseUrl', default: 'https://example.com/pricing?ref=partner' },
      { type: 'text', prop: 'destinationLabel', label: 'destinationLabel', default: 'Destination URL' },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <UtmBuilder
          baseUrl={String(state.baseUrl)}
          destinationLabel={String(state.destinationLabel)}
        />
      </div>
    ),
    code: () => `<UtmBuilder baseUrl="https://example.com/pricing" onUrlChange={setUrl} />`,
  },
  api: [
    { name: 'baseUrl', type: 'string', description: 'The destination. Existing query parameters are preserved — a link that already carries a referral code keeps it.' },
    { name: 'normalisation', type: 'automatic', description: 'Lower-cased, spaces to underscores. Cleaning at the point the link is made is the only place it reliably happens.' },
    { name: 'encoding', type: 'via URL', description: 'Built with `URL`, not string concatenation. A campaign name containing an ampersand would silently truncate every parameter after it.' },
    { name: 'onUrlChange', type: '(url: string) => void', description: 'Fires when the finished URL is copied.' },
  ],
}

/* ------------------------------------------------------ revenue share table */

const SPLIT: RevenueShareRow[] = [
  { id: 's1', party: 'Publisher — nightjar.media', share: 0.35, note: 'Tier 2 rate' },
  { id: 's2', party: 'Sub-affiliate', share: 0.1 },
  { id: 's3', party: 'Network fee', share: 0.05 },
]

export const revenueShareTableEntry: ComponentEntry = {
  id: 'revenue-share-table',
  label: 'Revenue Share Table',
  description:
    'How a payout splits between parties. The unallocated remainder gets a named row instead of leaving the reader to subtract, and a split exceeding 100% is called out rather than quietly rendered.',
  usage: `import { RevenueShareTable } from '@/components/ui/revenue-share-table'

<RevenueShareTable rows={rows} gross={48210} currency="USD" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'gross', label: 'gross', default: 48_210, min: 0, step: 500 },
      { type: 'boolean', prop: 'over', label: 'over-allocate', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <RevenueShareTable
          gross={Number(state.gross)}
          rows={state.over ? [...SPLIT, { id: 's4', party: 'Bonus pool', share: 0.6 }] : SPLIT}
        />
      </div>
    ),
    code: (state: ComposerState) => `<RevenueShareTable rows={rows} gross={${state.gross}} />`,
  },
  api: [
    { name: 'rows', type: 'RevenueShareRow[]', description: '`{ id, party, share, note? }` where share is 0–1.' },
    { name: 'gross', type: 'number', description: 'The figure being split. Each party\'s amount is computed from it, so a percentage can never sit beside an amount that contradicts it.' },
    { name: 'remainder', type: 'named row', description: 'What is left over gets a row of its own. A split reaching only 90% is normal — the house keeps the rest — and it should be visible.' },
    { name: 'over-allocation', type: 'flagged', description: 'Shares totalling more than 100% render as an "Over-allocated" row in the destructive tone. That is a configuration error, not a display problem.' },
  ],
}
