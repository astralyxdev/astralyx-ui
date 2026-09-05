import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An audio element with a scrubber, built on the real `<audio>` element.
 *
 * The element does the work — buffering, codecs, media keys, the OS lock
 * screen, Bluetooth controls — and this draws the surface over it. A player
 * built on `AudioContext` for the sake of a nicer waveform loses all of that,
 * and the waveform is the least important part.
 *
 * **State is read from the element, not mirrored beside it.** `timeupdate`,
 * `play` and `pause` all fire whether the change came from this UI, a media
 * key, or the OS — so mirroring into React state means the two disagree the
 * moment anything else touches playback.
 *
 * **The scrubber is an `<input type="range">`.** Keyboard seeking, page-up
 * jumps, screen-reader announcement and touch drag are all native. It is
 * scrubbing *while dragging* that needs care: `dragging` suspends the
 * `timeupdate` handler, or every frame of playback yanks the thumb back out of
 * your hand.
 *
 * `peaks` draws a waveform behind the track when you have one. Computing it
 * here would mean decoding the whole file in the main thread before the first
 * frame — the caller either has it precomputed or does not want it.
 */
// Omitted because the DOM declares it too, and in an intersection the DOM
// signature wins — which left the prop below unusable and the generated docs
// advertising the browser's handler instead of ours.
type AudioPlayerProps = Omit<ComponentProps<'div'>, 'title' | 'onEnded'> & {
  src: string
  title?: ReactNode
  artist?: ReactNode
  /** Precomputed amplitudes, 0–1. Drawn behind the scrubber. */
  peaks?: number[]
  /** Start muted — required for anything that also autoplays. */
  defaultMuted?: boolean
  /** Seconds a skip button moves. */
  skipBy?: number
  /** Hide the skip buttons for a short clip. */
  showSkip?: boolean
  /** Cover art. */
  artwork?: ReactNode
  onEnded?: () => void
  playLabel?: string
  pauseLabel?: string
  muteLabel?: string
  unmuteLabel?: string
  seekLabel?: string
  backLabel?: string
  forwardLabel?: string
  /** Formats the clock. Defaults to `m:ss`, and `h:mm:ss` past an hour. */
  formatTime?: (seconds: number) => string
}

function defaultTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const whole = Math.floor(seconds)
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const s = whole % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function AudioPlayer({
  src,
  title,
  artist,
  peaks,
  defaultMuted = false,
  skipBy = 15,
  showSkip = true,
  artwork,
  onEnded,
  playLabel = 'Play',
  pauseLabel = 'Pause',
  muteLabel = 'Mute',
  unmuteLabel = 'Unmute',
  seekLabel = 'Seek',
  backLabel = 'Back',
  forwardLabel = 'Forward',
  formatTime = defaultTime,
  className,
  ...props
}: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement>(null)
  const id = useId()

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(defaultMuted)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Every listener reads back off the element, so a media key or the OS lock
  // screen keeps this UI correct without going through it.
  useEffect(() => {
    const audio = ref.current
    if (!audio) return

    const onTime = () => {
      // Suspended while scrubbing, or playback yanks the thumb out of your hand.
      if (!dragging) setTime(audio.currentTime)
    }
    const onMeta = () => setDuration(audio.duration)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolume = () => setMuted(audio.muted)
    const onEnd = () => {
      setPlaying(false)
      onEnded?.()
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('volumechange', onVolume)
    audio.addEventListener('ended', onEnd)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('volumechange', onVolume)
      audio.removeEventListener('ended', onEnd)
    }
  }, [dragging, onEnded])

  const seek = useCallback((seconds: number) => {
    const audio = ref.current
    if (!audio) return
    audio.currentTime = Math.min(Math.max(0, seconds), audio.duration || 0)
  }, [])

  const progress = duration > 0 ? time / duration : 0

  return (
    <div
      data-slot="audio-player"
      data-playing={playing || undefined}
      className={cn(surface, radius.surface, 'flex items-center gap-4 p-4', className)}
      {...props}
    >
      {/* The real element. Hidden, never removed — it is what actually plays. */}
      <audio ref={ref} src={src} muted={defaultMuted} preload="metadata" className="sr-only" />

      {artwork && (
        <div className={cn('size-14 shrink-0 overflow-hidden', radius.control)}>{artwork}</div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {(title || artist) && (
          <div className="min-w-0">
            {title && <p className="truncate text-sm font-medium">{title}</p>}
            {artist && <p className="text-muted-foreground truncate text-xs">{artist}</p>}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={playing ? pauseLabel : playLabel}
            className="shrink-0"
            onClick={() => {
              const audio = ref.current
              if (!audio) return
              if (audio.paused) void audio.play()
              else audio.pause()
            }}
          >
            {playing ? <Pause /> : <Play />}
          </Button>

          {showSkip && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${backLabel} ${skipBy}s`}
                className="shrink-0"
                onClick={() => seek(time - skipBy)}
              >
                <SkipBack />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${forwardLabel} ${skipBy}s`}
                className="shrink-0"
                onClick={() => seek(time + skipBy)}
              >
                <SkipForward />
              </Button>
            </>
          )}

          <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
            {formatTime(time)}
          </span>

          <div className="relative min-w-0 flex-1">
            {/* Behind the track, never in front: the range input has to stay
                the thing you actually grab. */}
            {peaks && peaks.length > 0 && (
              <div aria-hidden="true" className="absolute inset-0 flex items-center gap-px">
                {peaks.map((peak, index) => (
                  <span
                    key={index}
                    className={cn(
                      'flex-1 rounded-full',
                      index / peaks.length <= progress ? 'bg-foreground/70' : 'bg-muted-foreground/25',
                    )}
                    style={{ height: `${Math.max(8, peak * 100)}%` }}
                  />
                ))}
              </div>
            )}

            <input
              id={id}
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={time}
              aria-label={seekLabel}
              aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
              onPointerDown={() => setDragging(true)}
              onPointerUp={() => setDragging(false)}
              onKeyDown={() => setDragging(true)}
              onKeyUp={() => setDragging(false)}
              onChange={(event) => {
                const next = Number(event.target.value)
                setTime(next)
                seek(next)
              }}
              className={cn(
                'relative h-6 w-full cursor-pointer appearance-none bg-transparent',
                focusRing,
                radius.control,
                // Track and thumb have to be styled per engine; there is no
                // cross-browser shorthand for either.
                '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full',
                peaks?.length
                  ? '[&::-webkit-slider-runnable-track]:bg-transparent'
                  : '[&::-webkit-slider-runnable-track]:bg-muted',
                '[&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none',
                '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground',
                '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted',
                '[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground',
              )}
            />
          </div>

          <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
            {formatTime(duration)}
          </span>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={muted ? unmuteLabel : muteLabel}
            className="shrink-0"
            onClick={() => {
              const audio = ref.current
              if (audio) audio.muted = !audio.muted
            }}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export { AudioPlayer, defaultTime as formatAudioTime }
export type { AudioPlayerProps }
