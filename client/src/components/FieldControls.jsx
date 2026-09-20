import { useRef, useState } from 'react'

const CHOICES_ADD_VALUE = '__add__'

export function SingleSelectControl({ choices, value, onChange, onAddChoice }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  function handleSelect(e) {
    if (e.target.value === CHOICES_ADD_VALUE) {
      setAdding(true)
      setDraft('')
      return
    }
    onChange(e.target.value || null)
  }

  async function submitAdd(e) {
    e.preventDefault()
    const name = draft.trim()
    if (!name) return
    await onAddChoice(name)
    onChange(name)
    setAdding(false)
    setDraft('')
  }

  if (adding) {
    return (
      <form onSubmit={submitAdd} className="w-full px-2 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New option name"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAdding(false)
          }}
          className="w-full rounded border border-indigo-300 px-2 py-1 text-sm outline-none ring-1 ring-indigo-300"
        />
        <div className="mt-1 flex gap-1.5">
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <select
      value={value ?? ''}
      onChange={handleSelect}
      className="w-full bg-transparent px-3 py-2 text-sm text-gray-700 outline-none"
    >
      <option value="">—</option>
      {(choices.length ? choices : []).map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
      <option value={CHOICES_ADD_VALUE}>＋ Add new option…</option>
    </select>
  )
}

export function MultiSelectControl({ choices, value, onChange, onAddChoice }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const current = Array.isArray(value) ? value : []

  function toggle(choice) {
    onChange(
      current.includes(choice)
        ? current.filter((c) => c !== choice)
        : [...current, choice],
    )
  }

  async function submitAdd(e) {
    e.preventDefault()
    const name = draft.trim()
    if (!name) return
    await onAddChoice(name)
    onChange([...current, name])
    setAdding(false)
    setDraft('')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full truncate px-3 py-2 text-left text-sm text-gray-700 hover:bg-amber-50"
      >
        {current.join(', ') || '\u00A0'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-1 top-1 z-50 mt-px w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            {choices.length === 0 && (
              <p className="px-1 py-1 text-xs text-gray-400">No choices yet. Add one below.</p>
            )}
            {(choices.length ? choices : []).map((choice) => (
              <label
                key={choice}
                className="flex items-center gap-2 rounded px-1 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={current.includes(choice)}
                  onChange={() => toggle(choice)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="truncate">{choice}</span>
              </label>
            ))}
            {adding ? (
              <form onSubmit={submitAdd} className="mt-1 border-t border-gray-100 pt-1.5">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="New option name"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setAdding(false)
                  }}
                  className="w-full rounded border border-indigo-300 px-2 py-1 text-sm outline-none ring-1 ring-indigo-300"
                />
                <div className="mt-1 flex gap-1.5">
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="mt-1.5 w-full rounded border-t border-gray-100 pt-1.5 text-left text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                ＋ Add new option…
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function AttachmentControl({ value, onUpload, onRemove, compact = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const items = Array.isArray(value) ? value : []

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await onUpload(file)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const chipClass = compact
    ? 'flex w-full items-center gap-2 px-3 py-1.5 text-xs'
    : 'flex w-full items-center gap-2 px-3 py-1.5 text-sm'

  return (
    <div className="w-full">
      {items.map((item, i) => (
        <div key={i} className={chipClass}>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 truncate text-indigo-600 hover:underline"
            >
              {item.name || 'file'}
            </a>
          ) : (
            <span className="min-w-0 truncate text-gray-500">{item.name || 'file'}</span>
          )}
          <button
            onClick={() => onRemove(i)}
            title="Remove file"
            className="ml-auto shrink-0 rounded px-1 text-gray-400 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      ))}
      <input ref={inputRef} type="file" onChange={handleFile} className="hidden" />
      {error && <p className="truncate px-3 py-1 text-xs text-red-600">{error}</p>}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full px-3 py-1.5 text-left text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
      >
        {busy ? 'Uploading…' : '+ Upload file'}
      </button>
    </div>
  )
}