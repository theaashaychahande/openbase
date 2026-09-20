import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { applyQuery } from '../lib/query'
import {
  AttachmentControl,
  LinkedRecordControl,
  MultiSelectControl,
  SingleSelectControl,
} from './FieldControls'
import RecordModal from './RecordModal'

const TYPES_WITH_CHOICES = ['single_select', 'multi_select']
const FIELD_TYPE_OPTIONS = [
  'text',
  'long_text',
  'number',
  'checkbox',
  'single_select',
  'multi_select',
  'date',
  'attachment',
  'linked_record',
  'formula',
]

function displayValue(field, value) {
  if (value === undefined || value === null) return ''
  if (field.type === 'multi_select') {
    return Array.isArray(value) ? value.join(', ') : String(value)
  }
  return String(value)
}

function fieldMinWidth(field) {
  if (field.type === 'checkbox') return 56
  if (field.type === 'long_text') return 200
  return 160
}

function TextCell({ field, value, editing, onStart, onCommit, onCancel }) {
  if (!editing) {
    return (
      <button
        onClick={onStart}
        className="w-full truncate px-3 py-2 text-left text-sm text-gray-700 hover:bg-amber-50"
      >
        {displayValue(field, value) || '\u00A0'}
      </button>
    )
  }

  function parseInput(raw) {
    if (field.type === 'number') {
      const trimmed = raw.trim()
      if (trimmed === '') return null
      const num = Number(trimmed)
      return Number.isNaN(num) ? trimmed : num
    }
    if (field.type === 'date' && raw === '') return null
    return raw
  }

  const inputClass =
    'w-full rounded px-3 py-2 text-sm outline-none ring-2 ring-indigo-500'
  const longText = field.type === 'long_text'

  return longText ? (
    <textarea
      autoFocus
      rows={3}
      defaultValue={value ?? ''}
      onBlur={(e) => onCommit(parseInput(e.currentTarget.value))}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
      className={inputClass}
    />
  ) : (
    <input
      autoFocus
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      defaultValue={value ?? ''}
      onBlur={(e) => onCommit(parseInput(e.currentTarget.value))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') onCancel()
      }}
      className={inputClass}
    />
  )
}

function Grid({ token, tableId, tables = [], query }) {
  const [fields, setFields] = useState([])
  const [records, setRecords] = useState([])
  const [linkedByField, setLinkedByField] = useState({})
  const [loadedFor, setLoadedFor] = useState(null)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(null)
  const [renamingFieldId, setRenamingFieldId] = useState(null)

  const [columnModal, setColumnModal] = useState(false)
  const [columnName, setColumnName] = useState('')
  const [columnType, setColumnType] = useState('text')
  const [columnChoices, setColumnChoices] = useState('')
  const [columnLinkId, setColumnLinkId] = useState('')
  const [columnFormula, setColumnFormula] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  const recordsRef = useRef([])
  const timersRef = useRef({})
  const [openRecordId, setOpenRecordId] = useState(null)

  useEffect(() => {
    recordsRef.current = records
  }, [records])

  const refreshRecords = useCallback(async () => {
    if (!token || !tableId) return
    const data = await api.records(token, tableId)
    setRecords(data.records)
  }, [token, tableId])

  const flushRecord = useCallback(
    (recordId) => {
      const timers = timersRef.current
      clearTimeout(timers[recordId])
      delete timers[recordId]
      const record = recordsRef.current.find((r) => r.id === recordId)
      if (!record) return
      api
        .updateRecord(token, recordId, { data: record.data })
        .catch(async () => {
          setError('Failed to save a cell change')
          await refreshRecords().catch(() => {})
        })
    },
    [token, refreshRecords],
  )

  const updateCell = useCallback(
    (recordId, fieldId, value) => {
      setRecords((rs) =>
        rs.map((r) =>
          r.id === recordId ? { ...r, data: { ...r.data, [fieldId]: value } } : r,
        ),
      )
      const timers = timersRef.current
      clearTimeout(timers[recordId])
      timers[recordId] = setTimeout(() => flushRecord(recordId), 400)
    },
    [flushRecord],
  )

  async function addFieldChoice(field, name) {
    const existing = field.options?.choices ?? []
    if (existing.includes(name)) return field
    const choices = [...existing, name]
    const res = await api.updateField(token, field.id, { options: { choices } })
    setFields((fs) => fs.map((f) => (f.id === field.id ? { ...f, options: { choices } } : f)))
    return res.field
  }

  function attachmentValue(recordId, fieldId) {
    const record = recordsRef.current.find((r) => r.id === recordId)
    return Array.isArray(record?.data?.[fieldId]) ? record.data[fieldId] : []
  }

  async function uploadRecordFile(recordId, fieldId, file) {
    try {
      const fileData = await api.uploadFile(token, file)
      const next = [...attachmentValue(recordId, fieldId), fileData]
      updateCell(recordId, fieldId, next)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function removeRecordFile(recordId, fieldId, index) {
    const next = attachmentValue(recordId, fieldId).filter((_, i) => i !== index)
    updateCell(recordId, fieldId, next)
  }

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

  useEffect(() => {
    if (!token) return
    const linkedFields = fields.filter(
      (f) => f.type === 'linked_record' && f.options?.table_id,
    )
    if (linkedFields.length === 0) return
    let active = true
    Promise.all(
      linkedFields.map(async (field) => {
        const { fields: targetFields, records: targetRecords } = await Promise.all([
          api.fields(token, field.options.table_id),
          api.records(token, field.options.table_id),
        ])
        return [
          field.id,
          {
            tableId: field.options.table_id,
            records: targetRecords,
            primaryField: targetFields[0] || null,
          },
        ]
      }),
    )
      .then((entries) => {
        if (active) setLinkedByField(Object.fromEntries(entries))
      })
      .catch(() => {
        if (active) setLinkedByField({})
      })
    return () => {
      active = false
    }
  }, [token, fields])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const id of Object.keys(timers)) flushRecord(id)
    }
  }, [flushRecord])

  function addRow() {
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    setRecords((rs) => [
      ...rs,
      { id: tempId, table_id: tableId, data: {}, created_at: now, updated_at: now },
    ])
    api
      .createRecord(token, tableId, {})
      .then((res) => {
        setError('')
        setRecords((rs) => rs.map((r) => (r.id === tempId ? res.record : r)))
      })
      .catch((err) => {
        setError(err.message)
        setRecords((rs) => rs.filter((r) => r.id !== tempId))
      })
  }

  function deleteRow(record) {
    if (!window.confirm('Delete this row?')) return
    if (openRecordId === record.id) setOpenRecordId(null)
    const timers = timersRef.current
    clearTimeout(timers[record.id])
    delete timers[record.id]
    setRecords((rs) => rs.filter((r) => r.id !== record.id))
    api.deleteRecord(token, record.id).catch(async (err) => {
      setError(err.message)
      await refreshRecords().catch(() => {})
    })
  }

  async function addColumn(e) {
    e.preventDefault()
    const name = columnName.trim()
    if (!name) return
    if (columnType === 'linked_record' && !columnLinkId) return
    if (columnType === 'formula' && !columnFormula.trim()) return
    setModalSaving(true)
    setModalError('')
    try {
      const options =
        columnType === 'linked_record'
          ? { table_id: columnLinkId }
          : columnType === 'formula'
            ? { formula: columnFormula.trim() }
            : TYPES_WITH_CHOICES.includes(columnType)
              ? { choices: columnChoices.split(',').map((s) => s.trim()).filter(Boolean) }
              : {}
      const res = await api.createField(token, tableId, {
        name,
        type: columnType,
        options,
        position: fields.length,
      })
      setFields((fs) => [...fs, res.field])
      setError('')
      setColumnName('')
      setColumnType('text')
      setColumnChoices('')
      setColumnLinkId('')
      setColumnFormula('')
      setColumnModal(false)
    } catch (err) {
      setModalError(err.message)
    } finally {
      setModalSaving(false)
    }
  }

  async function commitFieldRename(fieldId, e) {
    const name = e.currentTarget.value.trim()
    setRenamingFieldId(null)
    if (!name) return
    try {
      const res = await api.renameField(token, fieldId, name)
      setFields((fs) => fs.map((f) => (f.id === fieldId ? { ...f, name: res.field.name } : f)))
    } catch (err) {
      setError(err.message)
    }
  }

  function deleteColumn(field) {
    if (!window.confirm(`Delete column "${field.name}"?`)) return
    setFields((fs) => fs.filter((f) => f.id !== field.id))
    api.deleteField(token, field.id).catch(async (err) => {
      setError(err.message)
      const data = await api.fields(token, tableId).catch(() => null)
      if (data) setFields(data.fields)
    })
  }

  function renderCell(field, record) {
    const recordId = record.id
    const value = record.data[field.id]
    const fieldId = field.id
    const key = `${recordId}:${fieldId}`

    switch (field.type) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={() => updateCell(recordId, fieldId, value ? null : true)}
            className="h-4 w-4 accent-indigo-600"
          />
        )
      case 'single_select':
        return (
          <SingleSelectControl
            choices={field.options?.choices ?? []}
            value={value}
            onChange={(v) => updateCell(recordId, fieldId, v)}
            onAddChoice={(name) => addFieldChoice(field, name)}
          />
        )
      case 'multi_select':
        return (
          <MultiSelectControl
            choices={field.options?.choices ?? []}
            value={value}
            onChange={(v) => updateCell(recordId, fieldId, v)}
            onAddChoice={(name) => addFieldChoice(field, name)}
          />
        )
      case 'attachment':
        return (
          <AttachmentControl
            compact
            value={value}
            onUpload={(file) => uploadRecordFile(recordId, fieldId, file)}
            onRemove={(i) => removeRecordFile(recordId, fieldId, i)}
          />
        )
      case 'linked_record':
        return (
          <LinkedRecordControl
            compact
            linked={linkedByField[fieldId]}
            value={value}
            onChange={(v) => updateCell(recordId, fieldId, v)}
          />
        )
      case 'formula':
        return (
          <div className="px-3 py-2 text-sm text-gray-700">
            {displayValue(field, value) || '\u00A0'}
          </div>
        )
      default:
        return (
          <TextCell
            field={field}
            value={value}
            editing={editing === key}
            onStart={() => setEditing(key)}
            onCommit={(v) => {
              setEditing(null)
              updateCell(recordId, fieldId, v)
            }}
            onCancel={() => setEditing(null)}
          />
        )
    }
  }

  const loading = loadedFor !== tableId
  const openRecord = records.find((r) => r.id === openRecordId) || null
  const visibleRecords = useMemo(
    () => applyQuery(fields, records, query),
    [fields, records, query],
  )

  return (
    <div className="flex h-full flex-col">
      {error && <div className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">Loading grid…</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
        {fields.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-gray-400">This table has no columns yet.</p>
            <button
              onClick={() => setColumnModal(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Add column
            </button>
          </div>
        ) : (
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 w-10 border-b border-r border-gray-200 bg-gray-50 px-2 py-2 text-right text-xs font-normal text-gray-400">
                  #
                </th>
                {fields.map((field) => (
                  <th
                    key={field.id}
                    className="group sticky top-0 z-10 border-b border-r border-gray-200 bg-gray-50 p-0 text-left align-top"
                  >
                    {renamingFieldId === field.id ? (
                      <input
                        autoFocus
                        defaultValue={field.name}
                        onBlur={(e) => commitFieldRename(field.id, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                          if (e.key === 'Escape') setRenamingFieldId(null)
                        }}
                        className="m-1 w-40 rounded border border-indigo-400 px-2 py-1 text-xs outline-none ring-1 ring-indigo-400"
                      />
                    ) : (
                      <div className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold text-gray-700">
                            {field.name}
                          </span>
                          <span className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex group-focus-within:flex">
                            <button
                              onClick={() => setRenamingFieldId(field.id)}
                              title="Rename column"
                              className="rounded px-1 text-xs text-gray-500 hover:bg-gray-200"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => deleteColumn(field)}
                              title="Delete column"
                              className="rounded px-1 text-xs text-red-500 hover:bg-red-100"
                            >
                              ✕
                            </button>
                          </span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">
                          {field.type}
                        </span>
                      </div>
                    )}
                  </th>
                ))}
                <th className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setColumnModal(true)}
                    className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-indigo-600"
                  >
                    + Column
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record, i) => (
                <tr key={record.id} className="group">
                  <td className="border-b border-r border-gray-200 bg-gray-50 px-2 py-2 text-right align-middle">
                    <span className="text-xs text-gray-400">{i + 1}</span>
                  </td>
                  {fields.map((field) => {
                    const center =
                      field.type === 'checkbox' ||
                      field.type === 'number'
                        ? 'text-center'
                        : ''
                    return (
                      <td
                        key={field.id}
                        className={`border-b border-r border-gray-200 align-middle ${center}`}
                        style={{ minWidth: fieldMinWidth(field) }}
                      >
                        {renderCell(field, record)}
                      </td>
                    )
                  })}
                  <td className="border-b border-gray-200 px-1 align-middle">
                    <button
                      onClick={() => setOpenRecordId(record.id)}
                      className="inline-flex items-center rounded px-1.5 py-1 text-gray-300 transition group-hover:text-gray-600 hover:bg-gray-100 hover:text-gray-700"
                      title="Open record"
                    >
                      ⤢
                    </button>
                    <button
                      onClick={() => deleteRow(record)}
                      className="px-1 py-1 text-xs text-gray-300 transition group-hover:text-red-500"
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {fields.length > 0 && visibleRecords.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400">
            {records.length === 0 ? 'No rows yet.' : 'No rows match the filter or search.'}
          </p>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white px-3 py-2">
        <button
          onClick={addRow}
          className="rounded-lg px-2 py-1 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-indigo-600"
        >
          + New row
        </button>
      </div>

      {columnModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setColumnModal(false)}
        >
          <div
            className="w-80 rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900">Add column</h3>
            <form onSubmit={addColumn} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="column-name">
                  Name
                </label>
                <input
                  id="column-name"
                  autoFocus
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="e.g. Status"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="column-type">
                  Field type
                </label>
                <select
                  id="column-type"
                  value={columnType}
                  onChange={(e) => setColumnType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {FIELD_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              {TYPES_WITH_CHOICES.includes(columnType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="column-choices">
                    Choices <span className="font-normal text-gray-400">(comma separated)</span>
                  </label>
                  <input
                    id="column-choices"
                    value={columnChoices}
                    onChange={(e) => setColumnChoices(e.target.value)}
                    placeholder="Option A, Option B"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
              {columnType === 'linked_record' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="column-link">
                    Linked table
                  </label>
                  <select
                    id="column-link"
                    value={columnLinkId}
                    onChange={(e) => setColumnLinkId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select a table…</option>
                    {tables
                      .filter((t) => t.id !== tableId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                  {tables.length <= 1 && (
                    <p className="mt-1 text-xs text-gray-400">
                      Create another table first to link to it.
                    </p>
                  )}
                </div>
              )}
              {columnType === 'formula' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="column-formula">
                    Expression
                  </label>
                  <textarea
                    id="column-formula"
                    rows={3}
                    value={columnFormula}
                    onChange={(e) => setColumnFormula(e.target.value)}
                    placeholder={`e.g. {Price} * {Quantity}`}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Reference fields with {'{Name}'}. Operators: + - * /, comparisons. Functions:
                    SUM(...), IF(cond, a, b), CONCAT(..., ...). Formula fields update automatically.
                  </p>
                </div>
              )}
              {modalError && <p className="text-sm text-red-600">{modalError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setColumnModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    modalSaving ||
                    !columnName.trim() ||
                    (columnType === 'linked_record' && !columnLinkId) ||
                    (columnType === 'formula' && !columnFormula.trim())
                  }
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {modalSaving ? 'Adding…' : 'Add column'}
                </button>
              </div>
            </form>
          </div>
</div>
        )}

        {openRecord && (
          <RecordModal
            record={openRecord}
            fields={fields}
            linked={linkedByField}
            onFieldChange={(fieldId, value) => updateCell(openRecord.id, fieldId, value)}
            onAddChoice={addFieldChoice}
            onUploadFile={(fieldId, file) => uploadRecordFile(openRecord.id, fieldId, file)}
            onRemoveFile={(fieldId, index) => removeRecordFile(openRecord.id, fieldId, index)}
            onDelete={() => deleteRow(openRecord)}
            onClose={() => setOpenRecordId(null)}
          />
        )}
        </>
      )}
    </div>
  )
}

export default Grid