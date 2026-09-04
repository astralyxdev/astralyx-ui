import { useState } from 'react'
import { CandlestickChart, type Candle } from '@/components/ui/candlestick-chart'
import { ChainSelect, type Chain } from '@/components/ui/chain-select'
import { GasTracker, type GasTier } from '@/components/ui/gas-tracker'
import { MarketTable, type Market } from '@/components/ui/market-table'
import { NftCard } from '@/components/ui/nft-card'
import { OrderBook, type OrderLevel } from '@/components/ui/order-book'
import { PriceTicker } from '@/components/ui/price-ticker'
import { SeedPhrase } from '@/components/ui/seed-phrase'
import { StakingPanel } from '@/components/ui/staking-panel'
import { SwapPanel } from '@/components/ui/swap-panel'
import { BridgeStatus } from '@/components/ui/bridge-status'
import { GovernanceProposal } from '@/components/ui/governance-proposal'
import { LiquidityPosition } from '@/components/ui/liquidity-position'
import { MintPanel } from '@/components/ui/mint-panel'
import { NetworkStatus } from '@/components/ui/network-status'
import { PortfolioBalance } from '@/components/ui/portfolio-balance'
import { TokenAmount } from '@/components/ui/token-amount'
import { TokenSelect } from '@/components/ui/token-select'
import { TransactionList } from '@/components/ui/transaction-list'
import { ValidatorList } from '@/components/ui/validator-list'
import { TokenApprovals, type Approval } from '@/components/ui/token-approvals'
import { TransactionStatus } from '@/components/ui/transaction-status'
import { WalletAddress } from '@/components/ui/wallet-address'
import { WalletConnect } from '@/components/ui/wallet-connect'
import { Avatar } from '@/components/ui/avatar'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)
const ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'

/* ------------------------------------------------------------ token amount */

export const tokenAmountEntry: ComponentEntry = {
  id: 'token-amount',
  label: 'Token Amount',
  description:
    'A balance formatted from base units without ever touching a float. 1 ETH is 10¹⁸ wei, which exceeds Number.MAX_SAFE_INTEGER by two orders of magnitude — a balance that passes through a JavaScript number is silently wrong.',
  usage: `import { BridgeStatus } from '@/components/ui/bridge-status'
import { GovernanceProposal } from '@/components/ui/governance-proposal'
import { LiquidityPosition } from '@/components/ui/liquidity-position'
import { MintPanel } from '@/components/ui/mint-panel'
import { NetworkStatus } from '@/components/ui/network-status'
import { PortfolioBalance } from '@/components/ui/portfolio-balance'
import { TokenAmount } from '@/components/ui/token-amount'
import { TokenSelect } from '@/components/ui/token-select'
import { TransactionList } from '@/components/ui/transaction-list'
import { ValidatorList } from '@/components/ui/validator-list'

<TokenAmount value="1234567890123456789" decimals={18} symbol="ETH" />
<TokenAmount value={usdcBalance} decimals={6} symbol="USDC" fiat={2500} />`,
  composer: {
    controls: [
      { type: 'text', prop: 'value', label: 'value (base units)', default: '1234567890123456789' },
      { type: 'number', prop: 'decimals', label: 'decimals', default: 18, min: 0, max: 18 },
      { type: 'number', prop: 'precision', label: 'precision', default: 4, min: 0, max: 18 },
      { type: 'boolean', prop: 'trim', label: 'trim', default: true },
    ],
    render: (state) => (
      <span className="text-lg">
        <TokenAmount
          value={String(state.value) || '0'}
          decimals={Number(state.decimals)}
          precision={Number(state.precision)}
          trim={Boolean(state.trim)}
          symbol="ETH"
        />
      </span>
    ),
    code: (s: ComposerState) =>
      `<TokenAmount\n  value="${s.value}"\n  decimals={${s.decimals}}\n  precision={${s.precision}}\n  symbol="ETH"\n/>`,
  },
  api: [
    { name: 'value', type: 'bigint | string', description: 'Base units. A string keeps it exact — never a number, which loses precision above 2^53.' },
    { name: 'decimals', type: 'number', default: '18', description: '18 for most ERC-20s, 8 for BTC, 6 for USDC.' },
    { name: 'precision / trim', type: 'number / boolean', default: '4 / true', description: 'Fraction digits shown. Truncated, never rounded up — displaying more than is held produces a failed transaction.' },
    { name: 'fiat / fiatCurrency', type: 'number / string', description: 'Converted value, shown alongside.' },
    { name: 'signed', type: 'boolean', default: 'false', description: 'Colour and sign by direction, for a delta rather than a balance.' },
    { name: 'formatUnits / splitUnits', type: 'helpers', description: 'Exported. The split is done on the digit string — padding and slicing is exact at any magnitude.' },
  ],
  demos: [
    {
      title: 'Precision at scale',
      stack: true,
      code: `<TokenAmount value="999999999999999999" decimals={18} precision={18} symbol="ETH" />
<TokenAmount value="123456789012345678901234" decimals={18} symbol="ETH" />`,
      render: () => (
        <div className="flex flex-col gap-2 text-sm">
          <TokenAmount value="999999999999999999" decimals={18} precision={18} symbol="ETH" />
          <TokenAmount value="123456789012345678901234" decimals={18} symbol="ETH" />
          <TokenAmount value="2500000" decimals={6} symbol="USDC" fiat={2.5} />
          <TokenAmount value="-1500000000000000000" decimals={18} symbol="ETH" signed />
        </div>
      ),
    },
  ],
}

/* ---------------------------------------------------------- wallet address */

export const walletAddressEntry: ComponentEntry = {
  id: 'wallet-address',
  label: 'Wallet Address',
  description:
    'An address shortened for display but never for copying. The truncation floor is security-relevant: attackers generate lookalikes sharing the first and last characters, so `chars` cannot go below six.',
  usage: `import { WalletAddress } from '@/components/ui/wallet-address'

<WalletAddress address={address} href={explorerUrl} />
<WalletAddress address={address} name="vitalik.eth" />`,
  composer: {
    controls: [
      { type: 'number', prop: 'chars', label: 'chars', default: 6, min: 2, max: 20 },
      { type: 'boolean', prop: 'copyable', label: 'copyable', default: true },
      { type: 'boolean', prop: 'ens', label: 'ENS name', default: false },
    ],
    render: (state) => (
      <WalletAddress
        address={ADDRESS}
        chars={Number(state.chars)}
        copyable={Boolean(state.copyable)}
        name={state.ens ? 'vitalik.eth' : undefined}
        href="#"
        avatar={<Avatar size="xs" name="0x742d" />}
      />
    ),
    code: (s: ComposerState) =>
      `<WalletAddress\n  address={address}\n  chars={${s.chars}}\n  copyable={${Boolean(s.copyable)}}\n/>`,
  },
  api: [
    { name: 'address', type: 'string', description: 'The full value. Copy always yields this, never what is displayed.' },
    { name: 'chars', type: 'number', default: '6', description: 'Leading characters, clamped to a minimum of 6 — too few makes address-poisoning lookalikes indistinguishable.' },
    { name: 'name', type: 'ReactNode', description: 'ENS or label, shown instead of the address. It never replaces the address for copying: names are re-registrable and are not identity.' },
    { name: 'href', type: 'string', description: 'Block explorer link.' },
    { name: 'shortenAddress', type: '(address, chars) => string', description: 'Exported, with the same floor applied.' },
  ],
  demos: [
    {
      title: 'Forms',
      stack: true,
      code: `<WalletAddress address={address} href={explorer} />
<WalletAddress address={address} name="vitalik.eth" />`,
      render: () => (
        <div className="flex flex-col gap-2">
          <WalletAddress address={ADDRESS} href="#" />
          <WalletAddress address={ADDRESS} name="vitalik.eth" avatar={<Avatar size="xs" name="V" />} />
          <WalletAddress address={ADDRESS} chars={12} copyable={false} />
        </div>
      ),
    },
  ],
}

