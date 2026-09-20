import { useState } from 'react'

function Sidebar({ bases, activeBaseId, onCreate, onRename, onDelete, onSelect }) {
  const [creating, setCreating] = useState(false)
  const [creatingValue, setCreatingValue] = useState('')
  const [renaming, setRenaming] = useState(null)
  const [renamingValue, setRenamingValue] = useState('')

  function startRename(base) {
    setRenaming(base.id)
    setRenamingValue(base.name)
  }

  function cancelRename() {
    setRenaming(null)
    setRenamingValue('')
  }

  async function submitCreate(e) {
    e.preventDefault()
    const name = creatingValue.trim()
    if (!name) return
    await onCreate(name)
    setCreatingValue('')
    setCreating(false)
  }

  async function submitRename(e) {
    e.preventDefault()
    const name = renamingValue.trim()
    if (!name) return
    if (renaming) await onRename(renaming, name)
    cancelRename()
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span className="text-sm font-semibold text-gray-700">Bases</span>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-700"
        >
          + New Base
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {creating && (
          <form onSubmit={submitCreate} className="rounded-lg bg-gray-50 p-2">
            <input
              autoFocus
              value={creatingValue}
              onChange={(e) => setCreatingValue(e.target.value)}
              placeholder="Base name"
              className={inputClass}
            />
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="submit"
                className="flex-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {bases.length === 0 && !creating && (
          <p className="px-2 py-4 text-xs text-gray-400">No bases yet. Create one to get started.</p>
        )}

        {bases.map((base) => {
          const active = base.id === activeBaseId
          if (renaming === base.id) {
            return (
              <form key={base.id} onSubmit={submitRename} className="rounded-lg bg-gray-50 p-2">
                <input
                  autoFocus
                  value={renamingValue}
                  onChange={(e) => setRenamingValue(e.target.value)}
                  className={inputClass}
                />
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )
          }

          return (
            <div
              key={base.id}
              className={`group flex items-center rounded-lg ${
                active ? 'bg-indigo-50' : 'hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => onSelect(base.id)}
                className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-sm ${
                  active ? 'font-medium text-indigo-700' : 'text-gray-700'
                }`}
              >
                {base.name}
              </button>
              <div className="hidden shrink-0 items-center gap-0.5 pr-1 group-hover:flex group-focus-within:flex">
                <button
                  onClick={() => startRename(base)}
                  title="Rename base"
                  className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                >
                  Rename
                </button>
                <button
                  onClick={() => onDelete(base)}
                  title="Delete base"
                  className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar