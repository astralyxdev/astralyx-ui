import { useState } from 'react'
import {
  Activity, ArrowLeftRight, CandlestickChart as ChartIcon, Coins, Landmark,
  ShieldCheck, Wallet,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card, CardBody, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { CandlestickChart, type Candle } from '@/components/ui/candlestick-chart'
import { ChainSelect, type Chain } from '@/components/ui/chain-select'
import { GasTracker, type GasTier } from '@/components/ui/gas-tracker'
import { MarketTable, type Market } from '@/components/ui/market-table'
import { NetworkStatus } from '@/components/ui/network-status'
import { NumberInput } from '@/components/ui/number-input'
import { OrderBook, type OrderLevel } from '@/components/ui/order-book'
import { PortfolioBalance, type Holding } from '@/components/ui/portfolio-balance'
import { PriceTicker } from '@/components/ui/price-ticker'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { StakingPanel } from '@/components/ui/staking-panel'
import { SwapPanel } from '@/components/ui/swap-panel'
import { TokenAmount } from '@/components/ui/token-amount'
import { TokenApprovals, type Approval } from '@/components/ui/token-approvals'
import { TokenSelect, type TokenOption } from '@/components/ui/token-select'
import { TransactionList, type WalletTx } from '@/components/ui/transaction-list'
import { TransactionStatus, type TxState } from '@/components/ui/transaction-status'
import { WalletAddress } from '@/components/ui/wallet-address'
import { WalletConnect } from '@/components/ui/wallet-connect'
import { cn } from '@/lib/utils'
import { AppFrame, AppFrameUser, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

/**
 * Every date here is a fixed constant. These pages are prerendered on the
 * server and hydrated in the browser: a `new Date()` at module scope resolves
 * twice, minutes apart, and React tears down the mismatched tree.
 */
const NOW = new Date('2026-09-05T09:20:00Z')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)
const LAST_BLOCK = new Date(NOW.getTime() - 9_000)

const ACCOUNT = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'

const usd = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})
const num = (value: number, decimals = 4) =>
  value.toLocaleString('en-GB', { maximumFractionDigits: decimals })

const NAV: NavItem[] = [
  { id: 'markets', label: 'Markets', icon: <ChartIcon /> },
  { id: 'swap', label: 'Swap', icon: <ArrowLeftRight /> },
  { id: 'wallet', label: 'Wallet', icon: <Wallet /> },
  { id: 'activity', label: 'Activity', icon: <Activity />, badge: <Badge size="sm">4</Badge> },
  { id: 'approvals', label: 'Approvals', icon: <ShieldCheck />, badge: <Badge size="sm" color="amber">3</Badge> },
  { id: 'staking', label: 'Staking', icon: <Landmark /> },
]

const CHAINS: Chain[] = [
  { id: 1, name: 'Ethereum', color: '#627EEA', symbol: 'ETH' },
  { id: 42161, name: 'Arbitrum One', color: '#28A0F0', symbol: 'ETH' },
  { id: 8453, name: 'Base', color: '#0052FF', symbol: 'ETH' },
  { id: 11155111, name: 'Sepolia', color: '#627EEA', symbol: 'ETH', testnet: true },
]

/** Head of chain per network, so switching the picker moves a real number. */
const BLOCK_HEIGHTS: Record<number, number> = {
  1: 22_481_902,
  42161: 341_209_774,
  8453: 24_118_066,
  11155111: 8_902_441,
}

/** Base units alongside the display balance: a wei value has 18 significant
 *  digits, which a JavaScript number cannot hold, so `TokenAmount` is handed
 *  the integer string and does the formatting itself. */
type DeskToken = TokenOption & { price: number; raw: string; decimals: number }