/* ----------------------------------------------------------- wallet connect */

function WalletConnectDemo({ state }: { state: 'disconnected' | 'connecting' | 'connected' | 'wrong' }) {
  return (
    <WalletConnect
      address={state === 'disconnected' || state === 'connecting' ? undefined : ADDRESS}
      connecting={state === 'connecting'}
      wrongNetwork={state === 'wrong'}
      ensName="vitalik.eth"
      avatar={<Avatar size="sm" name="V" />}
      balance="2.41 ETH"
      chainName="Ethereum"
      explorerHref="#"
      onConnect={() => {}}
      onDisconnect={() => {}}
      onSwitchNetwork={() => {}}
    />
  )
}

export const walletConnectEntry: ComponentEntry = {
  id: 'wallet-connect',
  label: 'Wallet Connect',
  description:
    'Connect button and connected account in one control. Wrong-network outranks showing a balance — a figure from the wrong ledger is worse than none, because it looks authoritative.',
  usage: `import { WalletConnect } from '@/components/ui/wallet-connect'

<WalletConnect
  address={address}
  balance="2.41 ETH"
  wrongNetwork={chainId !== 1}
  onConnect={connect}
  onSwitchNetwork={switchChain}
/>`,
  composer: {
    controls: [
      { type: 'select', prop: 'state', label: 'state', options: ['disconnected', 'connecting', 'connected', 'wrong'], default: 'connected' },
    ],
    render: (state) => <WalletConnectDemo state={String(state.state) as 'connected'} />,
    code: (s: ComposerState) => `<WalletConnect\n  address={address}\n  wrongNetwork={${s.state === 'wrong'}}\n  onConnect={connect}\n/>`,
  },
  api: [
    { name: 'address', type: 'string', description: 'Absent renders the connect button.' },
    { name: 'wrongNetwork', type: 'boolean', description: 'Takes priority over the connected view — no balance is shown from an unsupported chain.' },
    { name: 'connecting', type: 'boolean', description: 'A distinct state: wallet prompts open in another window and can sit unanswered, so the button stops inviting a second click.' },
    { name: 'onConnect / onDisconnect / onSwitchNetwork', type: '() => void', description: 'The component performs no wallet calls itself.' },
  ],
  demos: [
    {
      title: 'States',
      stack: true,
      code: `<WalletConnect onConnect={connect} />
<WalletConnect address={address} wrongNetwork />`,
      render: () => (
        <div className="flex flex-wrap gap-3">
          <WalletConnectDemo state="disconnected" />
          <WalletConnectDemo state="connecting" />
          <WalletConnectDemo state="wrong" />
          <WalletConnectDemo state="connected" />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------ chain select */

const CHAINS: Chain[] = [
  { id: 1, name: 'Ethereum', color: '#627EEA', symbol: 'ETH' },
  { id: 42161, name: 'Arbitrum One', color: '#28A0F0', symbol: 'ETH' },
  { id: 10, name: 'OP Mainnet', color: '#FF0420', symbol: 'ETH' },
  { id: 8453, name: 'Base', color: '#0052FF', symbol: 'ETH' },
  { id: 11155111, name: 'Sepolia', color: '#627EEA', symbol: 'ETH', testnet: true },
  { id: 84532, name: 'Base Sepolia', color: '#0052FF', symbol: 'ETH', testnet: true },
]

function ChainSelectDemo({ unsupported }: { unsupported?: boolean }) {
  const [chain, setChain] = useState(1)
  return (
    <div className="w-full max-w-xs">
      <ChainSelect chains={CHAINS} value={unsupported ? 999 : chain} onValueChange={setChain} />
    </div>
  )
}

export const chainSelectEntry: ComponentEntry = {
  id: 'chain-select',
  label: 'Chain Select',
  description:
    'A network switcher. Testnets are labelled and grouped below mainnets — transacting on the wrong network is the most expensive user error in this space, and an unlabelled list invites it.',
  usage: `import { ChainSelect } from '@/components/ui/chain-select'

<ChainSelect chains={chains} value={chainId} onValueChange={switchChain} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'unsupported', label: 'unsupported chain', default: false }],
    render: (state) => <ChainSelectDemo unsupported={Boolean(state.unsupported)} />,
    code: () => `<ChainSelect chains={chains} value={chainId} onValueChange={switchChain} />`,
  },
  api: [
    { name: 'chains', type: 'Chain[]', description: '`{ id, name, color?, testnet?, icon?, symbol? }`.' },
    { name: 'value', type: 'number', description: 'Chain id. An id absent from the list renders the unsupported state rather than an empty trigger.' },
    { name: 'ordering', type: 'mainnets first', description: 'Testnets are sorted below and given their own heading, so one never sits between two production chains.' },
  ],
  demos: [
    { title: 'Networks', stack: true, code: `<ChainSelect chains={chains} value={chainId} />`, render: () => <ChainSelectDemo /> },
  ],
}

/* ------------------------------------------------------------ price ticker */

const HISTORY = [63200, 63800, 63400, 64900, 65600, 65100, 66800, 67240]

function PriceTickerDemo({
  size = 'lg',
  change = 2.41,
  history = true,
}: { size?: 'sm' | 'default' | 'lg'; change?: number; history?: boolean } = {}) {
  const [price, setPrice] = useState(67240)
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <PriceTicker
        symbol="BTC"
        price={price}
        change={change}
        history={history ? HISTORY : undefined}
        size={size}
      />
      <button
        type="button"
        onClick={() => setPrice((p) => p + (Math.random() > 0.5 ? 1 : -1) * 180)}
        className="bg-secondary hover:bg-accent self-start rounded-lg px-2.5 py-1 text-xs"
      >
        Simulate tick
      </button>
    </div>
  )
}

export const priceTickerEntry: ComponentEntry = {
  id: 'price-ticker',
  label: 'Price Ticker',
  description:
    'A live price with its change. The flash on update is colour only — a ticker that moves makes the whole page twitch — and it compares against the previous rendered price, not the day’s direction.',
  usage: `import { PriceTicker } from '@/components/ui/price-ticker'

<PriceTicker symbol="BTC" price={price} change={2.41} history={history} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'default', 'lg'], default: 'lg' },
      { type: 'number', prop: 'change', label: 'change %', default: 2.41, min: -25, max: 25, step: 0.1 },
      { type: 'boolean', prop: 'history', label: 'sparkline', default: true },
    ],
    render: (state: ComposerState) => (
      <PriceTickerDemo
        size={state.size as 'sm' | 'default' | 'lg'}
        change={Number(state.change)}
        history={Boolean(state.history)}
      />
    ),
    code: (state: ComposerState) =>
      `<PriceTicker symbol="BTC" price={price} change={${state.change}} size="${state.size}" />`,
  },
  api: [
    { name: 'price / change', type: 'number', description: 'Change is a percentage over `window`.' },
    { name: 'precision', type: 'number', description: 'Defaults by magnitude — a $0.000042 token needs eight digits where a $67,000 one needs two.' },
    { name: 'flash', type: 'automatic', description: 'Compares against the previous rendered price held in a ref. Deriving it from the day’s change would flash green on every tick of an up day.' },
    { name: 'history', type: 'number[]', description: 'Rendered as a Sparkline tinted by direction.' },
  ],
  demos: [
    { title: 'Live tick', stack: true, code: `<PriceTicker symbol="BTC" price={price} change={2.41} />`, render: () => <PriceTickerDemo /> },
  ],
}

/* ------------------------------------------------------------ market table */

