import { useRef, useState, type DragEvent } from 'react'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
  imageApi,
} from '../../lib/api/images'
import { asApiError } from '../../lib/useAsync'
import { Button } from './Button'

interface ImagePickerProps {
  label: string
  /** Current image URL, or '' for none. */
  value: string
  onChange: (url: string) => void
  /** Tighter layout for answer options. */
  compact?: boolean
}

/**
 * Uploads a picked or dropped file and hands back the stored URL. Also accepts an
 * externally hosted URL pasted by hand, so quizzes authored before uploads existed
 * keep working.
 */
export function ImagePicker({ label, value, onChange, compact = false }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [broken, setBroken] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')

  const commitUrl = () => {
    const url = urlDraft.trim()
    if (!url) {
      return
    }
    setError(undefined)
    setBroken(false)
    setUrlDraft('')
    onChange(url)
  }

  const upload = async (file: File) => {
    setError(undefined)

    // Checked here too so an oversized or wrong-typed file never leaves the browser.
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Use a PNG, JPEG, GIF or WebP image.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(
        `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_IMAGE_LABEL}.`,
      )
      return
    }

    setUploading(true)
    try {
      const uploaded = await imageApi.upload(file)
      setBroken(false)
      onChange(uploaded.url)
    } catch (cause) {
      setError(asApiError(cause).message)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) {
      void upload(file)
    }
  }

  const clear = () => {
    setError(undefined)
    setBroken(false)
    onChange('')
  }

  return (
    <div>
      <p
        className={`mb-1.5 font-medium text-slate-700 ${compact ? 'text-xs text-slate-500' : 'text-sm'}`}
      >
        {label}
      </p>

      {value ? (
        <div className="flex items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200 ring-inset">
          {broken ? (
            <div
              className={`grid shrink-0 place-items-center rounded bg-red-50 px-3 text-center text-xs text-red-700 ${
                compact ? 'h-14 w-20' : 'h-24 w-32'
              }`}
            >
              Could not load
            </div>
          ) : (
            <img
              src={value}
              alt=""
              onError={() => setBroken(true)}
              className={`shrink-0 rounded bg-slate-50 object-contain ${
                compact ? 'h-14 w-20' : 'h-24 w-32'
              }`}
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-slate-500">{value}</p>
            <div className="mt-2 flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clear}
                className="text-red-600 hover:bg-red-50"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-lg border border-dashed px-4 text-center transition-colors ${
            compact ? 'py-3' : 'py-6'
          } ${dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'}`}
        >
          <Button size="sm" pending={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? 'Uploading…' : 'Choose image'}
          </Button>
          <p className="mt-2 text-xs text-slate-500">
            or drag one here — PNG, JPEG, GIF or WebP, up to {MAX_IMAGE_LABEL}
          </p>

          {/* Committed on Enter or via the button, not per keystroke: setting `value`
              swaps this input out for the preview, which would cut off typing. */}
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <input
              type="text"
              value={urlDraft}
              maxLength={1024}
              placeholder="…or paste an image URL"
              aria-label={`${label} — external URL`}
              onChange={(event) => setUrlDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitUrl()
                }
              }}
              className="block min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200 ring-inset focus:ring-2 focus:ring-brand-600"
            />
            <Button size="sm" disabled={urlDraft.trim().length === 0} onClick={commitUrl}>
              Use
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void upload(file)
          }
          // Reset so picking the same file again still fires a change event.
          event.target.value = ''
        }}
      />
    </div>
  )
}
