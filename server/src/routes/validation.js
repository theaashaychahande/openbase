export const ALLOWED_FIELD_TYPES = [
  'text',
  'long_text',
  'number',
  'checkbox',
  'single_select',
  'multi_select',
  'date',
  'attachment',
  'linked_record',
]

export function parseName(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  return name || null
}

export function parsePosition(body) {
  return Number.isInteger(body?.position) ? body.position : undefined
}

// options: defaults to {} when omitted; must be a plain object when provided.
export function parseOptions(value) {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) return undefined
  return value
}

// data: must be a plain object of {field_id: value} pairs when provided.
export function parseRecordData(value) {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) return undefined
  return value
}