const MARKETS: Market[] = [
  { id: 'btc', rank: 1, symbol: 'BTC', name: 'Bitcoin', price: 67240.12, change24h: 2.41, volume24h: 28_400_000_000, marketCap: 1_324_000_000_000, history: HISTORY, starred: true },
  { id: 'eth', rank: 2, symbol: 'ETH', name: 'Ethereum', price: 3284.5, change24h: -1.12, volume24h: 14_200_000_000, marketCap: 394_000_000_000, history: [3350, 3320, 3290, 3310, 3270, 3260, 3284] },
  { id: 'sol', rank: 3, symbol: 'SOL', name: 'Solana', price: 178.32, change24h: 5.87, volume24h: 3_100_000_000, marketCap: 82_000_000_000, history: [166, 169, 172, 170, 175, 177, 178] },
  { id: 'usdc', rank: 4, symbol: 'USDC', name: 'USD Coin', price: 1.0001, change24h: 0.01, volume24h: 6_800_000_000, marketCap: 34_000_000_000, history: [1, 1, 1, 1, 1, 1, 1] },
  { id: 'pepe', rank: 5, symbol: 'PEPE', name: 'Pepe', price: 0.0000124, change24h: -8.44, volume24h: 890_000_000, marketCap: 5_200_000_000, history: [0.0000138, 0.0000132, 0.0000129, 0.0000126, 0.0000124] },
]

export const marketTableEntry: ComponentEntry = {
  id: 'market-table',
  label: 'Market Table',
  description:
    'A market list with price, change, volume and cap. Rank is the caller’s, never the row index — a re-sorted table that renumbers from one destroys the identifier people use to talk about a market.',
  usage: `import { MarketTable } from '@/components/ui/market-table'

<MarketTable markets={markets} onStar={star} onSelect={open} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'searchable', label: 'searchable', default: true }],
    render: (state) => (
      <div className="w-full">
        <MarketTable markets={MARKETS} searchable={Boolean(state.searchable)} onStar={() => {}} />
      </div>
    ),
    code: () => `<MarketTable markets={markets} onStar={star} onSelect={open} />`,
  },
  api: [
    { name: 'markets', type: 'Market[]', description: '`{ id, rank?, symbol, name, price, change24h?, volume24h?, marketCap?, history?, starred? }`.' },
    { name: 'onStar', type: '(id, starred) => void', description: 'Watchlist state is reported, never held — a starred asset belongs to an account, not a table that forgets on unmount.' },
    { name: 'columns', type: 'responsive', description: 'Volume drops below `sm`, cap below `md`, the sparkline below `lg`. The table also scrolls rather than crushing.' },
    { name: 'price precision', type: 'by magnitude', description: 'Sub-dollar assets get four digits; large caps use compact notation.' },
  ],
  demos: [
    { title: 'Markets', stack: true, code: `<MarketTable markets={markets} onStar={star} />`, render: () => <div className="w-full"><MarketTable markets={MARKETS} onStar={() => {}} /></div> },
  ],
}

/* ------------------------------------------------------- candlestick chart */

const CANDLES: Candle[] = [
  { time: 1, open: 63200, high: 63900, low: 62800, close: 63750, volume: 1200 },
  { time: 2, open: 63750, high: 64400, low: 63500, close: 63400, volume: 980 },
  { time: 3, open: 63400, high: 65100, low: 63300, close: 64900, volume: 1640 },
  { time: 4, open: 64900, high: 65800, low: 64700, close: 65600, volume: 1420 },
  { time: 5, open: 65600, high: 65900, low: 64800, close: 65100, volume: 1100 },
  { time: 6, open: 65100, high: 67000, low: 65000, close: 66800, volume: 2100 },
  { time: 7, open: 66800, high: 67500, low: 66400, close: 67240, volume: 1780 },
  { time: 8, open: 67240, high: 67300, low: 66100, close: 66400, volume: 1320 },
]

export const candlestickChartEntry: ComponentEntry = {
  id: 'candlestick-chart',
  label: 'Candlestick Chart',
  description:
    'OHLC candles with a volume strip. Unlike every other chart here it does not stretch — a stretched candle varies its body width with the container while the wick stays one unit, and the body-versus-wick reading stops working.',
  usage: `import { CandlestickChart } from '@/components/ui/candlestick-chart'

<CandlestickChart candles={candles} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'showVolume', label: 'showVolume', default: true }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <CandlestickChart candles={CANDLES} showVolume={Boolean(state.showVolume)} />
      </div>
    ),
    code: (s: ComposerState) => `<CandlestickChart candles={candles} showVolume={${Boolean(s.showVolume)}} />`,
  },
  api: [
    { name: 'candles', type: 'Candle[]', description: '`{ time, open, high, low, close, volume? }`.' },
    { name: 'axis padding', type: 'wicks', description: 'The scale is padded to the extremes of the wicks, not the bodies — otherwise the highest high clips exactly when it matters.' },
    { name: 'doji', type: 'handled', description: 'A body with equal open and close still draws a visible line rather than a zero-height rect.' },
  ],
  demos: [
    { title: 'OHLC', stack: true, code: `<CandlestickChart candles={candles} />`, render: () => <div className="w-full max-w-xl"><CandlestickChart candles={CANDLES} /></div> },
  ],
}

/* --------------------------------------------------------------- order book */

const BIDS: OrderLevel[] = [
  { price: 67238.4, size: 0.842 }, { price: 67237.1, size: 1.204 }, { price: 67235.8, size: 0.318 },
  { price: 67234.2, size: 2.106 }, { price: 67232.9, size: 0.774 }, { price: 67231.5, size: 1.482 },
]
const ASKS: OrderLevel[] = [
  { price: 67241.2, size: 0.612 }, { price: 67242.8, size: 0.945 }, { price: 67244.1, size: 1.733 },
  { price: 67245.9, size: 0.488 }, { price: 67247.3, size: 2.214 }, { price: 67249.0, size: 0.667 },
]

export const orderBookEntry: ComponentEntry = {
  id: 'order-book',
  label: 'Order Book',
  description:
    'Bids and asks with cumulative depth. The bar is the running total from the top of book, not the size at that level — what matters when taking liquidity is how much sits between you and a price.',
  usage: `import { OrderBook } from '@/components/ui/order-book'

<OrderBook bids={bids} asks={asks} quoteSymbol="USD" baseSymbol="BTC" />`,
  composer: {
    tall: true,
    controls: [{ type: 'number', prop: 'depth', label: 'depth', default: 6, min: 2, max: 6 }],
    render: (state) => (
      <div className="w-full max-w-md">
        <OrderBook bids={BIDS} asks={ASKS} depth={Number(state.depth)} quoteSymbol="USD" baseSymbol="BTC" />
      </div>
    ),
    code: (s: ComposerState) => `<OrderBook bids={bids} asks={asks} depth={${s.depth}} />`,
  },
  api: [
    { name: 'bids / asks', type: 'OrderLevel[]', description: '`{ price, size }`. Sorted internally, so the caller need not.' },
    { name: 'depth bars', type: 'cumulative', description: 'Per-level bars are the common mistake and misrepresent the book — this is a running sum on one shared scale across both sides.' },
    { name: 'layout', type: 'asks bottom-up', description: 'So the spread sits in the middle, which is the convention traders read without thinking.' },
  ],
  demos: [
    { title: 'Book', stack: true, code: `<OrderBook bids={bids} asks={asks} />`, render: () => <div className="w-full max-w-md"><OrderBook bids={BIDS} asks={ASKS} quoteSymbol="USD" baseSymbol="BTC" /></div> },
  ],
}

/* --------------------------------------------------------------- swap panel */

