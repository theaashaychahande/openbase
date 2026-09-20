import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { applyQuery } from '../lib/query'
import { primaryValueOf } from '../lib/recordUtils'

function Kanban({ token, tableId, viewConfig, query, onConfigChange }) {
  const [fields, setFields] = useState([])
  const [records, setRecords] = useState([])
  const [loadedFor, setLoadedFor] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(null)

  useEffect(() => {
    if (!token || !tableId) return
    let active = true
    Promise.all([api.fields(token, tableId), api.records(token, tableId)])
      .then(([fieldsRes, recordsRes]) => {
        if (!active) return
        setFields(fieldsRes.fields)
        setRecords(recordsRes.records)
        setError('')
        setLoadedFor(tableId)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message)
        setLoadedFor(tableId)
      })
    return () => {
      active = false
    }
  }, [token, tableId])

  async function refresh() {
    const data = await api.records(token, tableId)
    setRecords(data.records)
  }

  const loading = loadedFor !== tableId
  const groupField =
    fields.find((f) => f.type === 'single_select' && f.id === viewConfig?.kanban_field_id) ||
    null
  const listRecords = applyQuery(fields, records, query)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-400">Loading board…</p>
      </div>
    )
  }

  const singleSelectFields = fields.filter((f) => f.type === 'single_select')

  function valueOf(record) {
    if (!groupField) return ''
    const v = record.data?.[groupField.id]
    return typeof v === 'string' ? v : ''
  }

  function buildColumns() {
    const present = new Set(listRecords.map(valueOf))
    const choices = groupField?.options?.choices ?? []
    const choiceKeys = choices.filter((c) => present.has(c))
    const extras = [...present].filter((v) => v && !choiceKeys.includes(v)).sort()
    const hasEmpty = listRecords.some((r) => valueOf(r) === '')
    return [
      ...choiceKeys.map((key) => ({ key, label: key })),
      ...extras.map((key) => ({ key, label: key })),
      ...(hasEmpty ? [{ key: '', label: 'No value' }] : []),
    ]
  }

  const columns = buildColumns()

  function dropTo(column) {
    return (e) => {
      e.preventDefault()
      setDragOver(null)
      const recordId = e.dataTransfer.getData('text/plain')
      if (!recordId || !groupField) return
      const record = records.find((r) => r.id === recordId)
      if (!record) return
      const value = column.key === '' ? null : column.key
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? { ...r, data: { ...r.data, [groupField.id]: value } }
            : r,
        ),
      )
      api
        .updateRecord(token, recordId, { data: { ...record.data, [groupField.id]: value } })
        .catch(async (err) => {
          setError(err.message)
          await refresh().catch(() => {})
        })
    }
  }

  return (
    <div className="flex h-full flex-col">
      {error && <div className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <span className="text-sm text-gray-500">Group by</span>
        <select
          value={groupField?.id ?? ''}
          onChange={(e) => onConfigChange({ kanban_field_id: e.target.value || null })}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Unset</option>
          {singleSelectFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        {singleSelectFields.length === 0 && (
          <span className="text-xs text-amber-600">
            No single-select column yet — add one to enable Kanban grouping.
          </span>
        )}
      </div>

      {!groupField ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">
            Pick a single-select column to group records by.
          </p>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">No rows yet.</p>
        </div>
      ) : columns.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">
            {listRecords.length === 0
              ? 'No rows match the filter or search.'
              : 'No data to show.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {columns.map((column) => {
            const items = listRecords.filter((r) => valueOf(r) === column.key)
            return (
              <div
                key={column.key || '__empty__'}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(column.key || '__empty__')
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={dropTo(column)}
                className={`w-64 shrink-0 rounded-xl bg-gray-100 p-2 ${
                  dragOver === (column.key || '__empty__')
                    ? 'ring-2 ring-indigo-300'
                    : ''
                }`}
              >
                <header className="mb-2 flex items-center gap-2 px-1">
                  <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {column.label}
                  </span>
                  <span className="rounded-full bg-gray-300 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {items.length}
                  </span>
                </header>
                <div className="flex flex-col gap-2">
                  {items.map((record) => (
                    <div
                      key={record.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', record.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className="cursor-grab rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition hover:shadow active:cursor-grabbing"
                    >
                      <div className="truncate font-medium">
                        {primaryValueOf(fields, record) || 'Untitled'}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-400">{record.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Kanban