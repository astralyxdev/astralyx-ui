import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import {
  Maximize,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A video player with a real scrubber, quality and subtitle menus.
 *
 * The scrubber is an `input[type=range]`, not a div with a drag handler. That
 * one decision buys arrow-key seeking, Home and End, screen-reader
 * announcement of the position and a working focus ring — all of which a
 * hand-rolled track has to reimplement and usually does not.
 *
 * Time is formatted from the media's own duration, so an hour-long video shows
 * `1:02:15` and a clip shows `0:42` rather than `00:00:42`. Padding every clip
 * to hours is the giveaway of a player that formats blindly.
 *
 * Subtitles default to off but the menu is always present. A player that hides
 * the menu when only one track exists makes people believe there are none.
 */
export type VideoTrack = { id: string; label: ReactNode }

function formatTime(seconds: number, showHours: boolean) {
  if (!Number.isFinite(seconds)) return showHours ? '0:00:00' : '0:00'
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return showHours ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_PROGRESS_LABEL: (at: string, total: string) => string = (at, total) => `${at} of ${total}`

function VideoPlayer({
  src,
  poster,
  qualities,
  quality,
  onQualityChange,
  subtitles,
  subtitle,
  onSubtitleChange,
  title,
  playLabel = 'Play',
  pauseLabel = 'Pause',
  muteLabel = 'Mute',
  unmuteLabel = 'Unmute',
  seekLabel = 'Seek',
  settingsLabel = 'Playback settings',
  fullscreenLabel = 'Full screen',
  qualityLabel = 'Quality',
  subtitlesLabel = 'Subtitles',
  subtitlesOffLabel = 'Off',
  progressLabel = DEFAULT_PROGRESS_LABEL,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  src: string
  poster?: string
  qualities?: VideoTrack[]
  quality?: string
  onQualityChange?: (id: string) => void
  subtitles?: VideoTrack[]
  subtitle?: string | null
  onSubtitleChange?: (id: string | null) => void
  title?: ReactNode
  playLabel?: string
  pauseLabel?: string
  muteLabel?: string
  unmuteLabel?: string
  /** Accessible name for the scrubber. */
  seekLabel?: string
  settingsLabel?: string
  fullscreenLabel?: string
  /** Heading over the quality menu. */
  qualityLabel?: ReactNode
  /** Heading over the subtitle menu. */
  subtitlesLabel?: ReactNode
  /** The "no subtitles" choice, which is a real selection. */
  subtitlesOffLabel?: ReactNode
  /** Spoken position, given the formatted current time and duration. */
  progressLabel?: (at: string, total: string) => string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => setTime(video.currentTime)
    const onMeta = () => setDuration(video.duration)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    video.addEventListener('timeupdate', onTime)
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [])

  // Only pad to hours when the media actually runs that long.
  const showHours = duration >= 3600

  return (
    <div
      data-slot="video-player"
      className={cn('bg-[var(--sidebar)] relative overflow-hidden', radius.surface, className)}
      {...props}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="aspect-video w-full"
        onClick={() => (playing ? videoRef.current?.pause() : videoRef.current?.play())}
      />

      <div className="flex flex-col gap-2 p-3">
        {/* A real range input: arrow keys, Home/End and announcement for free. */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          aria-label={seekLabel}
          aria-valuetext={progressLabel(formatTime(time, showHours), formatTime(duration, showHours))}
          onChange={(event) => {
            const next = Number(event.target.value)
            setTime(next)
            if (videoRef.current) videoRef.current.currentTime = next
          }}
          className={cn('w-full accent-[var(--primary)]', focusRing, radius.xs)}
        />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={playing ? pauseLabel : playLabel}
            className="text-[var(--sidebar-foreground)] hover:bg-white/10"
            onClick={() => (playing ? videoRef.current?.pause() : videoRef.current?.play())}
          >
            {playing ? <Pause /> : <Play />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={muted ? unmuteLabel : muteLabel}
            className="text-[var(--sidebar-foreground)] hover:bg-white/10"
            onClick={() => {
              const next = !muted
              setMuted(next)
              if (videoRef.current) videoRef.current.muted = next
            }}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>

          <span className="text-[var(--sidebar-foreground)]/80 ms-1 font-mono text-xs tabular-nums">
            {formatTime(time, showHours)} / {formatTime(duration, showHours)}
          </span>

          {title && (
            <span className="text-[var(--sidebar-foreground)]/70 ms-3 min-w-0 flex-1 truncate text-xs">
              {title}
            </span>
          )}

          <div className="ms-auto flex items-center gap-1">
            {/* Always present, even with one track — hiding it makes people
                believe there are no subtitles at all. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={settingsLabel}
                  className="text-[var(--sidebar-foreground)] hover:bg-white/10"
                >
                  <Settings />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {qualities && qualities.length > 0 && (
                  <>
                    <DropdownMenuLabel>{qualityLabel}</DropdownMenuLabel>
                    {qualities.map((track) => (
                      <DropdownMenuItem
                        key={track.id}
                        onSelect={() => onQualityChange?.(track.id)}
                        className={cn(track.id === quality && 'font-medium')}
                      >
                        {track.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                <DropdownMenuLabel>{subtitlesLabel}</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => onSubtitleChange?.(null)}
                  className={cn(!subtitle && 'font-medium')}
                >
                  {subtitlesOffLabel}
                </DropdownMenuItem>
                {(subtitles ?? []).map((track) => (
                  <DropdownMenuItem
                    key={track.id}
                    onSelect={() => onSubtitleChange?.(track.id)}
                    className={cn(track.id === subtitle && 'font-medium')}
                  >
                    {track.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={fullscreenLabel}
              className="text-[var(--sidebar-foreground)] hover:bg-white/10"
              onClick={() => videoRef.current?.requestFullscreen?.()}
            >
              <Maximize />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { VideoPlayer, formatTime }
