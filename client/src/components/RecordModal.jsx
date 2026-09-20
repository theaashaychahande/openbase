import {
  AttachmentControl,
  LinkedRecordControl,
  MultiSelectControl,
  SingleSelectControl,
} from './FieldControls'

function FieldTextInput({ field, value, onChange }) {
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

  function commit(e) {
    onChange(parseInput(e.currentTarget.value))
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

  if (field.type === 'long_text') {
    return (
      <textarea
        defaultValue={value ?? ''}
        rows={4}
        onBlur={commit}
        className={inputClass}
      />
    )
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      defaultValue={value ?? ''}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={inputClass}
    />
  )
}

function RecordModal({
  record,
  fields,
  linked,
  onFieldChange,
  onAddChoice,
  onUploadFile,
  onRemoveFile,
  onDelete,
  onClose,
}) {
  function renderFieldInput(field) {
    const value = record.data[field.id]
    switch (field.type) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={() => onFieldChange(field.id, value ? null : true)}
            className="mt-1 h-5 w-5 accent-indigo-600"
          />
        )
      case 'single_select':
        return (
          <SingleSelectControl
            choices={field.options?.choices ?? []}
            value={value}
            onChange={(v) => onFieldChange(field.id, v)}
            onAddChoice={(name) => onAddChoice(field, name)}
          />
        )
      case 'multi_select':
        return (
          <MultiSelectControl
            choices={field.options?.choices ?? []}
            value={value}
            onChange={(v) => onFieldChange(field.id, v)}
            onAddChoice={(name) => onAddChoice(field, name)}
          />
        )
      case 'attachment':
        return (
          <AttachmentControl
            value={value}
            onUpload={(file) => onUploadFile(field.id, file)}
            onRemove={(i) => onRemoveFile(field.id, i)}
          />
        )
      case 'linked_record':
        return (
          <LinkedRecordControl
            linked={linked?.[field.id]}
            value={value}
            onChange={(v) => onFieldChange(field.id, v)}
          />
        )
      default:
        return <FieldTextInput field={field} value={value} onChange={(v) => onFieldChange(field.id, v)} />
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">Record</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {fields.map((field) => (
            <div key={field.id} className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {field.name}
                <span className="ml-1.5 text-xs font-normal uppercase tracking-wide text-gray-400">
                  {field.type.replace('_', ' ')}
                </span>
              </label>
              {renderFieldInput(field)}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete record
          </button>
          <div className="text-xs text-gray-400">
            Updated {new Date(record.updated_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecordModal