// Helpers for resolving a table's "primary" field (its first column) and the
// human-friendly value of a record for that field. The backend orders fields
// by position, so fields[0] is the first column.
export function primaryFieldOf(fields) {
  return fields.length ? fields[0] : null
}

export function primaryValueOf(fields, record) {
  const field = primaryFieldOf(fields)
  if (!field || !record) return ''
  const value = record.data?.[field.id]
  if (value === null || value === undefined) return ''
  return String(value)
}

export function formatLinkLabel(linked, recordId) {
  if (!linked || !recordId) return recordId || ''
  const record = linked.records?.find((r) => r.id === recordId)
  if (!record) return recordId
  const field = linked.primaryField
  if (!field) return recordId
  const value = record.data?.[field.id]
  return value === null || value === undefined ? '' : String(value)
}