import { Button } from '@/components/ui/button'
import { FingerprintDiff, type FingerprintAttribute } from '@/components/ui/fingerprint-diff'
import { FraudVerdict, type Verdict } from '@/components/ui/fraud-verdict'
import { IpCluster, type Cluster } from '@/components/ui/ip-cluster'
import { RiskScore, type RiskFactor } from '@/components/ui/risk-score'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')

/* ---------------------------------------------------------------- risk score */

const FACTORS: RiskFactor[] = [
  { label: 'Payout wallet shared with 3 other accounts', weight: 28 },
  { label: 'Device fingerprint seen on 6 accounts in 24h', weight: 22 },
  { label: 'Sign-up and first withdrawal 11 minutes apart', weight: 17 },
  { label: 'Datacenter IP (AS14061)', weight: 9 },
  { label: 'Verified identity document', weight: -12, detail: 'Passport matched, 2026-08-11' },
]

export const riskScoreEntry: ComponentEntry = {
  id: 'risk-score',
  label: 'Risk Score',
  description:
    'A score with the signals that produced it. The factors are the component, not a detail beside it — an analyst cannot approve or decline on "82", and an unexplained score is the one thing a regulator will ask you to justify.',
  usage: `import { RiskScore } from '@/components/ui/risk-score'

<RiskScore score={82} factors={factors} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'score', label: 'score', default: 82, min: 0, max: 100, step: 1 },
      { type: 'boolean', prop: 'factors', label: 'factors', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <RiskScore
          score={Number(state.score)}
          factors={state.factors ? FACTORS : undefined}
        />
      </div>
    ),
    code: (state: ComposerState) => `<RiskScore score={${state.score}} factors={factors} />`,
  },
  api: [
    { name: 'score', type: 'number', description: 'Clamped to `max`. Yours to compute — the component scores nothing.' },
    { name: 'factors', type: 'RiskFactor[]', description: '`{ label, weight, detail? }`. Negative weights are mitigations and render in the positive tone.' },
    { name: 'bands', type: 'RiskBand[]', description: 'Thresholds and their names. Every band is labelled in words as well as coloured, because this ends up screenshotted into tickets and printed into case files.' },
    { name: 'bar scale', type: 'relative to peak', description: 'Factor bars are drawn against the largest contributor, not against 100, so five small signals still show their shape.' },
    { name: 'role', type: 'meter', description: 'With `aria-valuetext` carrying both the number and the band name.' },
  ],
  demos: [
    { title: 'A high score and a low one', stack: true, code: `<RiskScore score={82} factors={factors} />`,
      render: () => (<div className="flex w-full max-w-md flex-col gap-4"><RiskScore score={82} factors={FACTORS} /><RiskScore score={14} factors={FACTORS.map((f) => ({ ...f, weight: -Math.abs(f.weight) }))} /></div>) },
  ],
}

/* ----------------------------------------------------------- fingerprint diff */

const ATTRIBUTES: FingerprintAttribute[] = [
  { key: 'canvas_hash', left: 'a41f9c22', right: null, significance: 'high' },
  { key: 'webgl_vendor', left: 'Apple Inc.', right: 'Google Inc. (Apple)', significance: 'high' },
  { key: 'user_agent', left: 'Mozilla/5.0 (Macintosh…) Chrome/141', right: 'Mozilla/5.0 (Macintosh…) Chrome/141' },
  { key: 'timezone', left: 'Europe/London', right: 'Europe/Kyiv', significance: 'high' },
  { key: 'languages', left: 'en-GB,en', right: 'en-GB,en' },
  { key: 'screen', left: '3456x2234', right: '3456x2234' },
  { key: 'cpu_cores', left: '12', right: '12' },
  { key: 'memory_gb', left: '18', right: '18' },
  { key: 'touch_points', left: '0', right: '0' },
  { key: 'fonts_hash', left: '7be21044', right: '7be21044' },
]

export const fingerprintDiffEntry: ComponentEntry = {
  id: 'fingerprint-diff',
  label: 'Fingerprint Diff',
  description:
    'Two device fingerprints, with only the differing attributes shown. The question is never what a device looks like — it is what changed between two sessions, and twenty-eight matching rows hide the two that matter.',
  usage: `import { FingerprintDiff } from '@/components/ui/fingerprint-diff'

<FingerprintDiff attributes={attributes} leftLabel="Session A" rightLabel="Session B" />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'matching', label: 'show matching', default: false }],
    render: (state: ComposerState) => (
      <div className="w-full">
        <FingerprintDiff
          attributes={ATTRIBUTES}
          leftLabel="Session 8f21 · 11 Aug"
          rightLabel="Session c904 · 2 Sep"
          defaultShowMatching={Boolean(state.matching)}
        />
      </div>
    ),
    code: () => `<FingerprintDiff attributes={attributes} leftLabel="Session A" rightLabel="Session B" />`,
  },
  api: [
    { name: 'attributes', type: 'FingerprintAttribute[]', description: '`{ key, label?, left, right, significance? }`.' },
    { name: 'missing values', type: 'shown as absent', description: 'A `null` renders as "not reported", never as blank. A fingerprint that stopped reporting its canvas hash is itself a signal — usually an anti-detect browser.' },
    { name: 'significance', type: "'high' | 'normal'", description: 'Marks the attributes worth escalating on. A changed timezone is not a changed WebGL vendor.' },
    { name: 'defaultShowMatching', type: 'boolean', default: 'false', description: 'Matching rows are collapsed behind a count, and always reachable.' },
  ],
  demos: [
    { title: 'Two devices compared', stack: true, code: `<FingerprintDiff attributes={attributes} />`,
      render: () => (<div className="w-full"><FingerprintDiff attributes={ATTRIBUTES} /></div>) },
  ],
}