export const swapPanelEntry: ComponentEntry = {
  id: 'swap-panel',
  label: 'Swap Panel',
  description:
    'The pay/receive form of a token swap. Price impact is surfaced rather than buried behind a details toggle, and above a threshold the action is disabled outright.',
  usage: `import { SwapPanel } from '@/components/ui/swap-panel'

<SwapPanel from={from} to={to} priceImpact={0.8} minimumReceived="1,240 USDC" onSwap={swap} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'impact', label: 'priceImpact', options: ['0.4', '3.2', '18.5'], default: '0.4' },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <SwapPanel
          from={{ symbol: 'ETH', amount: '0.5', fiat: 1642.25, balance: '2.41' }}
          to={{ symbol: 'USDC', amount: '1,638.40', fiat: 1638.4, balance: '0.00' }}
          rate="1 ETH = 3,284.50 USDC"
          priceImpact={Number(state.impact)}
          minimumReceived="1,630.21 USDC"
          networkFee="~$2.14"
          onSwap={() => {}}
          onFlip={() => {}}
          onSettings={() => {}}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<SwapPanel\n  from={from}\n  to={to}\n  priceImpact={${s.impact}}\n  minimumReceived="1,630.21 USDC"\n  onSwap={swap}\n/>`,
  },
  api: [
    { name: 'from / to', type: 'SwapSide', description: '`{ symbol, amount, fiat?, balance?, icon? }`.' },
    { name: 'priceImpact', type: 'number', description: 'Percentage. Coloured above `impactWarn` (3) and the action is disabled above `impactBlock` (15).' },
    { name: 'minimumReceived', type: 'ReactNode', description: 'An amount, not just a slippage percentage — "0.5%" is abstract, an amount is what the user agrees to.' },
    { name: 'onSwap / onFlip / onSettings', type: '() => void', description: 'The panel performs no routing or quoting of its own.' },
  ],
  demos: [
    {
      title: 'Healthy and blocked',
      stack: true,
      code: `<SwapPanel from={from} to={to} priceImpact={0.4} />
<SwapPanel from={from} to={to} priceImpact={18.5} />`,
      render: () => (
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <SwapPanel from={{ symbol: 'ETH', amount: '0.5', fiat: 1642.25 }} to={{ symbol: 'USDC', amount: '1,638.40', fiat: 1638.4 }} rate="1 ETH = 3,284.50 USDC" priceImpact={0.4} minimumReceived="1,630.21 USDC" networkFee="~$2.14" onSwap={() => {}} />
          <SwapPanel from={{ symbol: 'ETH', amount: '120', fiat: 394140 }} to={{ symbol: 'MEME', amount: '4.2M', fiat: 321000 }} rate="1 ETH = 35,000 MEME" priceImpact={18.5} minimumReceived="3.9M MEME" networkFee="~$2.14" onSwap={() => {}} />
        </div>
      ),
    },
  ],
}

/* -------------------------------------------------------- transaction status */

export const transactionStatusEntry: ComponentEntry = {
  id: 'transaction-status',
  label: 'Transaction Status',
  description:
    'A transaction from submitted to final. Confirmations are progress toward a threshold, not a tick at one block — chains reorganise, and "done" at one confirmation teaches a habit that eventually costs money.',
  usage: `import { TransactionStatus } from '@/components/ui/transaction-status'

<TransactionStatus hash={hash} state="mined" confirmations={4} required={12} href={explorer} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'state', label: 'state', options: ['pending', 'mined', 'confirmed', 'reverted', 'dropped'], default: 'mined' },
      { type: 'number', prop: 'confirmations', label: 'confirmations', default: 4, min: 0, max: 12 },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <TransactionStatus
          hash="0x9f2c1b7e4a6d8035f1c2e9b0a7d4f6e3c8b5a2d9f1e7c4b6a3d0f8e5c2b9a7d4"
          state={String(state.state) as 'mined'}
          confirmations={Number(state.confirmations)}
          required={12}
          summary="Swap 0.5 ETH for 1,638.40 USDC"
          submittedAt={ago(3)}
          now={NOW}
          href="#"
          error={state.state === 'reverted' ? 'Reverted: insufficient output amount' : undefined}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<TransactionStatus\n  hash={hash}\n  state="${s.state}"\n  confirmations={${s.confirmations}}\n  required={12}\n/>`,
  },
  api: [
    { name: 'state', type: "'pending' | 'mined' | 'confirmed' | 'reverted' | 'dropped'", description: 'Reverted is distinct from a failed submission: it was mined and consumed gas, and collapsing the two hides that the user paid.' },
    { name: 'confirmations / required', type: 'number', default: '0 / 12', description: 'Rendered as progress toward settlement.' },
    { name: 'href', type: 'string', description: 'Block explorer link for the hash.' },
  ],
  demos: [
    { title: 'Lifecycle', stack: true, code: `<TransactionStatus hash={hash} state="mined" confirmations={4} />`, render: () => (
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <TransactionStatus hash="0x9f2c1b7e4a6d8035f1c2e9b0a7d4f6e3c8b5a2d9" state="pending" summary="Approve USDC" submittedAt={ago(1)} now={NOW} href="#" />
        <TransactionStatus hash="0x4a1e8c3b7f2d9051e6a4c8b2d7f3e9a1c5b8d2f6" state="confirmed" confirmations={18} required={12} summary="Swap 0.5 ETH for 1,638.40 USDC" submittedAt={ago(22)} now={NOW} href="#" />
      </div>
    ) },
  ],
}

/* ------------------------------------------------------------- gas tracker */

const TIERS: GasTier[] = [
  { id: 'slow', label: 'Slow', price: 18.2, wait: '~3 min' },
  { id: 'normal', label: 'Normal', price: 24.6, wait: '~45 s', recommended: true },
  { id: 'fast', label: 'Fast', price: 32.1, wait: '~15 s' },
]

function GasTrackerDemo({
  baseFee = 16.4,
  gasLimit = 120_000,
  nativePrice = 3284.5,
}: { baseFee?: number; gasLimit?: number; nativePrice?: number } = {}) {
  const [tier, setTier] = useState('normal')
  return (
    <div className="w-full max-w-sm">
      <GasTracker
        tiers={TIERS}
        selected={tier}
        onSelect={setTier}
        baseFee={baseFee}
        gasLimit={gasLimit}
        nativePrice={nativePrice}
      />
    </div>
  )
}

