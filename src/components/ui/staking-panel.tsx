import type { ComponentProps, ReactNode } from 'react'
import { Clock, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A staking position: what is staked, what it earns, when it unlocks.
 *
 * APY is labelled as variable unless told otherwise, because it almost always
 * is — it moves with total stake and emissions. A bare "12.4% APY" reads as a
 * fixed-term rate, which it is not, and that misreading is the entire business
 * model of some protocols.
 *
 * The unbonding period is given as much weight as the yield. It is the part
 * that actually constrains the user, and it is routinely buried.
 */
function StakingPanel({
  token,
  staked,
  rewards,
  apy,
  apyFixed = false,
  unbonding,
  unlockProgress,
  unlockLabel,
  onStake,
  onUnstake,
  onClaim,
  claimDisabled = false,
  stakedLabel = 'Staked',
  rewardsLabel = 'Rewards',
  variableRateNote = 'Rate is variable — it moves with total stake and emissions.',
  unbondingLabel = 'Unbonding period',
  stakeLabel = 'Stake',
  unstakeLabel = 'Unstake',
  claimLabel = 'Claim',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  token: ReactNode
  staked: ReactNode
  rewards?: ReactNode
  /** Percentage. */
  apy?: number
  /** Only set this when the rate genuinely cannot move. */
  apyFixed?: boolean
  /** e.g. "21 days" */
  unbonding?: ReactNode
  /** 0–1 through an in-progress unbonding. */
  unlockProgress?: number
  unlockLabel?: ReactNode
  onStake?: () => void
  onUnstake?: () => void
  onClaim?: () => void
  claimDisabled?: boolean
  stakedLabel?: ReactNode
  rewardsLabel?: ReactNode
  /** Shown unless `apyFixed`. Pass `null` to drop it. */
  variableRateNote?: ReactNode
  unbondingLabel?: ReactNode
  stakeLabel?: ReactNode
  unstakeLabel?: ReactNode
  claimLabel?: ReactNode
}) {
  return (
    <div
      data-slot="staking-panel"
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{token}</span>
        {apy !== undefined && (
          <Badge size="sm" color="green" className="ms-auto">
            <TrendingUp />
            {apy.toFixed(2)}% APY
          </Badge>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className={cn('bg-secondary/60 p-3', radius.control)}>
          <dt className="text-muted-foreground text-xs">{stakedLabel}</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{staked}</dd>
        </div>
        <div className={cn('bg-secondary/60 p-3', radius.control)}>
          <dt className="text-muted-foreground text-xs">{rewardsLabel}</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--green-soft-foreground)]">
            {rewards ?? '—'}
          </dd>
        </div>
      </dl>

      {/* Rate honesty: variable unless the protocol truly fixes it. */}
      {apy !== undefined && !apyFixed && (
        <p className="text-muted-foreground/80 text-xs">
          {variableRateNote}
        </p>
      )}

      {unbonding && (
        <div className="border-border flex flex-col gap-2 border-t pt-3">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {unbondingLabel} <span className="text-foreground font-medium">{unbonding}</span>
            </span>
          </div>

          {unlockProgress !== undefined && (
            <div className="flex flex-col gap-1">
              <Progress value={unlockProgress * 100} className="h-1.5" />
              {unlockLabel && (
                <span className="text-muted-foreground/70 text-xs">{unlockLabel}</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onStake && (
          <Button className="flex-1" onClick={onStake}>
            {stakeLabel}
          </Button>
        )}
        {onUnstake && (
          <Button variant="secondary" className="flex-1" onClick={onUnstake}>
            {unstakeLabel}
          </Button>
        )}
        {onClaim && (
          <Button variant="secondary" disabled={claimDisabled} onClick={onClaim}>
            {claimLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

export { StakingPanel }
