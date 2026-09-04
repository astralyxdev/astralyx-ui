import { useCallback, useEffect, useId, useRef, useState } from 'react'

/**
 * The upload state machine, shared by every control that accepts a file.
 *
 * `Dropzone` and `InputFile` are two shapes of the same job — a card you drop
 * onto, a field you put in a form row — and the part underneath is identical:
 * take some `File`s, move each one through queued → uploading → done or error,
 * report progress, and keep a failure on screen with a way to try again.
 *
 * It lives here rather than in either component because the alternative is the
 * same forty lines written twice and drifting, and because the version people
 * write in a hurry is the one that drops a failure silently.
 *
 * Every request gets an `AbortController`. Removing a row, replacing a
 * single-file selection, or unmounting aborts it — an upload that resolves into
 * a component that has stopped caring is a memory leak at best and a state
 * update on a dead row at worst.
 */
export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error'

/** One selected file and everything known about it. */
export type FileUpload = {
  /** Stable across the file's whole life — use it as a React key. */
  id: string
  /** The browser's `File`. Put this straight into a `FormData`. */
  file: File
  name: string
  /** Bytes. */
  size: number
  /** MIME type, from the browser. Empty string when it cannot tell. */
  type: string
  lastModified: number
  status: UploadStatus
  /** 0–1. Only meaningful while `status` is `'uploading'`. */
  progress: number
  /** Whatever `onUpload` resolved to — an id, a URL, the parsed response. */
  result?: unknown
  error?: string
}

export type UploadControl = {
  /** Pass to `fetch`. Aborts on remove, replace or unmount. */
  signal: AbortSignal
  /** Report 0–1. Without it the bar stays indeterminate, which is honest. */
  onProgress: (fraction: number) => void
}

export type UploadHandler = (
  upload: FileUpload,
  control: UploadControl,
) => Promise<unknown> | unknown

export type UseUploadsOptions = {
  onUpload?: UploadHandler
  multiple?: boolean
  /** Rejected before the request is made, in bytes. */
  maxSize?: number
  /** Message for a file over `maxSize`. Receives the limit, pre-formatted. */
  maxSizeLabel?: (limit: string) => string
  /** Restrict by MIME type or extension, in `accept` syntax. */
  accept?: string
  /** Message for a file the `accept` list refuses. */
  acceptLabel?: (accept: string) => string
  /** Fires on selection, before any upload starts. */
  onSelect?: (uploads: FileUpload[]) => void
  /** Fires on every transition — start, progress, finish, failure, removal. */
  onUploadsChange?: (uploads: FileUpload[]) => void
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

/**
 * Does the file satisfy an `accept` string?
 *
 * Handles all three forms the attribute allows — `.png`, `image/*` and an exact
 * `application/pdf`. The browser already filters the picker, but a dropped file
 * never went through the picker, so this is the only check that sees it.
 */
export function matchesAccept(file: File, accept: string | undefined) {
  if (!accept) return true

  return accept
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => {
      if (entry.startsWith('.')) return file.name.toLowerCase().endsWith(entry)
      if (entry.endsWith('/*')) return file.type.startsWith(entry.slice(0, -1))
      return file.type.toLowerCase() === entry
    })
}

export function useUploads({
  onUpload,
  multiple = false,
  maxSize,
  maxSizeLabel,
  accept,
  acceptLabel,
  onSelect,
  onUploadsChange,
}: UseUploadsOptions) {
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const scope = useId()

  // Keyed by upload id, so removing one file aborts only its own request.
  const controllers = useRef(new Map<string, AbortController>())

  useEffect(() => {
    const pending = controllers.current
    return () => {
      for (const controller of pending.values()) controller.abort()
      pending.clear()
    }
  }, [])

  // Latest-value refs. The callbacks below are stable, so reading the props
  // through a ref keeps a caller's inline arrow from restarting anything.
  const latest = useRef({ onUpload, onUploadsChange })
  latest.current = { onUpload, onUploadsChange }

  const patch = useCallback((id: string, change: Partial<FileUpload>) => {
    setUploads((current) => {
      const next = current.map((upload) =>
        upload.id === id ? { ...upload, ...change } : upload,
      )
      latest.current.onUploadsChange?.(next)
      return next
    })
  }, [])

  const start = useCallback(
    async (upload: FileUpload) => {
      const handler = latest.current.onUpload
      if (!handler) return

      const controller = new AbortController()
      controllers.current.set(upload.id, controller)
      patch(upload.id, { status: 'uploading', progress: 0, error: undefined })

      try {
        const result = await handler(upload, {
          signal: controller.signal,
          onProgress: (fraction) => {
            if (controller.signal.aborted) return
            patch(upload.id, { progress: Math.min(Math.max(fraction, 0), 1) })
          },
        })
        if (controller.signal.aborted) return
        patch(upload.id, { status: 'done', progress: 1, result })
      } catch (thrown) {
        // An abort is a removal, not a failure — that row is already gone.
        if (controller.signal.aborted) return
        patch(upload.id, {
          status: 'error',
          error: thrown instanceof Error ? thrown.message : String(thrown),
        })
      } finally {
        controllers.current.delete(upload.id)
      }
    },
    [patch],
  )

  const select = useCallback(
    (files: File[]) => {
      const accepted = multiple ? files : files.slice(0, 1)

      const next: FileUpload[] = accepted.map((file, index) => {
        const tooBig = maxSize !== undefined && file.size > maxSize
        const wrongType = !matchesAccept(file, accept)

        let error: string | undefined
        if (wrongType && accept) {
          error = acceptLabel ? acceptLabel(accept) : `Not an accepted file type (${accept})`
        } else if (tooBig && maxSize !== undefined) {
          const limit = formatBytes(maxSize)
          error = maxSizeLabel ? maxSizeLabel(limit) : `Larger than the ${limit} limit`
        }

        return {
          // A name and a timestamp are not unique enough on their own: picking
          // the same file twice in one go would collide and React would reuse
          // the row.
          id: `${scope}-${Date.now()}-${index}-${file.name}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          status: error ? ('error' as const) : ('queued' as const),
          progress: 0,
          error,
        }
      })

      setUploads((current) => {
        // A single-file control replaces rather than appends, so the old
        // request is abandoned instead of racing the new one.
        if (!multiple) {
          for (const controller of controllers.current.values()) controller.abort()
          controllers.current.clear()
        }
        const merged = multiple ? [...current, ...next] : next
        latest.current.onUploadsChange?.(merged)
        return merged
      })

      onSelect?.(next)
      for (const upload of next) {
        if (upload.status === 'queued') void start(upload)
      }
    },
    [accept, acceptLabel, maxSize, maxSizeLabel, multiple, onSelect, scope, start],
  )

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort()
    controllers.current.delete(id)
    setUploads((current) => {
      const next = current.filter((upload) => upload.id !== id)
      latest.current.onUploadsChange?.(next)
      return next
    })
  }, [])

  const retry = useCallback(
    (id: string) => {
      setUploads((current) => {
        const upload = current.find((item) => item.id === id)
        if (upload) void start({ ...upload, status: 'queued', error: undefined })
        return current
      })
    },
    [start],
  )

  const clear = useCallback(() => {
    for (const controller of controllers.current.values()) controller.abort()
    controllers.current.clear()
    setUploads([])
    latest.current.onUploadsChange?.([])
  }, [])

  return {
    uploads,
    select,
    remove,
    retry,
    clear,
    uploading: uploads.some((upload) => upload.status === 'uploading'),
    failed: uploads.some((upload) => upload.status === 'error'),
    done: uploads.filter((upload) => upload.status === 'done').length,
  }
}
