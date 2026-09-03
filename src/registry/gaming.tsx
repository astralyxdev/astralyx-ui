import { useState } from 'react'
import { BetInput } from '@/components/ui/bet-input'
import { LeaderboardTable, type LeaderboardEntry } from '@/components/ui/leaderboard'
import { MultiplierChart } from '@/components/ui/multiplier-chart'
import { OddsDisplay, type OddsFormat } from '@/components/ui/odds-display'
import { RoundHistory, type Round } from '@/components/ui/round-history'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000)

/* ----------------------------------------------------------------- bet input */

function BetDemo() {
  const [stake, setStake] = useState(1_000)
  return (
    <div className="w-full max-w-xs">
      <BetInput stake={stake} onStakeChange={setStake} balance={24_750} odds={2.4} min={100} max={50_000} onPlace={() => {}} />
    </div>
  )
}

export const betInputEntry: ComponentEntry = {
  id: 'bet-input',
  label: 'Bet Input',
  description:
    'A stake field with quick multipliers and a live return. Stakes are integer minor units and the max is clamped to the balance, so "all in" cannot stake money that is not there.',
  usage: `import { BetInput } from '@/components/ui/bet-input'

<BetInput stake={stake} onStakeChange={setStake} balance={balance} odds={2.4} onPlace={place} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'odds', label: 'odds', default: 2.4, min: 1.01, max: 20, step: 0.1 },
      { type: 'number', prop: 'balance', label: 'balance (minor)', default: 24_750, min: 0, step: 1000 },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xs">
        <BetInput
          stake={1_000}
          balance={Number(state.balance)}
          odds={Number(state.odds)}
          min={100}
          max={50_000}
          disabled={Boolean(state.disabled)}
          onPlace={() => {}}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<BetInput\n  stake={stake}\n  onStakeChange={setStake}\n  balance={${state.balance}}\n  odds={${state.odds}}\n  onPlace={place}\n/>`,
  },
  api: [
    { name: 'stake', type: 'number', description: 'Minor units. Controlled, because the surrounding game usually owns it.' },
    { name: 'balance', type: 'number', description: 'Caps every quick action. Half and max are computed against it, so they can never exceed the funds available.' },
    { name: 'odds', type: 'number', description: 'Decimal odds. The potential return is shown live beneath the field — nobody should be doing that multiplication in their head.' },
    { name: 'min / max', type: 'number', description: 'Table limits. Enforced at the control rather than rejected on submit.' },
    { name: 'onPlace', type: '() => void', description: 'Renders the place button. Omit for a stake field embedded in a larger slip.' },
  ],
  demos: [
    { title: 'Stake with quick actions', code: `const [stake, setStake] = useState(1000)\n\n<BetInput stake={stake} onStakeChange={setStake} balance={24750} odds={2.4} onPlace={place} />`, render: () => <BetDemo /> },
  ],
}

/* -------------------------------------------------------------- odds display */

export const oddsDisplayEntry: ComponentEntry = {
  id: 'odds-display',
  label: 'Odds Display',
  description:
    'A selectable price in decimal, fractional or American. Decimal is the source of truth and the others are derived, so a format switch can never change what the bet actually pays.',
  usage: `import { OddsDisplay } from '@/components/ui/odds-display'

<OddsDisplay label="Arsenal" odds={2.4} format="fractional" onSelect={select} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'format', label: 'format', options: ['decimal', 'fractional', 'american'], default: 'decimal' },
      { type: 'number', prop: 'odds', label: 'odds', default: 2.4, min: 1.01, max: 20, step: 0.05 },
      { type: 'boolean', prop: 'selected', label: 'selected', default: false },
      { type: 'boolean', prop: 'suspended', label: 'suspended', default: false },
      { type: 'boolean', prop: 'moved', label: 'price moved', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="flex gap-2">
        <OddsDisplay
          label="Arsenal"
          odds={Number(state.odds)}
          previousOdds={state.moved ? 2.1 : undefined}
          format={state.format as OddsFormat}
          selected={Boolean(state.selected)}
          suspended={Boolean(state.suspended)}
          onSelect={() => {}}
        />
        <OddsDisplay label="Draw" odds={3.6} format={state.format as OddsFormat} onSelect={() => {}} />
      </div>
    ),
    code: (state: ComposerState) =>
      `<OddsDisplay label="Arsenal" odds={${state.odds}} format="${state.format}" onSelect={select} />`,
  },
  api: [
    { name: 'odds', type: 'number', description: 'Decimal odds — 2.5 returns two and a half times the stake. Every other format is computed from this one.' },
    { name: 'format', type: 'OddsFormat', default: "'decimal'", description: "'decimal' | 'fractional' | 'american'. Fractional reduces to a readable denominator rather than an exact but absurd one." },
    { name: 'previousOdds', type: 'number', description: 'Draws a movement arrow. A price drifting out is information a punter acts on.' },
    { name: 'suspended', type: 'boolean', description: 'Disables selection and says so. A suspended price that merely looks unselectable produces angry support tickets.' },
    { name: 'element', type: 'button', description: 'A real button, so selection is keyboard-reachable and announces its pressed state.' },
  ],
}

/* -------------------------------------------------------------- leaderboard */

const PLAYERS: LeaderboardEntry[] = [
  { id: 'p1', name: 'nightjar', score: 184_920, previousRank: 2 },
  { id: 'p2', name: 'quillon', score: 172_338, previousRank: 1 },
  { id: 'p3', name: 'saltmarsh', score: 168_004, previousRank: 3 },
  { id: 'p4', name: 'venn', score: 149_112, previousRank: 7 },
  { id: 'p5', name: 'okra', score: 141_806, previousRank: 4 },
  { id: 'p6', name: 'brackenfell', score: 138_221, previousRank: 6 },
  { id: 'p7', name: 'tolliver', score: 131_990, previousRank: 5 },
  { id: 'p8', name: 'meridian', score: 128_450, previousRank: 9 },
  { id: 'p9', name: 'ashgrove', score: 122_007, previousRank: 8 },
  { id: 'p10', name: 'castellan', score: 118_664, previousRank: 12 },
  { id: 'p11', name: 'you', score: 41_220, previousRank: 61, isCurrentUser: true },
]

export const leaderboardEntry: ComponentEntry = {
  id: 'leaderboard',
  label: 'Leaderboard',
  description:
    'Ranked scores with movement since the last period, and the current user pinned even when they are nowhere near the top. A board you cannot find yourself on is a board you stop opening.',
  usage: `import { LeaderboardTable } from '@/components/ui/leaderboard'

<LeaderboardTable entries={entries} limit={10} />`,
  composer: {
    tall: true,
    controls: [{ type: 'number', prop: 'limit', label: 'rows', default: 10, min: 3, max: 11, step: 1 }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <LeaderboardTable entries={PLAYERS} limit={Number(state.limit)} scoreLabel="Points" />
      </div>
    ),
    code: (state: ComposerState) => `<LeaderboardTable entries={entries} limit={${state.limit}} />`,
  },
  api: [
    { name: 'entries', type: 'LeaderboardEntry[]', description: '`{ id, name, score, avatar?, previousRank?, isCurrentUser?, meta? }`. Sorted here, so a caller cannot ship a board that is out of order.' },
    { name: 'ties', type: 'shared rank', description: 'Equal scores share a rank and the next rank skips, which is how every sport does it. Two players in "3rd" are not 3rd and 4th.' },
    { name: 'isCurrentUser', type: 'boolean', description: 'Highlights the row, and pins it below the cut with its true rank when it falls outside `limit`.' },
    { name: 'previousRank', type: 'number', description: 'Drives the movement arrow. Absent means new to the board, which is drawn differently from "unchanged".' },
    { name: 'formatScore', type: '(score) => ReactNode', description: 'For points, times, or currency. Defaults to a grouped number.' },
  ],
}

/* --------------------------------------------------------- multiplier chart */

const CURVE = Array.from({ length: 46 }, (_, index) => 1 + (index / 45) ** 2 * 7.4)

export const multiplierChartEntry: ComponentEntry = {
  id: 'multiplier-chart',
  label: 'Multiplier Chart',
  description:
    'The rising curve of a crash-style round. The crash is a state, not an animation that ends — the frozen curve and the final figure stay on screen so a player who looked away still sees what happened.',
  usage: `import { MultiplierChart } from '@/components/ui/multiplier-chart'

<MultiplierChart values={values} current={current} crashed={crashed} cashedOutAt={cashout} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'crashed', label: 'crashed', default: false },
      { type: 'boolean', prop: 'cashedOut', label: 'cashed out', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-lg">
        <MultiplierChart
          values={CURVE}
          current={CURVE[CURVE.length - 1]}
          crashed={Boolean(state.crashed)}
          cashedOutAt={state.cashedOut ? 4.2 : undefined}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<MultiplierChart values={values} current={current}${state.crashed ? ' crashed' : ''}${state.cashedOut ? ' cashedOutAt={4.2}' : ''} />`,
  },
  api: [
    { name: 'values', type: 'number[]', description: 'Samples over the round, starting at 1. The caller drives the tick; the component never runs a timer of its own.' },
    { name: 'current', type: 'number', description: 'The live figure, shown large. Falls back to the last sample.' },
    { name: 'crashed', type: 'boolean', description: 'Freezes the curve and switches to the crash colour. It is a state you stay in, not a flash.' },
    { name: 'cashedOutAt', type: 'number', description: 'Marks where the player got out, so the outcome is legible against the crash point.' },
    { name: 'scale', type: 'auto, non-shrinking', description: 'The vertical range grows with the curve but never shrinks mid-round; a rescaling axis makes a rising line look flat.' },
  ],
}

/* -------------------------------------------------------------- round history */

const ROUNDS: Round[] = [
  { id: 'r1', value: 1.04, at: ago(20) },
  { id: 'r2', value: 8.42, at: ago(96), played: true },
  { id: 'r3', value: 2.11, at: ago(160) },
  { id: 'r4', value: 1.00, at: ago(230) },
  { id: 'r5', value: 3.77, at: ago(300), played: true },
  { id: 'r6', value: 1.52, at: ago(370) },
  { id: 'r7', value: 24.9, at: ago(450) },
  { id: 'r8', value: 1.18, at: ago(520) },
  { id: 'r9', value: 6.03, at: ago(590), played: true },
  { id: 'r10', value: 1.31, at: ago(660) },
]

export const roundHistoryEntry: ComponentEntry = {
  id: 'round-history',
  label: 'Round History',
  description:
    'Recent results as a strip. It carries an explicit note that past rounds do not predict the next one, because a row of results is read as a pattern whether or not one exists.',
  usage: `import { RoundHistory } from '@/components/ui/round-history'

<RoundHistory rounds={rounds} lowBelow={2} highAbove={10} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'lowBelow', label: 'lowBelow', default: 2, min: 1, max: 5, step: 0.5 },
      { type: 'number', prop: 'highAbove', label: 'highAbove', default: 10, min: 2, max: 50, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-lg">
        <RoundHistory
          rounds={ROUNDS}
          lowBelow={Number(state.lowBelow)}
          highAbove={Number(state.highAbove)}
          now={NOW}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<RoundHistory rounds={rounds} lowBelow={${state.lowBelow}} highAbove={${state.highAbove}} />`,
  },
  api: [
    { name: 'rounds', type: 'Round[]', description: '`{ id, value, at?, played?, detail? }`, newest first.' },
    { name: 'lowBelow / highAbove', type: 'number', description: 'Thresholds for the low and high tones. Game-specific, so they are props rather than baked in — 2× is a loss in one game and a win in another.' },
    { name: 'played', type: 'boolean', description: 'Rings the rounds the player took part in, which is the only way to read your own run out of a shared strip.' },
    { name: 'note', type: 'ReactNode', description: 'Overrides the default independence notice. It is rendered by default rather than opt-in.' },
    { name: 'format', type: '(value) => ReactNode', description: 'For scores or currency instead of a multiplier.' },
  ],
}
