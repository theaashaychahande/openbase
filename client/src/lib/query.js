// Shared filter / sort / search logic for table views.

function matches(field, cond, cell) {
  switch (field.type) {
    case 'text':
    case 'long_text': {
      const haystack = String(cell ?? '').toLowerCase()
      const needle = String(cond.value ?? '').toLowerCase()
      return cond.op === 'not_contains'
        ? !haystack.includes(needle)
        : haystack.includes(needle)
    }
    case 'number': {
      const value = Number(cell)
      if (Number.isNaN(value)) return false
      const target = Number(cond.value)
      switch (cond.op) {
        case 'eq':
          return value === target
        case 'gt':
          return value > target
        case 'gte':
          return value >= target
        case 'lt':
          return value < target
        case 'lte':
          return value <= target
        default:
          return false
      }
    }
    case 'single_select':
      return cond.op === 'is' ? cell === cond.value : cell !== cond.value
    case 'multi_select': {
      const arr = Array.isArray(cell) ? cell : []
      return cond.op === 'has' ? arr.includes(cond.value) : !arr.includes(cond.value)
    }
    case 'checkbox':
      return cond.op === 'is' ? cell === true : cell !== true
    case 'date': {
      if (!cell || !cond.value) return false
      const a = new Date(cell).getTime()
      const b = new Date(cond.value).getTime()
      if (Number.isNaN(a) || Number.isNaN(b)) return false
      return cond.op === 'before' ? a < b : a > b
    }
    default:
      return true
  }
}

function sortRecords(fields, records, sorts = []) {
  if (!sorts.length) return records
  const key = (record, field) => {
    const value = record.data?.[field.id]
    return field.type === 'number' ? Number(value) : String(value ?? '')
  }
  return [...records].sort((a, b) => {
    for (const sort of sorts) {
      const field = fields.find((f) => f.id === sort.fieldId)
      if (!field) continue
      const av = key(a, field)
      const bv = key(b, field)
      let cmp
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
      }
      if (cmp !== 0) return sort.direction === 'desc' ? -cmp : cmp
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

// Applies filters, free-text search (over text/long_text fields), then sorts.
export function applyQuery(fields, records, query = {}) {
  let list = records

  for (const cond of query.filters ?? []) {
    const field = fields.find((f) => f.id === cond.fieldId)
    if (!field) continue
    list = list.filter((record) => matches(field, cond, record.data?.[field.id]))
  }

  const search = (query.search ?? '').trim()
  if (search) {
    const needle = search.toLowerCase()
    const searchFields = fields.filter(
      (f) => f.type === 'text' || f.type === 'long_text',
    )
    list = list.filter((record) =>
      searchFields.some((f) =>
        String(record.data?.[f.id] ?? '').toLowerCase().includes(needle),
      ),
    )
  }

  return sortRecords(fields, list, query.sorts)
}