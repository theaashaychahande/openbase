import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const OPTS_BY_TYPE = {
  text: [
    { op: 'contains', label: 'contains' },
    { op: 'not_contains', label: 'does not contain' },
  ],
  long_text: [
    { op: 'contains', label: 'contains' },
    { op: 'not_contains', label: 'does not contain' },
  ],
  number: [
    { op: 'eq', label: '=' },
    { op: 'gt', label: '>' },
    { op: 'gte', label: '≥' },
    { op: 'lt', label: '<' },
    { op: 'lte', label: '≤' },
  ],
  single_select: [
    { op: 'is', label: 'is' },
    { op: 'is_not', label: 'is not' },
  ],
  multi_select: [
    { op: 'has', label: 'has any' },
    { op: 'has_not', label: 'has none' },
  ],
  checkbox: [
    { op: 'is', label: 'is checked' },
    { op: 'is_not', label: 'isn\u2019t checked' },
  ],
  date: [
    { op: 'before', label: 'before' },
    { op: 'after', label: 'after' },
  ],
}

const FILTERABLE = new Set(Object.keys(OPTS_BY_TYPE))
const NEEDS_VALUE_TYPES = new Set(['text', 'long_text', 'number', 'single_select', 'multi_select', 'date'])

function opLabel(fieldType, op) {
  return OPTS_BY_TYPE[fieldType]?.find((o) => o.op === op)?.label ?? op
}

