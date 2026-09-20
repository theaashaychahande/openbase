import { supabaseAdmin } from './supabase.js'

export async function fetchBase(baseId) {
  const { data, error } = await supabaseAdmin
    .from('bases')
    .select('id, user_id, name, created_at')
    .eq('id', baseId)
    .maybeSingle()
  return { data, error }
}

export async function fetchTable(tableId) {
  const { data, error } = await supabaseAdmin
    .from('tables')
    .select('id, base_id')
    .eq('id', tableId)
    .maybeSingle()
  return { data, error }
}

export async function fetchField(fieldId) {
  const { data, error } = await supabaseAdmin
    .from('fields')
    .select('id, table_id, name, type, options, position')
    .eq('id', fieldId)
    .maybeSingle()
  return { data, error }
}

export async function fetchRecord(recordId) {
  const { data, error } = await supabaseAdmin
    .from('records')
    .select('id, table_id, data, created_at, updated_at')
    .eq('id', recordId)
    .maybeSingle()
  return { data, error }
}

// Returns the base only if it exists and the given user owns it.
export async function accessibleBase(baseId, userId) {
  const { data, error } = await fetchBase(baseId)
  if (error) return { base: null, error }
  if (!data || data.user_id !== userId) {
    return { base: null, status: 404, message: 'Base not found' }
  }
  return { base: data, error: null }
}

// Returns the table only if it exists and its base is owned by the given user.
export async function accessibleTable(tableId, userId) {
  const { data, error } = await fetchTable(tableId)
  if (error) return { table: null, error }
  if (!data) return { table: null, status: 404, message: 'Table not found' }

  const { data: base, error: baseError } = await fetchBase(data.base_id)
  if (baseError) return { table: null, error: baseError }
  if (!base || base.user_id !== userId) {
    return { table: null, status: 404, message: 'Table not found' }
  }
  return { table: data, error: null }
}

// Returns the field only if its table's base is owned by the given user.
export async function accessibleField(fieldId, userId) {
  const { data, error } = await fetchField(fieldId)
  if (error) return { field: null, error }
  if (!data) return { field: null, status: 404, message: 'Field not found' }

  const { data: table, error: tableError } = await fetchTable(data.table_id)
  if (tableError) return { field: null, error: tableError }
  const { data: base, error: baseError } = await fetchBase(table.base_id)
  if (baseError) return { field: null, error: baseError }
  if (!base || base.user_id !== userId) {
    return { field: null, status: 404, message: 'Field not found' }
  }
  return { field: data, error: null }
}

// Returns the record only if its table's base is owned by the given user.
export async function accessibleRecord(recordId, userId) {
  const { data, error } = await fetchRecord(recordId)
  if (error) return { record: null, error }
  if (!data) return { record: null, status: 404, message: 'Record not found' }

  const { data: table, error: tableError } = await fetchTable(data.table_id)
  if (tableError) return { record: null, error: tableError }
  const { data: base, error: baseError } = await fetchBase(table.base_id)
  if (baseError) return { record: null, error: baseError }
  if (!base || base.user_id !== userId) {
    return { record: null, status: 404, message: 'Record not found' }
  }
  return { record: data, error: null }
}