export const gasTrackerEntry: ComponentEntry = {
  id: 'gas-tracker',
  label: 'Gas Tracker',
  description:
    'Gas tiers with what each actually costs. Gwei alone is not a decision — the same gas price costs four times more for a swap than a transfer, which is why gasLimit is a prop.',
  usage: `import { GasTracker } from '@/components/ui/gas-tracker'

<GasTracker tiers={tiers} gasLimit={120000} nativePrice={ethUsd} onSelect={setTier} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'baseFee', label: 'base fee (gwei)', default: 16.4, min: 0.1, max: 400, step: 0.5 },
      { type: 'number', prop: 'gasLimit', label: 'gas limit', default: 120_000, min: 21_000, max: 1_000_000, step: 1000 },
      { type: 'number', prop: 'nativePrice', label: 'ETH price', default: 3284.5, min: 100, max: 20_000, step: 50 },
    ],
    render: (state: ComposerState) => (
      <GasTrackerDemo
        baseFee={Number(state.baseFee)}
        gasLimit={Number(state.gasLimit)}
        nativePrice={Number(state.nativePrice)}
      />
    ),
    code: (state: ComposerState) =>
      `<GasTracker tiers={tiers} gasLimit={${state.gasLimit}} nativePrice={${state.nativePrice}} />`,
  },
  api: [
    { name: 'tiers', type: 'GasTier[]', description: '`{ id, label, price, wait?, recommended? }` where price is gwei.' },
    { name: 'gasLimit', type: 'number', default: '21000', description: 'Units of gas for the transaction being priced — 21000 is a bare transfer.' },
    { name: 'nativePrice', type: 'number', description: 'Fiat price of the native token. Without it the cost is shown in the native unit.' },
    { name: 'wait', type: 'string', description: 'Shown beside the price: the trade is time against money, and a price with no time shows one side.' },
  ],
  demos: [
    { title: 'Tiers', stack: true, code: `<GasTracker tiers={tiers} gasLimit={120000} nativePrice={ethUsd} />`, render: () => <GasTrackerDemo /> },
  ],
}

/* ----------------------------------------------------------------- nft card */

export const nftCardEntry: ComponentEntry = {
  id: 'nft-card',
  label: 'NFT Card',
  description:
    'A token tile: media, collection, price. Broken media resolves to a placeholder rather than collapsing the tile — IPFS gateways fail constantly and a grid that reflows on every 404 is unusable.',
  usage: `import { NftCard } from '@/components/ui/nft-card'

<NftCard name="Astral #1420" collection="Astralyx" verified price="2.4 ETH" image={url} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'verified', label: 'verified collection', default: true },
      { type: 'boolean', prop: 'broken', label: 'broken media', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-56">
        <NftCard
          name="Astral"
          tokenId="1420"
          collection="Astralyx Genesis"
          verified={Boolean(state.verified)}
          image={state.broken ? 'https://invalid.example/broken.png' : undefined}
          price="2.4 ETH"
          lastSale="1.9 ETH"
          rarity="Rank 42"
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<NftCard\n  name="Astral"\n  tokenId="1420"\n  collection="Astralyx Genesis"\n  verified={${Boolean(s.verified)}}\n  price="2.4 ETH"\n/>`,
  },
  api: [
    { name: 'name / tokenId / collection', type: 'ReactNode', description: 'Identity of the item and its collection.' },
    { name: 'verified', type: 'boolean', description: 'Applies to the collection, never the item. Copied collections are the standard scam here, and a tick beside an item name implies something nobody checked.' },
    { name: 'image', type: 'string', description: 'A load failure swaps in a placeholder; the tile keeps its aspect ratio either way.' },
    { name: 'price / lastSale / rarity', type: 'ReactNode', description: 'Formatting is the caller’s — pair with TokenAmount.' },
  ],
  demos: [
    {
      title: 'Grid',
      stack: true,
      code: `<NftCard name="Astral" tokenId="1420" collection="Astralyx Genesis" verified price="2.4 ETH" />`,
      render: () => (
        <div className="grid w-full gap-3 sm:grid-cols-3">
          <NftCard name="Astral" tokenId="1420" collection="Astralyx Genesis" verified price="2.4 ETH" lastSale="1.9 ETH" rarity="Rank 42" />
          <NftCard name="Astral" tokenId="0881" collection="Astralyx Genesis" verified price="3.1 ETH" rarity="Rank 8" />
          <NftCard name="Unknown" tokenId="0002" collection="Unverified" image="https://invalid.example/x.png" price="0.04 ETH" />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------ staking panel */

export const stakingPanelEntry: ComponentEntry = {
  id: 'staking-panel',
  label: 'Staking Panel',
  description:
    'A staking position: stake, rewards, APY and unlock. APY is labelled variable unless told otherwise, because it almost always is — a bare percentage reads as a fixed-term rate.',
  usage: `import { StakingPanel } from '@/components/ui/staking-panel'

<StakingPanel token="stETH" staked="12.4 ETH" rewards="0.284 ETH" apy={3.82} unbonding="21 days" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'unbonding', label: 'unbonding in progress', default: false },
      { type: 'boolean', prop: 'apyFixed', label: 'apyFixed', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <StakingPanel
          token="stETH"
          staked="12.4 ETH"
          rewards="0.284 ETH"
          apy={3.82}
          apyFixed={Boolean(state.apyFixed)}
          unbonding="21 days"
          unlockProgress={state.unbonding ? 0.62 : undefined}
          unlockLabel={state.unbonding ? '8 days remaining' : undefined}
          onStake={() => {}}
          onUnstake={() => {}}
          onClaim={() => {}}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<StakingPanel\n  token="stETH"\n  staked="12.4 ETH"\n  rewards="0.284 ETH"\n  apy={3.82}\n  apyFixed={${Boolean(s.apyFixed)}}\n  unbonding="21 days"\n/>`,
  },
  api: [
    { name: 'staked / rewards', type: 'ReactNode', description: 'Formatted amounts — pair with TokenAmount for exactness.' },
    { name: 'apy / apyFixed', type: 'number / boolean', description: 'Variable by default, with a note saying so. Only set `apyFixed` when the rate genuinely cannot move.' },
    { name: 'unbonding / unlockProgress', type: 'ReactNode / number', description: 'The unbonding period gets equal weight to the yield — it is the part that actually constrains the user.' },
    { name: 'onStake / onUnstake / onClaim', type: '() => void', description: 'Actions are reported; the panel performs no transactions.' },
  ],
  demos: [
    { title: 'Position', stack: true, code: `<StakingPanel token="stETH" staked="12.4 ETH" apy={3.82} unbonding="21 days" />`, render: () => (
      <div className="w-full max-w-sm">
        <StakingPanel token="stETH" staked="12.4 ETH" rewards="0.284 ETH" apy={3.82} unbonding="21 days" unlockProgress={0.62} unlockLabel="8 days remaining" onStake={() => {}} onUnstake={() => {}} onClaim={() => {}} />
      </div>
    ) },
  ],
}

/* --------------------------------------------------------- token approvals */

const APPROVALS: Approval[] = [
  { id: '1', token: 'USDC', spender: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', spenderName: 'Uniswap Router', unlimited: true, lastUsed: ago(60 * 26), atRisk: 12480 },
  { id: '2', token: 'WETH', spender: '0x1111111254EEB25477B68fb85Ed929f73A960582', spenderName: '1inch', allowance: '5.00 WETH', lastUsed: ago(60 * 24 * 12) },
  { id: '3', token: 'DAI', spender: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', unlimited: true, atRisk: 840 },
]

export const tokenApprovalsEntry: ComponentEntry = {
  id: 'token-approvals',
  label: 'Token Approvals',
  description:
    'Spending allowances granted to contracts, with revoke. An unlimited approval is stated as "unlimited" rather than rendered as 2²⁵⁶−1, which reads like a display bug — it is a standing permission to move the whole balance, forever.',
  usage: `import { TokenApprovals } from '@/components/ui/token-approvals'

<TokenApprovals approvals={approvals} onRevoke={revoke} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'revocable', label: 'revocable', default: true },
      { type: 'boolean', prop: 'empty', label: 'empty state', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <TokenApprovals
          approvals={state.empty ? [] : APPROVALS}
          now={NOW}
          onRevoke={state.revocable ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<TokenApprovals approvals={approvals} onRevoke={revoke} />`,
  },
  api: [
    { name: 'approvals', type: 'Approval[]', description: '`{ id, token, spender, spenderName?, allowance?, unlimited?, lastUsed?, atRisk? }`.' },
    { name: 'unlimited', type: 'boolean', description: 'Badged as a risk rather than shown as a number.' },
    { name: 'atRisk', type: 'number', description: 'Fiat value currently exposed under the approval — the figure that makes it concrete.' },
    { name: 'onRevoke', type: '(id) => void', description: 'Confirmed inline beside the row, since a modal hiding which approval is being revoked is how the wrong one goes.' },
  ],
  demos: [
    { title: 'Allowances', stack: true, code: `<TokenApprovals approvals={approvals} onRevoke={revoke} />`, render: () => <div className="w-full max-w-2xl"><TokenApprovals approvals={APPROVALS} now={NOW} onRevoke={() => {}} /></div> },
  ],
}

/* --------------------------------------------------------------- seed phrase */

const WORDS = ['ridge','clarify','sponsor','volcano','glide','pupil','absent','marine','fortune','tunnel','jacket','oyster']

export const seedPhraseEntry: ComponentEntry = {
  id: 'seed-phrase',
  label: 'Seed Phrase',
  description:
    'A recovery phrase, blurred until revealed. Deliberately hostile to convenience: no copy button and no selection, because a seed phrase on the clipboard is readable by every page visited afterwards.',
  usage: `import { SeedPhrase } from '@/components/ui/seed-phrase'

<SeedPhrase words={words} />
<SeedPhrase words={words} confirmIndices={[2, 7, 11]} onConfirm={next} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'confirm', label: 'confirm mode', default: false },
      { type: 'select', prop: 'columns', label: 'columns', options: ['2', '3', '4'], default: '3' },
    ],
    render: (state) => (
      <div className="w-full max-w-lg">
        <SeedPhrase
          words={WORDS}
          columns={Number(state.columns) as 2 | 3 | 4}
          confirmIndices={state.confirm ? [2, 7, 11] : undefined}
          onConfirm={() => {}}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<SeedPhrase\n  words={words}\n  columns={${s.columns}}${s.confirm ? '\n  confirmIndices={[2, 7, 11]}\n  onConfirm={next}' : ''}\n/>`,
  },
  api: [
    { name: 'words', type: 'string[]', description: '12 or 24 words. Never copyable and not selectable while hidden.' },
    { name: 'revealed / onRevealedChange', type: 'boolean', description: 'Blurred by default — these are read in cafés and on video calls, so revealing is a decision rather than the default.' },
    { name: 'confirmIndices', type: 'number[]', description: '0-based positions to ask back, which is the only way to establish the phrase was written down rather than clicked past.' },
    { name: 'no clipboard', type: 'by design', description: 'There is no copy button. Clipboard managers persist to disk and every subsequent page can read it.' },
  ],
  demos: [
    { title: 'Reveal and confirm', stack: true, code: `<SeedPhrase words={words} />`, render: () => (
      <div className="grid w-full gap-4 lg:grid-cols-2">
        <SeedPhrase words={WORDS} />
        <SeedPhrase words={WORDS} confirmIndices={[2, 7, 11]} onConfirm={() => {}} />
      </div>
    ) },
  ],
}

/* ------------------------------------------------------------ token select */

const TOKENS = [
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', balance: '2.41', balanceValue: 2.41, fiat: 7915.6, verified: true },
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', balance: '1,638.40', balanceValue: 1638.4, fiat: 1638.4, verified: true },
  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', balance: '0.00', balanceValue: 0, verified: true },
  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap', verified: true },
  { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', symbol: 'USDC', name: 'USD Coin (unofficial)', verified: false },
]

function TokenSelectDemo({
  size = 'md',
  placeholder = 'Select a token',
  unverified = true,
}: {
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
  unverified?: boolean
} = {}) {
  const [token, setToken] = useState(TOKENS[0].address)
  return (
    <div className="w-full max-w-sm">
      <TokenSelect
        tokens={unverified ? TOKENS : TOKENS.filter((t) => t.verified !== false)}
        value={token}
        onValueChange={setToken}
        size={size}
        placeholder={placeholder}
      />
    </div>
  )
}

export const tokenSelectEntry: ComponentEntry = {
  id: 'token-select',
  label: 'Token Select',
  description:
    'A token picker with balances and search. Symbols are not unique — anyone can deploy a contract called "USDC" — so unverified tokens are segregated, badged, and shown by contract address rather than the name they claim.',
  usage: `import { TokenSelect } from '@/components/ui/token-select'

<TokenSelect tokens={tokens} value={token} onValueChange={setToken} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'md', 'lg'], default: 'md' },
      { type: 'text', prop: 'placeholder', label: 'placeholder', default: 'Select a token' },
      { type: 'boolean', prop: 'unverified', label: 'include unverified', default: true },
    ],
    render: (state: ComposerState) => (
      <TokenSelectDemo
        size={state.size as 'sm' | 'md' | 'lg'}
        placeholder={String(state.placeholder)}
        unverified={Boolean(state.unverified)}
      />
    ),
    code: (state: ComposerState) =>
      `<TokenSelect tokens={tokens} value={token} onValueChange={setToken} size="${state.size}" />`,
  },
  api: [
    { name: 'tokens', type: 'TokenOption[]', description: '`{ address, symbol, name?, icon?, balance?, balanceValue?, fiat?, verified? }`.' },
    { name: 'verified', type: 'boolean', description: '`false` moves the token below a divider with a warning and shows its address instead of its claimed name.' },
    { name: 'balanceValue', type: 'number', description: 'Used only for ordering — held tokens sort first, since the one you want is usually one you have.' },
    { name: 'search', type: 'symbol, name or address', description: 'Pasting a contract address finds it directly.' },
  ],
  demos: [{ title: 'Picker', stack: true, code: `<TokenSelect tokens={tokens} value={token} onValueChange={setToken} />`, render: () => <TokenSelectDemo /> }],
}