function TableToolbar({ token, tableId, query, onChange }) {
  const [fields, setFields] = useState([])
  const [panel, setPanel] = useState(null)
  const [draftFieldId, setDraftFieldId] = useState('')
  const [draftOp, setDraftOp] = useState('')
  const [draftValue, setDraftValue] = useState('')

  useEffect(() => {
    if (!token || !tableId) return
    let active = true
    api
      .fields(token, tableId)
      .then((data) => {
        if (active) setFields(data.fields)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [token, tableId])

  const filters = query?.filters ?? []
  const sorts = query?.sorts ?? []
  const search = query?.search ?? ''
  const filterableFields = fields.filter((f) => FILTERABLE.has(f.type))
  const draftField = filterableFields.find((f) => f.id === draftFieldId)
  const draftOpts = draftField ? OPTS_BY_TYPE[draftField.type] : []
  const activeCount = filters.length + sorts.length + (search ? 1 : 0)

  function openAddFilter() {
    if (panel === 'filter') {
      setPanel(null)
      return
    }
    const first = filterableFields[0]
    setPanel('filter')
    setDraftFieldId(first?.id ?? '')
    setDraftOp(first ? OPTS_BY_TYPE[first.type][0].op : '')
    setDraftValue('')
  }

  function pickFilterField(id) {
    const field = filterableFields.find((f) => f.id === id)
    setDraftFieldId(id)
    setDraftOp(field ? OPTS_BY_TYPE[field.type]?.[0]?.op ?? '' : '')
    setDraftValue('')
  }

  function addFilter(e) {
    e.preventDefault()
    if (!draftField) return
    if (NEEDS_VALUE_TYPES.has(draftField.type) && !draftValue) return
    onChange({
      filters: [
        ...filters,
        {
          fieldId: draftField.id,
          op: draftOp,
          value: draftField.type === 'checkbox' ? true : draftValue,
        },
      ],
    })
    setPanel(null)
    setDraftValue('')
  }

  function addSort(e) {
    e.preventDefault()
    const fieldsToSort = fields
    if (!fieldsToSort.length) return
    const select = e.currentTarget.elements.sortField
    const fieldId = select.value
    if (!fieldId) return
    if (sorts.some((s) => s.fieldId === fieldId)) return
    onChange({ sorts: [...sorts, { fieldId, direction: 'asc' }] })
    select.value = ''
  }

  function moveSort(index, delta) {
    const next = [...sorts]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange({ sorts: next })
  }

  function fieldName(id) {
    return fields.find((f) => f.id === id)?.name ?? 'unknown'
  }

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex min-h-[40px] flex-wrap items-center gap-2 px-4 py-1.5">
        <button
          onClick={openAddFilter}
          className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          ＋ Filter
        </button>
        {filters.map((cond, i) => {
          const field = fields.find((f) => f.id === cond.fieldId)
          if (!field) return null
          const valueText =
            field.type === 'checkbox'
              ? cond.op === 'is'
                ? '✓'
                : '✗'
              : cond.value
          return (
            <span
              key={`${cond.fieldId}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
            >
              <span className="font-medium">{field.name}</span>
              <span className="text-indigo-400">{opLabel(field.type, cond.op)}</span>
              <span>{valueText}</span>
              <button
                onClick={() =>
                  onChange({ filters: filters.filter((_, j) => j !== i) })
                }
                className="text-indigo-400 transition hover:text-red-500"
              >
                ✕
              </button>
            </span>
          )
        })}

        <button
          onClick={() => setPanel(panel === 'sort' ? null : 'sort')}
          className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          Sort
        </button>
        {sorts.map((sort, i) => (
          <span
            key={`${sort.fieldId}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
          >
            <span className="font-medium">{fieldName(sort.fieldId)}</span>
            <span className="text-gray-400">
              {sort.direction === 'asc' ? '↑' : '↓'}
            </span>
            <button
              onClick={() =>
                onChange({
                  sorts: sorts.map((s, j) =>
                    j === i ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' } : s,
                  ),
                })
              }
              className="text-gray-400 transition hover:text-indigo-600"
              title="Toggle direction"
            >
              ⇅
            </button>
            <button
              onClick={() => onChange({ sorts: sorts.filter((_, j) => j !== i) })}
              className="text-gray-400 transition hover:text-red-500"
            >
              ✕
            </button>
          </span>
        ))}

        {activeCount > 0 && (
          <button
            onClick={() => onChange({ filters: [], sorts: [], search: '' })}
            className="text-xs font-medium text-gray-400 transition hover:text-red-500"
          >
            Clear all
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <input
            value={search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search…"
            className="w-48 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => onChange({ search: '' })}
              className="rounded p-1 text-xs text-gray-400 transition hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {panel === 'filter' && (
        <form
          onSubmit={addFilter}
          className="flex flex-wrap items-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2.5"
        >
          {filterableFields.length === 0 ? (
            <p className="text-xs text-gray-400">
              No filterable columns (text, number, select, checkbox or date).
            </p>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  Field
                </label>
                <select
                  value={draftFieldId}
                  onChange={(e) => pickFilterField(e.target.value)}
                  className="mt-1 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                >
                  {filterableFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  Condition
                </label>
                <select
                  value={draftOp}
                  onChange={(e) => setDraftOp(e.target.value)}
                  className="mt-1 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                >
                  {draftOpts.map((o) => (
                    <option key={o.op} value={o.op}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {draftField && NEEDS_VALUE_TYPES.has(draftField.type) && (
                <div className="min-w-40">
                  <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    Value
                  </label>
                  {draftField.type === 'single_select' ||
                  draftField.type === 'multi_select' ? (
                    <select
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                    >
                      <option value="">Choose…</option>
                      {(draftField.options?.choices ?? []).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={draftField.type === 'date' ? 'date' : 'text'}
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={!draftField || (NEEDS_VALUE_TYPES.has(draftField.type) && !draftValue)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                Add filter
              </button>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-200"
              >
                Cancel
              </button>
            </>
          )}
        </form>
      )}

      {panel === 'sort' && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5">
          <form onSubmit={addSort} className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Add sort
            </span>
            <select
              name="sortField"
              defaultValue=""
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
            >
              <option value="" disabled>
                Choose a column…
              </option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
            >
              Add
            </button>
          </form>
          {sorts.length > 0 && (
            <ul className="mt-2 space-y-1">
              {sorts.map((sort, i) => (
                <li
                  key={`${sort.fieldId}-${i}`}
                  className="flex items-center gap-2 text-xs text-gray-700"
                >
                  <span className="w-5 text-gray-400">#{i + 1}</span>
                  <span className="font-medium">{fieldName(sort.fieldId)}</span>
                  <button
                    onClick={() =>
                      onChange({
                        sorts: sorts.map((s, j) =>
                          j === i
                            ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                            : s,
                        ),
                      })
                    }
                    className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-white"
                  >
                    {sort.direction === 'asc' ? 'Asc ↑' : 'Desc ↓'}
                  </button>
                  <button
                    onClick={() => moveSort(i, -1)}
                    disabled={i === 0}
                    className="text-gray-400 transition hover:text-indigo-600 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveSort(i, 1)}
                    disabled={i === sorts.length - 1}
                    className="text-gray-400 transition hover:text-indigo-600 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() =>
                      onChange({ sorts: sorts.filter((_, j) => j !== i) })
                    }
                    className="text-gray-400 transition hover:text-red-500"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default TableToolbar