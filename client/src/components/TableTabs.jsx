import { useState } from 'react'

function TableTabs({ tables, activeTableId, onCreate, onRename, onDelete, onSelect }) {
  const [creating, setCreating] = useState(false)
  const [creatingValue, setCreatingValue] = useState('')
  const [renaming, setRenaming] = useState(null)
  const [renamingValue, setRenamingValue] = useState('')

  function startRename(table) {
    setRenaming(table.id)
    setRenamingValue(table.name)
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

  return (
    <div className="flex items-end gap-1 border-b border-gray-200 bg-gray-100 px-3 pt-2">
      {tables.map((table) => {
        const active = table.id === activeTableId

        if (renaming === table.id) {
          return (
            <form key={table.id} onSubmit={submitRename} className="mb-1 flex items-center gap-1">
              <input
                autoFocus
                value={renamingValue}
                onChange={(e) => setRenamingValue(e.target.value)}
                className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
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
            </form>
          )
        }

        return (
          <div
            key={table.id}
            className={`group flex items-center rounded-t-lg ${
              active
                ? 'border border-b-0 border-gray-200 bg-white shadow-[0_-1px_2px_rgba(0,0,0,0.02)]'
                : 'hover:bg-gray-200/80'
            }`}
          >
            <button
              onClick={() => onSelect(table.id)}
              className={`min-w-0 truncate px-4 py-2 text-sm ${
                active ? 'font-medium text-indigo-700' : 'text-gray-600'
              }`}
            >
              {table.name}
            </button>
            <div className="hidden shrink-0 items-center gap-0.5 pr-1 group-hover:flex group-focus-within:flex">
              <button
                onClick={() => startRename(table)}
                title="Rename table"
                className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              >
                Rename
              </button>
              <button
                onClick={() => onDelete(table)}
                title="Delete table"
                className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        )
      })}

      {creating && (
        <form onSubmit={submitCreate} className="mb-1 flex items-center gap-1">
          <input
            autoFocus
            value={creatingValue}
            onChange={(e) => setCreatingValue(e.target.value)}
            placeholder="Table name"
            className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
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
        </form>
      )}

      <button
        onClick={() => setCreating((c) => !c)}
        className="mb-1 rounded-t-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-200/80 hover:text-indigo-600"
      >
        + New Table
      </button>
    </div>
  )
}

export default TableTabs