const TOKENS: DeskToken[] = [
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH', name: 'Wrapped Ether', verified: true,
    balance: '2.41', balanceValue: 2.41, fiat: 7915.65,
    price: 3284.5, raw: '2410000000000000000', decimals: 18,
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC', name: 'USD Coin', verified: true,
    balance: '18,240.55', balanceValue: 18_240.55, fiat: 18_240.55,
    price: 1.0, raw: '18240550000', decimals: 6,
  },
  {
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    symbol: 'ARB', name: 'Arbitrum', verified: true,
    balance: '4,820.00', balanceValue: 4820, fiat: 4054.58,
    price: 0.8412, raw: '4820000000000000000000', decimals: 18,
  },
  {
    address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    symbol: 'LDO', name: 'Lido DAO', verified: true,
    balance: '640.00', balanceValue: 640, fiat: 1241.6,
    price: 1.94, raw: '640000000000000000000', decimals: 18,
  },
  {
    address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    symbol: 'USDC', name: 'USD Coin (bridged, unofficial)', verified: false,
    price: 0.9931, raw: '0', decimals: 6,
  },
]

const MARKETS: Market[] = [
  { id: 'btc', rank: 1, symbol: 'BTC', name: 'Bitcoin', price: 67_240.12, change24h: 2.41, volume24h: 28_400_000_000, marketCap: 1_324_000_000_000, history: [64_800, 65_400, 65_100, 66_200, 66_900, 66_400, 67_240] },
  { id: 'eth', rank: 2, symbol: 'ETH', name: 'Ethereum', price: 3284.5, change24h: -1.12, volume24h: 14_200_000_000, marketCap: 394_000_000_000, history: [3350, 3320, 3290, 3310, 3270, 3260, 3284] },
  { id: 'sol', rank: 3, symbol: 'SOL', name: 'Solana', price: 178.32, change24h: 5.87, volume24h: 3_100_000_000, marketCap: 82_000_000_000, history: [166, 169, 172, 170, 175, 177, 178] },
  { id: 'arb', rank: 4, symbol: 'ARB', name: 'Arbitrum', price: 0.8412, change24h: -3.94, volume24h: 412_000_000, marketCap: 3_600_000_000, history: [0.89, 0.88, 0.87, 0.86, 0.85, 0.84, 0.8412] },
  { id: 'ldo', rank: 5, symbol: 'LDO', name: 'Lido DAO', price: 1.94, change24h: 1.08, volume24h: 96_000_000, marketCap: 1_740_000_000, history: [1.88, 1.9, 1.87, 1.91, 1.93, 1.92, 1.94] },
]

/**
 * One OHLC shape, expressed as multiples of the current price and rescaled per
 * market. Five hand-written candle sets would be five chances to fat-finger a
 * high below its close, and the chart is here to show the component, not to
 * carry real tape.
 */
const SHAPE: [number, number, number, number, number][] = [
  [0.942, 0.958, 0.936, 0.951, 1.24],
  [0.951, 0.969, 0.947, 0.948, 0.98],
  [0.948, 0.977, 0.944, 0.972, 1.64],
  [0.972, 0.988, 0.968, 0.981, 1.42],
  [0.981, 0.994, 0.964, 0.969, 1.1],
  [0.969, 1.004, 0.966, 1.001, 2.1],
  [1.001, 1.012, 0.994, 1.006, 1.78],
  [1.006, 1.009, 0.988, 1.0, 1.32],
]
const candlesFor = (price: number): Candle[] =>
  SHAPE.map(([open, high, low, close, volume], index) => ({
    time: index + 1,
    open: open * price,
    high: high * price,
    low: low * price,
    close: close * price,
    volume: volume * 1000,
  }))

/** Ticks are a share of price so the book stays plausible whether the market
 *  trades at $67,000 or at $0.84. */
const LADDER: [number, number][] = [
  [0.00002, 0.842], [0.00005, 1.204], [0.00009, 0.318],
  [0.00014, 2.106], [0.00021, 0.774], [0.0003, 1.482],
]
const bookFor = (price: number) => ({
  bids: LADDER.map(([offset, size]) => ({ price: price * (1 - offset), size })) as OrderLevel[],
  asks: LADDER.map(([offset, size]) => ({ price: price * (1 + offset), size: size * 0.8 })) as OrderLevel[],
})

const HOLDINGS: Holding[] = [
  { id: 'eth', symbol: 'ETH', value: 7915.65, amount: '2.41', change24h: -1.12 },
  { id: 'usdc', symbol: 'USDC', value: 18_240.55, amount: '18,240.55', change24h: 0.01 },
  { id: 'arb', symbol: 'ARB', value: 4054.58, amount: '4,820.00', change24h: -3.94 },
  { id: 'ldo', symbol: 'LDO', value: 1241.6, amount: '640.00', change24h: 1.08 },
  { id: 'ens', symbol: 'ENS', value: 118.4, amount: '5.00', change24h: 0.42 },
  { id: 'cow', symbol: 'COW', value: 46.9, amount: '210.00', change24h: -6.1 },
]

const TXS: WalletTx[] = [
  { hash: '0x9f2c1b7e4a6d8035f1c2e9b0a7d4f6e3c8b5a2d9', from: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', to: ACCOUNT, amount: '1,638.40 USDC', fiat: 1638.4, time: ago(14), kind: 'swap', href: '#' },
  { hash: '0x4a1e8c3b7f2d9051e6a4c8b2d7f3e9a1c5b8d2f6', from: ACCOUNT, to: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', amount: '0.50 WETH', fiat: 1642.25, time: ago(15), kind: 'approve', href: '#' },
  { hash: '0x2d7f3e9a1c5b8d2f64a1e8c3b7f2d9051e6a4c8b', from: ACCOUNT, to: '0x1111111254EEB25477B68fb85Ed929f73A960582', amount: '640.00 LDO', fiat: 1241.6, time: ago(320), kind: 'transfer', href: '#' },
  { hash: '0x8b5a2d9f1e7c4b6a3d0f8e5c2b9a7d49f2c1b7e4', from: ACCOUNT, to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', amount: '250 DAI', fiat: 250, time: ago(2880), kind: 'contract', failed: true, href: '#' },
]

const APPROVALS: Approval[] = [
  { id: 'a1', token: 'USDC', spender: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', spenderName: 'Uniswap Universal Router', unlimited: true, lastUsed: ago(14), atRisk: 18_240 },
  { id: 'a2', token: 'WETH', spender: '0x1111111254EEB25477B68fb85Ed929f73A960582', spenderName: '1inch Aggregation Router v5', allowance: '5.00 WETH', lastUsed: ago(60 * 24 * 12) },
  { id: 'a3', token: 'ARB', spender: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', spenderName: 'Camelot Router', unlimited: true, atRisk: 4054 },
]

const GAS_TIERS: GasTier[] = [
  { id: 'slow', label: 'Slow', price: 14.2, wait: '~4 min' },
  { id: 'normal', label: 'Normal', price: 21.6, wait: '~40 s', recommended: true },
  { id: 'fast', label: 'Fast', price: 34.8, wait: '~12 s' },
]
const GAS_LIMIT = 184_000

/** Depth the quote is priced against. Impact grows with the notional, which is
 *  what makes the swap panel's block threshold reachable by typing. */
const POOL_DEPTH = 180_000

function CryptoDesk() {
  const [section, setSection] = useState('markets')
  const [connected, setConnected] = useState(true)
  const [chainId, setChainId] = useState(1)
  const [marketId, setMarketId] = useState('eth')
  const [starred, setStarred] = useState<string[]>(['btc', 'eth'])
  const [payAddress, setPayAddress] = useState(TOKENS[0].address)
  const [receiveAddress, setReceiveAddress] = useState(TOKENS[1].address)
  const [pay, setPay] = useState(0.5)
  const [slippage, setSlippage] = useState('0.5')
  const [gasTier, setGasTier] = useState('normal')
  const [tx, setTx] = useState<{ state: TxState; confirmations: number; summary: string } | null>(null)
  const [approvals, setApprovals] = useState(APPROVALS)
  const [claimed, setClaimed] = useState(false)
  const [hidden, setHidden] = useState(false)

  const chain = CHAINS.find((item) => item.id === chainId) ?? CHAINS[0]
  const market = MARKETS.find((item) => item.id === marketId) ?? MARKETS[1]
  const { bids, asks } = bookFor(market.price)

  // Quote maths. Impact is a share of the pool rather than a constant, so a
  // large enough amount trips `impactBlock` and disables the action — the point
  // of the panel is that this is visible before signing, not after.
  const payToken = TOKENS.find((item) => item.address === payAddress) ?? TOKENS[0]
  const receiveToken = TOKENS.find((item) => item.address === receiveAddress) ?? TOKENS[1]
  const notional = pay * payToken.price
  const impact = Math.min(30, (notional / POOL_DEPTH) * 100)
  const receive = (notional / receiveToken.price) * (1 - impact / 100)
  const minimum = receive * (1 - Number(slippage) / 100)
  const gasPrice = GAS_TIERS.find((tier) => tier.id === gasTier)?.price ?? 21.6
  const networkFee = gasPrice * 1e-9 * GAS_LIMIT * 3284.5

  const flip = () => {
    setPayAddress(receiveAddress)
    setReceiveAddress(payAddress)
    // Carry the quote across the flip: clearing the field on every direction
    // change is the thing that makes people retype the same number twice.
    setPay(Number(receive.toFixed(receiveToken.price > 100 ? 4 : 2)))
  }

  return (
    <AppFrame
      product="Desk"
      nav={NAV}
      active={section}
      onNavigate={setSection}
      title={NAV.find((item) => item.id === section)?.label}
      footer={<AppFrameUser name="Ada Lovelace" plan="0x742d…f44e" />}
      actions={
        <div className="flex items-center gap-2">
          <ChainSelect
            chains={CHAINS}
            value={chainId}
            onValueChange={setChainId}
            size="sm"
            className="hidden w-44 sm:block"
          />
          <WalletConnect
            address={connected ? ACCOUNT : undefined}
            ensName="ada.eth"
            balance={connected ? '2.41 ETH' : undefined}
            chainName={chain.name}
            // A testnet is not a network this desk quotes against, so the
            // wallet says so instead of showing a balance from another ledger.
            wrongNetwork={chain.testnet}
            onConnect={() => setConnected(true)}
            onDisconnect={() => setConnected(false)}
            onSwitchNetwork={() => setChainId(1)}
            explorerHref="#"
          />
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          <NetworkStatus
            chain={chain.name}
            blockHeight={BLOCK_HEIGHTS[chain.id]}
            lastBlockAt={LAST_BLOCK}
            now={NOW}
            blockTime={chain.id === 1 ? 12 : 2}
            latency={chain.id === 1 ? 84 : 41}
            peers={chain.id === 1 ? 46 : 18}
          />

          <GasTracker
            tiers={GAS_TIERS}
            selected={gasTier}
            onSelect={setGasTier}
            baseFee={16.4}
            gasLimit={GAS_LIMIT}
            nativePrice={3284.5}
          />

          {tx ? (
            <div className="space-y-2">
              <TransactionStatus
                hash="0x9f2c1b7e4a6d8035f1c2e9b0a7d4f6e3c8b5a2d9f1e7c4b6a3d0f8e5c2b9a7d4"
                state={tx.state}
                confirmations={tx.confirmations}
                required={12}
                summary={tx.summary}
                submittedAt={ago(1)}
                now={NOW}
                gasUsed={`${num(networkFee, 2)} USD`}
                href="#"
              />
              {/* Stepping confirmations by hand rather than on a timer: an
                  interval would keep re-rendering a page nobody is watching. */}
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() =>
                  setTx((current) => {
                    if (!current) return current
                    const next = Math.min(12, current.confirmations + 4)
                    return { ...current, confirmations: next, state: next >= 12 ? 'confirmed' : 'mined' }
                  })
                }
              >
                Advance confirmations
              </Button>
            </div>
          ) : (
            <Card size="sm">
              <CardBody className="text-muted-foreground text-xs">
                Submit a swap to watch a transaction from mined to final here.
              </CardBody>
            </Card>
          )}
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        {chain.testnet && (
          <Alert color="amber" title="Sepolia is a test network">
            Quotes and balances on this desk come from mainnet liquidity. Switch back to Ethereum
            before signing anything.
          </Alert>
        )}

        {section === 'markets' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {MARKETS.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMarketId(item.id)}
                  className={cn(
                    'rounded-2xl text-start transition-colors duration-150 ease-out motion-reduce:transition-none',
                    item.id === marketId ? 'ring-ring/50 ring-2' : 'hover:opacity-80',
                  )}
                >
                  <PriceTicker
                    symbol={item.symbol}
                    price={item.price}
                    change={item.change24h}
                    history={item.history}
                  />
                </button>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle as="h2">
                      {market.symbol}/USD
                    </CardTitle>
                    <CardDescription>Eight one-hour candles with volume.</CardDescription>
                  </div>
                  <Badge color={(market.change24h ?? 0) >= 0 ? 'green' : 'rose'}>
                    {(market.change24h ?? 0) >= 0 ? '+' : ''}
                    {market.change24h}%
                  </Badge>
                </CardHeader>
                <CardBody>
                  <CandlestickChart candles={candlesFor(market.price)} height={260} />
                </CardBody>
              </Card>

              <OrderBook
                bids={bids}
                asks={asks}
                depth={6}
                baseSymbol={market.symbol}
                quoteSymbol="USD"
                pricePrecision={market.price > 100 ? 2 : 4}
              />
            </div>

            <MarketTable
              markets={MARKETS.map((item) => ({ ...item, starred: starred.includes(item.id) }))}
              onSelect={setMarketId}
              onStar={(id, next) =>
                setStarred((current) =>
                  next ? [...current, id] : current.filter((item) => item !== id),
                )
              }
            />
          </>
        )}

        {section === 'swap' && (
          <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
            <SwapPanel
              from={{
                symbol: payToken.symbol,
                amount: num(pay, 4),
                fiat: notional,
                balance: payToken.balance,
              }}
              to={{
                symbol: receiveToken.symbol,
                amount: num(receive, receiveToken.price > 100 ? 4 : 2),
                fiat: receive * receiveToken.price,
                balance: receiveToken.balance,
              }}
              rate={`1 ${payToken.symbol} = ${num(payToken.price / receiveToken.price, 4)} ${receiveToken.symbol}`}
              priceImpact={Number(impact.toFixed(2))}
              minimumReceived={`${num(minimum, 2)} ${receiveToken.symbol}`}
              networkFee={`~${usd.format(networkFee)}`}
              slippage={Number(slippage)}
              onFlip={flip}
              onSwap={() =>
                setTx({
                  state: 'mined',
                  confirmations: 3,
                  summary: `Swap ${num(pay, 4)} ${payToken.symbol} for ${num(receive, 2)} ${receiveToken.symbol}`,
                })
              }
            />

            <Card>
              <CardHeader>
                <CardTitle as="h2">Route</CardTitle>
                <CardDescription>
                  Everything on the left is derived from these three controls.
                </CardDescription>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs">You pay</span>
                  <TokenSelect tokens={TOKENS} value={payAddress} onValueChange={setPayAddress} />
                  <NumberInput
                    value={pay}
                    // NumberInput reports undefined when the field is cleared;
                    // an empty leg is zero here, not absent.
                    onValueChange={(next) => setPay(next ?? 0)}
                    min={0}
                    step={0.1}
                    precision={4}
                    suffix={payToken.symbol}
                    variant="secondary"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs">You receive</span>
                  <TokenSelect
                    tokens={TOKENS}
                    value={receiveAddress}
                    onValueChange={setReceiveAddress}
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs">Slippage tolerance</span>
                  <SegmentedControl
                    fullWidth
                    size="sm"
                    label="Slippage tolerance"
                    value={slippage}
                    onValueChange={setSlippage}
                    options={[
                      { value: '0.1', label: '0.1%' },
                      { value: '0.5', label: '0.5%' },
                      { value: '1', label: '1%' },
                    ]}
                  />
                </div>

                <p className="text-muted-foreground text-xs">
                  Try 60 {payToken.symbol}: the quote eats the pool and the swap button locks.
                </p>
              </CardBody>
            </Card>
          </div>
        )}

        {section === 'wallet' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <PortfolioBalance
              holdings={HOLDINGS}
              change24h={-0.42}
              hidden={hidden}
              onHiddenChange={setHidden}
            />

            <Card>
              <CardHeader>
                <CardTitle as="h2">Balances</CardTitle>
                <CardDescription>Formatted from base units, never a float.</CardDescription>
              </CardHeader>
              <CardBody className="space-y-3">
                <WalletAddress address={ACCOUNT} name="ada.eth" href="#" />
                {TOKENS.filter((token) => token.verified && token.raw !== '0').map((token) => (
                  <div
                    key={token.address}
                    className="border-border flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-medium">{token.name}</span>
                    <TokenAmount
                      value={token.raw}
                      decimals={token.decimals}
                      symbol={token.symbol}
                      fiat={token.fiat}
                      precision={4}
                    />
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        )}

        {section === 'activity' && (
          <Card>
            <CardHeader>
              <CardTitle as="h2">Recent activity</CardTitle>
              <CardDescription>Direction is read against this account.</CardDescription>
            </CardHeader>
            <CardBody>
              <TransactionList transactions={TXS} account={ACCOUNT} now={NOW} />
            </CardBody>
          </Card>
        )}

        {section === 'approvals' && (
          <div className="max-w-2xl space-y-4">
            <Alert color="amber" title="Two unlimited allowances are live">
              An unlimited approval lets a contract move the whole balance for as long as it stands.
              Revoking costs gas but is the only thing that ends it.
            </Alert>
            <TokenApprovals
              approvals={approvals}
              now={NOW}
              onRevoke={(id) => setApprovals((current) => current.filter((item) => item.id !== id))}
            />
          </div>
        )}

        {section === 'staking' && (
          <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
            <StakingPanel
              token={<span className="inline-flex items-center gap-1.5"><Coins className="size-4" /> LDO</span>}
              staked="640.00 LDO"
              rewards={claimed ? '0.00 LDO' : '18.42 LDO'}
              apy={7.4}
              unbonding="21 days"
              unlockProgress={64}
              unlockLabel="14 of 21 days elapsed"
              claimDisabled={claimed}
              onStake={() => undefined}
              onUnstake={() => undefined}
              onClaim={() => setClaimed(true)}
            />
            <Card>
              <CardHeader>
                <CardTitle as="h2">Position</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Value staked</span>
                  <span className="tabular-nums">{usd.format(1241.6)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Claimed this epoch</span>
                  <span className="tabular-nums">{claimed ? usd.format(35.73) : usd.format(0)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Validator</span>
                  <WalletAddress
                    address="0x1111111254EEB25477B68fb85Ed929f73A960582"
                    size="sm"
                    chars={4}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </AppFrame>
  )
}

export const cryptoDeskExample: ExampleEntry = {
  id: 'crypto-desk',
  label: 'Crypto Desk',
  description:
    'A wallet and trading surface: a live quote whose price impact climbs with the amount, a market list that drives the candles and the book, and the approvals, staking and network state behind it.',
  uses: [
    'Wallet Connect', 'Swap Panel', 'Token Select', 'Chain Select', 'Market Table',
    'Candlestick Chart', 'Order Book', 'Portfolio Balance', 'Transaction List',
    'Transaction Status', 'Gas Tracker', 'Token Approvals', 'Staking Panel',
    'Price Ticker', 'Network Status', 'Token Amount', 'Wallet Address',
  ],
  render: () => <CryptoDesk />,
}