/* ---------------------------------------------------------------- ip cluster */

const CLUSTERS: Cluster[] = [
  {
    id: 'c1', value: '45.83.220.11', kind: 'ip', network: 'datacenter', location: 'Frankfurt, DE',
    members: [
      { id: 'u1', label: 'user_88213', detail: '£4,120', focus: true },
      { id: 'u2', label: 'user_88219', detail: '£3,980', status: 'banned' },
      { id: 'u3', label: 'user_88244', detail: '£4,010', status: 'flagged' },
      { id: 'u4', label: 'user_88301', detail: '£3,870' },
      { id: 'u5', label: 'user_88355', detail: '£4,200', status: 'banned' },
    ],
  },
  {
    id: 'c2', value: 'fp_7be21044c9', kind: 'device', location: 'Chrome 141 · macOS',
    members: [
      { id: 'u1', label: 'user_88213', focus: true },
      { id: 'u6', label: 'user_90112' },
    ],
  },
  {
    id: 'c3', value: '92.40.11.7', kind: 'ip', network: 'mobile', location: 'Manchester, UK',
    members: [
      { id: 'u1', label: 'user_88213', focus: true },
      { id: 'u7', label: 'user_71004' },
      { id: 'u8', label: 'user_66392' },
    ],
  },
]

export const ipClusterEntry: ComponentEntry = {
  id: 'ip-cluster',
  label: 'IP Cluster',
  description:
    'Accounts grouped by a shared address or device. The shape is the finding: one node fanning out to eight accounts is multi-accounting, eight accounts each on their own address is a shared ISP.',
  usage: `import { IpCluster } from '@/components/ui/ip-cluster'

<IpCluster clusters={clusters} onSelect={openAccount} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'clickable', label: 'clickable members', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <IpCluster clusters={CLUSTERS} onSelect={state.clickable ? () => {} : undefined} />
      </div>
    ),
    code: () => `<IpCluster clusters={clusters} onSelect={openAccount} />`,
  },
  api: [
    { name: 'clusters', type: 'Cluster[]', description: '`{ id, value, kind?, network?, location?, members }`. Sorted largest-first, because this is a queue and the worst cluster belongs at the top.' },
    { name: 'network', type: "'residential' | 'mobile' | 'datacenter' | 'vpn'", description: 'Weighs the evidence. Carrier-grade NAT puts thousands of unrelated subscribers behind one mobile address — the label is what stops someone banning an apartment block.' },
    { name: 'members[].focus', type: 'boolean', description: 'Marks the account under review so it stands out inside its own cluster.' },
    { name: 'onSelect', type: '(member, cluster) => void', description: 'Makes members real buttons. Omit for a read-only view.' },
  ],
  demos: [
    { title: 'Accounts sharing an address', stack: true, code: `<IpCluster clusters={clusters} />`,
      render: () => (<div className="w-full"><IpCluster clusters={CLUSTERS} /></div>) },
  ],
}

/* -------------------------------------------------------------- fraud verdict */

export const fraudVerdictEntry: ComponentEntry = {
  id: 'fraud-verdict',
  label: 'Fraud Verdict',
  description:
    'The decision at the end of a review: what was decided, on what basis, by whom. A settled verdict offers to reopen rather than accept a second one, because two conflicting verdicts on one case is the failure this shape prevents.',
  usage: `import { FraudVerdict } from '@/components/ui/fraud-verdict'

<FraudVerdict verdict="declined" reasons={reasons} decidedBy="A. Okafor" decidedAt={at} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'verdict', label: 'verdict', options: ['pending', 'approved', 'declined', 'review'], default: 'declined' },
      { type: 'boolean', prop: 'automated', label: 'automated', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <FraudVerdict
          verdict={state.verdict as Verdict}
          subject="Withdrawal po_8fQ21x · £4,120 · user_88213"
          automated={Boolean(state.automated)}
          decidedBy={state.automated ? 'rule: shared-wallet-v3' : 'A. Okafor'}
          decidedAt={NOW}
          onReopen={() => {}}
          reasons={[
            'Payout wallet shared with three other accounts',
            'Sign-up to first withdrawal in 11 minutes',
            'Identity document verified — passport, 11 Aug',
          ]}
          actions={
            <>
              <Button size="sm" variant="colored" color="destructive">Decline</Button>
              <Button size="sm" variant="secondary">Approve</Button>
              <Button size="sm" variant="ghost">Escalate</Button>
            </>
          }
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<FraudVerdict\n  verdict="${state.verdict}"\n  reasons={reasons}\n  decidedBy="A. Okafor"\n  decidedAt={at}\n/>`,
  },
  api: [
    { name: 'verdict', type: 'Verdict', description: "'approved' | 'declined' | 'review' | 'pending'. Pending shows the actions; anything else shows who decided and when." },
    { name: 'automated', type: 'boolean', description: 'Distinguishes a rule or model from a colleague. An analyst overriding a decision needs to know which they are disagreeing with.' },
    { name: 'reasons', type: 'ReactNode[]', description: 'Listed, not summarised. These get quoted in appeals and chargeback responses, and a paraphrase is not quotable.' },
    { name: 'onReopen', type: '() => void', description: 'The only way past a settled verdict, so a case cannot quietly acquire two.' },
    { name: 'actions', type: 'ReactNode', description: 'Rendered only while pending.' },
  ],
  demos: [
    { title: 'Every verdict', stack: true, code: `<FraudVerdict verdict="declined" subject="Withdrawal #8814" reasons={reasons} />`,
      render: () => (<div className="flex w-full max-w-md flex-col gap-3"><FraudVerdict verdict="approved" subject="Withdrawal #8812" reasons={['Nothing matched a rule.']} automated decidedAt={NOW} /><FraudVerdict verdict="review" subject="Withdrawal #8813" reasons={['Payout wallet is shared with two other accounts.', 'Account is 4 hours old.']} decidedAt={NOW} onReopen={() => {}} /><FraudVerdict verdict="declined" subject="Withdrawal #8814" reasons={['Device fingerprint matches a banned account.']} decidedBy="risk-team" decidedAt={NOW} /></div>) },
  ],
}