/* ------------------------------------------------------- portfolio balance */

const HOLDINGS = [
  { id: 'eth', symbol: 'ETH', value: 7915.6, amount: '2.41', change24h: -1.12 },
  { id: 'usdc', symbol: 'USDC', value: 1638.4, amount: '1,638.40', change24h: 0.01 },
  { id: 'sol', symbol: 'SOL', value: 2140.0, amount: '12.0', change24h: 5.87 },
  { id: 'uni', symbol: 'UNI', value: 310.5, amount: '42.0', change24h: -3.2 },
  { id: 'dust1', symbol: 'LINK', value: 41.2 },
  { id: 'dust2', symbol: 'AAVE', value: 28.9 },
]

export const portfolioBalanceEntry: ComponentEntry = {
  id: 'portfolio-balance',
  label: 'Portfolio Balance',
  description:
    'Total value with its allocation. The hide toggle is part of the component, not an app-level bolt-on — people check balances on trains. Allocation is computed from the values, never taken as a percentage prop.',
  usage: `import { PortfolioBalance } from '@/components/ui/portfolio-balance'

<PortfolioBalance holdings={holdings} change24h={2.1} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'hidden', label: 'hidden', default: false }],
    render: (state) => (
      <div className="w-full max-w-md">
        <PortfolioBalance holdings={HOLDINGS} change24h={1.84} hidden={Boolean(state.hidden)} />
      </div>
    ),
    code: (s: ComposerState) => `<PortfolioBalance holdings={holdings} change24h={1.84} hidden={${Boolean(s.hidden)}} />`,
  },
  api: [
    { name: 'holdings', type: 'Holding[]', description: '`{ id, symbol, value, amount?, change24h?, color?, icon? }` where value is fiat.' },
    { name: 'hidden / onHiddenChange', type: 'boolean', description: 'Masks every figure. Controlled or uncontrolled.' },
    { name: 'groupBelow', type: 'number', default: '0.03', description: 'Share below which a holding folds into "Other" — forty one-pixel slivers say less than six slices and a remainder.' },
    { name: 'allocation', type: 'derived', description: 'From the values themselves; a bar that does not add to 100 is the kind of thing people screenshot.' },
  ],
  demos: [{ title: 'Allocation', stack: true, code: `<PortfolioBalance holdings={holdings} change24h={1.84} />`, render: () => <div className="w-full max-w-md"><PortfolioBalance holdings={HOLDINGS} change24h={1.84} /></div> }],
}

/* -------------------------------------------------------- transaction list */

const ME = ADDRESS
const TXS = [
  { hash: '0x9f2c1b7e4a6d8035f1c2e9b0a7d4f6e3c8b5a2d9', from: '0x1111111254EEB25477B68fb85Ed929f73A960582', to: ME, amount: '1,638.40 USDC', fiat: 1638.4, time: ago(12), kind: 'swap' as const, href: '#' },
  { hash: '0x4a1e8c3b7f2d9051e6a4c8b2d7f3e9a1c5b8d2f6', from: ME, to: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', amount: '0.5 ETH', fiat: 1642.25, time: ago(48), href: '#' },
  { hash: '0x2d7f3e9a1c5b8d2f64a1e8c3b7f2d9051e6a4c8b', from: ME, to: ME, amount: '12.0 SOL', time: ago(180), href: '#' },
  { hash: '0x8b5a2d9f1e7c4b6a3d0f8e5c2b9a7d49f2c1b7e4', from: ME, to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', amount: '250 DAI', time: ago(1500), failed: true, href: '#' },
]

export const transactionListEntry: ComponentEntry = {
  id: 'transaction-list',
  label: 'Transaction List',
  description:
    'Wallet activity grouped by day. Direction is derived against the connected account, not passed in — the same transfer is a send for one wallet and a receive for another, and a self-transfer is both.',
  usage: `import { TransactionList } from '@/components/ui/transaction-list'

<TransactionList transactions={txs} account={address} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'currency', label: 'currency', options: ['USD', 'EUR', 'GBP'], default: 'USD' },
      { type: 'boolean', prop: 'empty', label: 'empty state', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <TransactionList
          transactions={state.empty ? [] : TXS}
          account={ADDRESS}
          currency={String(state.currency)}
          now={NOW}
        />
      </div>
    ),
    code: () => `<TransactionList transactions={txs} account={address} />`,
  },
  api: [
    { name: 'transactions', type: 'WalletTx[]', description: '`{ hash, from, to, amount?, fiat?, time, kind?, failed?, href? }`.' },
    { name: 'account', type: 'string', description: 'Required. Direction is computed against it, which is the only way a self-transfer renders correctly.' },
    { name: 'failed', type: 'boolean', description: 'Still shown — it consumed gas and is on-chain; hiding it leaves the balance unexplained.' },
  ],
  demos: [{ title: 'Activity', stack: true, code: `<TransactionList transactions={txs} account={address} />`, render: () => <div className="w-full max-w-xl"><TransactionList transactions={TXS} account={ME} now={NOW} /></div> }],
}

/* ------------------------------------------------------------ bridge status */

export const bridgeStatusEntry: ComponentEntry = {
  id: 'bridge-status',
  label: 'Bridge Status',
  description:
    'A cross-chain transfer as its two legs. Not one progress bar: the legs fail independently and the second cannot begin until the first is final, so a single bar implies a state that does not exist.',
  usage: `import { BridgeStatus } from '@/components/ui/bridge-status'

<BridgeStatus source={source} destination={destination} amount="0.5 ETH" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'stage', label: 'stage', options: ['source', 'destination', 'done', 'failed'], default: 'source' },
    ],
    render: (state) => {
      const stage = String(state.stage)
      return (
        <div className="w-full max-w-lg">
          <BridgeStatus
            amount="0.5 ETH"
            estimate="~14 min"
            startedAt={ago(4)}
            now={NOW}
            source={{
              chain: 'Ethereum',
              state: stage === 'source' ? 'active' : stage === 'failed' ? 'failed' : 'done',
              detail: stage === 'source' ? '12 / 64 confirmations' : 'Finalised',
              progress: 12 / 64,
            }}
            destination={{
              chain: 'Arbitrum One',
              state: stage === 'done' ? 'done' : stage === 'destination' ? 'active' : 'pending',
              detail: stage === 'destination' ? 'Executing' : stage === 'done' ? 'Delivered' : 'Waiting for source finality',
            }}
            error={stage === 'failed' ? 'Source transaction reverted — no funds left the wallet.' : undefined}
          />
        </div>
      )
    },
    code: () => `<BridgeStatus source={source} destination={destination} amount="0.5 ETH" />`,
  },
  api: [
    { name: 'source / destination', type: 'BridgeLeg', description: '`{ chain, state, detail?, progress?, href? }`.' },
    { name: 'detail', type: 'ReactNode', description: 'Names what is being waited on. "Pending" for twenty minutes is the most common bridge support ticket; "waiting for 64 confirmations" is the same wait without the anxiety.' },
    { name: 'estimate', type: 'ReactNode', description: 'Expected total time.' },
  ],
  demos: [
    {
      title: 'Legs',
      stack: true,
      code: `<BridgeStatus source={source} destination={destination} amount="0.5 ETH" />`,
      render: () => (
        <div className="w-full max-w-lg">
          <BridgeStatus
            amount="0.5 ETH"
            estimate="~14 min"
            startedAt={ago(4)}
            now={NOW}
            source={{ chain: 'Ethereum', state: 'active', detail: '12 / 64 confirmations', progress: 12 / 64 }}
            destination={{ chain: 'Arbitrum One', state: 'pending', detail: 'Waiting for source finality' }}
          />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------- liquidity position */

export const liquidityPositionEntry: ComponentEntry = {
  id: 'liquidity-position',
  label: 'Liquidity Position',
  description:
    'A concentrated-liquidity position with its range. In-range versus out-of-range is the headline — a position outside its range earns nothing, and a card showing only "fees earned" while it stopped earning last week is misleading.',
  usage: `import { LiquidityPosition } from '@/components/ui/liquidity-position'

<LiquidityPosition pair="ETH / USDC" minPrice={2800} maxPrice={3600} currentPrice={3284} />`,
  composer: {
    tall: true,
    controls: [{ type: 'select', prop: 'price', label: 'current price', options: ['2600', '3284', '3900'], default: '3284' }],
    render: (state) => (
      <div className="w-full max-w-sm">
        <LiquidityPosition
          pair="ETH / USDC"
          minPrice={2800}
          maxPrice={3600}
          currentPrice={Number(state.price)}
          priceLabel="USDC per ETH"
          value="$12,480"
          fees="$412.20"
          apr={18.4}
          onCollect={() => {}}
          onManage={() => {}}
        />
      </div>
    ),
    code: (s: ComposerState) => `<LiquidityPosition\n  pair="ETH / USDC"\n  minPrice={2800}\n  maxPrice={3600}\n  currentPrice={${s.price}}\n/>`,
  },
  api: [
    { name: 'minPrice / maxPrice / currentPrice', type: 'number', description: 'In-range is derived from these, never passed as a flag.' },
    { name: 'range bar', type: 'plotted', description: 'With padding either side, so an out-of-range price stays visible and "just inside" looks different from "about to exit".' },
    { name: 'fees / value / apr', type: 'ReactNode / number', description: 'Formatting is the caller’s — pair with TokenAmount.' },
  ],
  demos: [
    {
      title: 'In and out of range',
      stack: true,
      code: `<LiquidityPosition pair="ETH / USDC" minPrice={2800} maxPrice={3600} currentPrice={3284} />`,
      render: () => (
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <LiquidityPosition pair="ETH / USDC" minPrice={2800} maxPrice={3600} currentPrice={3284} priceLabel="USDC per ETH" value="$12,480" fees="$412.20" apr={18.4} onCollect={() => {}} />
          <LiquidityPosition pair="ETH / USDC" minPrice={2800} maxPrice={3600} currentPrice={3900} priceLabel="USDC per ETH" value="$9,120" fees="$88.40" apr={0} onCollect={() => {}} />
        </div>
      ),
    },
  ],
}

/* ---------------------------------------------------- governance proposal */

export const governanceProposalEntry: ComponentEntry = {
  id: 'governance-proposal',
  label: 'Governance Proposal',
  description:
    'A proposal with its tally. Quorum is tracked separately from the majority because they are separate tests — a 92% "for" reads as passing right up until it fails for turnout.',
  usage: `import { GovernanceProposal } from '@/components/ui/governance-proposal'

<GovernanceProposal id="AIP-42" title="…" state="active" forVotes={820000} againstVotes={64000} quorum={1200000} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'turnout', label: 'turnout', options: ['low', 'met'], default: 'low' },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <GovernanceProposal
          id="AIP-42"
          title="Raise the treasury allocation for ecosystem grants to 5%"
          state="active"
          forVotes={state.turnout === 'met' ? 1_180_000 : 820_000}
          againstVotes={64_000}
          abstainVotes={42_000}
          quorum={1_200_000}
          endsAt={new Date(NOW.getTime() + 1000 * 60 * 60 * 34)}
          now={NOW}
          proposer="stablelab.eth"
          onVote={() => {}}
        />
      </div>
    ),
    code: () => `<GovernanceProposal\n  id="AIP-42"\n  title="…"\n  state="active"\n  forVotes={820000}\n  againstVotes={64000}\n  quorum={1200000}\n/>`,
  },
  api: [
    { name: 'forVotes / againstVotes / abstainVotes', type: 'number', description: 'Abstain counts toward quorum but never toward the majority — folding it into "against" gets the outcome wrong.' },
    { name: 'quorum', type: 'number', description: 'Always rendered, including once met.' },
    { name: 'state', type: "'pending' | 'active' | 'passed' | 'defeated' | 'executed' | 'cancelled'", description: 'Voting controls appear only while active.' },
  ],
  demos: [{ title: 'Proposal', stack: true, code: `<GovernanceProposal id="AIP-42" state="active" … />`, render: () => (
    <div className="w-full max-w-xl">
      <GovernanceProposal id="AIP-42" title="Raise the treasury allocation for ecosystem grants to 5%" state="active" forVotes={820_000} againstVotes={64_000} abstainVotes={42_000} quorum={1_200_000} endsAt={new Date(NOW.getTime() + 1000*60*60*34)} now={NOW} proposer="stablelab.eth" onVote={() => {}} />
    </div>
  ) }],
}

/* ------------------------------------------------------------ validator list */

const VALIDATORS = [
  { id: '1', name: 'Chorus One', commission: 8, uptime: 99.98, votingPower: 0.081 },
  { id: '2', name: 'Figment', commission: 5, uptime: 99.91, votingPower: 0.074 },
  { id: '3', name: 'P2P.org', commission: 4, uptime: 99.99, votingPower: 0.066 },
  { id: '4', name: 'Stakely', commission: 3, uptime: 99.4, votingPower: 0.021 },
  { id: '5', name: 'Nodeify', commission: 0, uptime: 96.2, votingPower: 0.004 },
  { id: '6', name: 'Halted Node', commission: 10, uptime: 42.1, votingPower: 0.001, jailed: true },
]

export const validatorListEntry: ComponentEntry = {
  id: 'validator-list',
  label: 'Validator List',
  description:
    'Validators with commission, uptime and voting power. Flags membership of the smallest set controlling a third of the stake, and sorts ascending by default — the conventional descending sort pushes delegators toward whoever is already largest.',
  usage: `import { ValidatorList } from '@/components/ui/validator-list'

<ValidatorList validators={validators} onSelect={delegate} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'selectable', label: 'selectable', default: true },
      { type: 'number', prop: 'count', label: 'validators', default: 6, min: 2, max: 6, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <ValidatorList
          validators={VALIDATORS.slice(0, Number(state.count))}
          onSelect={state.selectable ? () => {} : undefined}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<ValidatorList validators={validators}${state.selectable ? ' onSelect={delegate}' : ''} />`,
  },
  api: [
    { name: 'validators', type: 'Validator[]', description: '`{ id, name, avatar?, commission, uptime?, votingPower, jailed? }`.' },
    { name: 'concentration', type: 'computed', description: 'Marks the validators making up the smallest set that controls a third of the stake — the threshold that matters for halting a chain.' },
    { name: 'sort', type: 'ascending by default', description: 'Descending by voting power is the conventional order and it pushes delegators toward whoever is already largest.' },
    { name: 'onSelect', type: '(id) => void', description: 'Omit for a read-only table.' },
  ],
  demos: [
    { title: 'A validator set', stack: true, code: `<ValidatorList validators={validators} />`,
      render: () => (<div className="w-full"><ValidatorList validators={VALIDATORS} /></div>) },
  ],
}

/* ----------------------------------------------------------------- mint panel */

export const mintPanelEntry: ComponentEntry = {
  id: 'mint-panel',
  label: 'Mint Panel',
  description:
    'Supply, price and quantity, with the total shown before the button. A price of "0.08 ETH" beside a quantity of 5 is not a number anyone should be multiplying in their head at a mint.',
  usage: `import { MintPanel } from '@/components/ui/mint-panel'

<MintPanel minted={3820} supply={5000} price={0.08} priceLabel="ETH" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'minted', label: 'minted', default: 3820, min: 0, max: 5000, step: 20 },
      { type: 'number', prop: 'alreadyMinted', label: 'already held', default: 2, min: 0, max: 5, step: 1 },
      { type: 'number', prop: 'price', label: 'price', default: 0.08, min: 0, max: 5, step: 0.01 },
      { type: 'number', prop: 'maxPerWallet', label: 'max per wallet', default: 5, min: 1, max: 10, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <MintPanel
          title="Astralyx Genesis"
          minted={Number(state.minted)}
          supply={5000}
          price={Number(state.price)}
          priceLabel="ETH"
          maxPerWallet={Number(state.maxPerWallet)}
          alreadyMinted={Number(state.alreadyMinted)}
          onMint={() => {}}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<MintPanel\n  minted={${state.minted}}\n  supply={5000}\n  price={${state.price}}\n  priceLabel="ETH"\n  maxPerWallet={${state.maxPerWallet}}\n  alreadyMinted={${state.alreadyMinted}}\n/>`,
  },
  api: [
    { name: 'minted / supply', type: 'number', description: 'Drives the progress bar and the sold-out state.' },
    { name: 'maxPerWallet / alreadyMinted', type: 'number', description: 'The cap is enforced against what is already held, not just the quantity in the box.' },
    { name: 'price / priceLabel', type: 'number / string', description: 'A number so the total can be computed and shown before the button.' },
  ],
  demos: [
    { title: 'Mint', stack: true, code: `<MintPanel minted={3820} supply={5000} price={0.08} priceLabel="ETH" />`, render: () => <div className="w-full max-w-sm"><MintPanel title="Astralyx Genesis" minted={3820} supply={5000} price={0.08} priceLabel="ETH" maxPerWallet={5} alreadyMinted={2} onMint={() => {}} /></div> },
  ],
}

/* -------------------------------------------------------------- network status */

export const networkStatusEntry: ComponentEntry = {
  id: 'network-status',
  label: 'Network Status',
  description:
    'RPC health: block height, latency, sync state. Staleness is derived from the age of the last block — a stuck node answers cheerfully with an old height, so "connected" from the node proves nothing.',
  usage: `import { NetworkStatus } from '@/components/ui/network-status'

<NetworkStatus chain="Ethereum" blockHeight={21840112} lastBlockAt={last} latency={84} />`,
  composer: {
    controls: [{ type: 'select', prop: 'state', label: 'state', options: ['healthy', 'slow', 'stale'], default: 'healthy' }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <NetworkStatus
          chain="Ethereum"
          blockHeight={21_840_112}
          lastBlockAt={new Date(NOW.getTime() - (state.state === 'stale' ? 300_000 : 8_000))}
          now={NOW}
          latency={state.state === 'slow' ? 1840 : 84}
          peers={42}
        />
      </div>
    ),
    code: () => `<NetworkStatus chain="Ethereum" blockHeight={21840112} lastBlockAt={last} latency={84} />`,
  },
  api: [
    { name: 'lastBlockAt / blockTime', type: 'Date / number', default: 'blockTime: 12', description: 'Three missed block times counts as stale — stuck, not merely slow.' },
    { name: 'latency', type: 'number', description: 'Milliseconds. Over a second reads as degraded.' },
    { name: 'blockHeight / peers', type: 'number', description: 'Reported as given.' },
  ],
  demos: [
    { title: 'States', stack: true, code: `<NetworkStatus chain="Ethereum" blockHeight={21840112} lastBlockAt={last} />`, render: () => (
      <div className="flex w-full max-w-xl flex-col gap-2">
        <NetworkStatus chain="Ethereum" blockHeight={21_840_112} lastBlockAt={new Date(NOW.getTime() - 8_000)} now={NOW} latency={84} peers={42} />
        <NetworkStatus chain="Arbitrum One" blockHeight={284_112_004} lastBlockAt={new Date(NOW.getTime() - 300_000)} now={NOW} latency={1840} peers={12} />
      </div>
    ) },
  ],
}
