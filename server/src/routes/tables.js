import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { computeFormulaValues, validateFormula } from '../lib/formula.js'
import { requireAuth } from '../middleware/auth.js'
import { accessibleTable } from '../lib/ownership.js'
import {
  ALLOWED_FIELD_TYPES,
  parseName,
  parsePosition,
  parseOptions,
  parseRecordData,
  parseViewConfig,
} from './validation.js'

const router = Router()

router.use(requireAuth)

// Resolves the linked_record target table: must exist in the same base the
// user already proved they own (the current table becomes the authority).
async function resolveLinkedTableId(targetId, currentBaseId) {
  if (!targetId || typeof targetId !== 'string') {
    return { error: 'linked_record requires options.table_id' }
  }
  const { data, error } = await supabaseAdmin
    .from('tables')
    .select('id')
    .eq('id', targetId)
    .eq('base_id', currentBaseId)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) {
    return { error: 'linked_record target table does not exist in this base' }
  }
  return { table_id: data.id }
}

router.get('/:tableId', async (req, res) => {
  const { table, error, status, message } = await accessibleTable(req.params.tableId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!table) return res.status(status).json({ error: message })

  res.json({
    table: { id: table.id, base_id: table.base_id, name: table.name, position: table.position, view_config: table.view_config },
  })
})

router.patch('/:tableId', async (req, res) => {
  const { table, error, status, message } = await accessibleTable(req.params.tableId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!table) return res.status(status).json({ error: message })

  const updates = {}
  const name = parseName(req.body)
  if (name) updates.name = name
  const position = parsePosition(req.body)
  if (position !== undefined) updates.position = position
  const viewConfig = parseViewConfig(req.body?.view_config)
  if (viewConfig === undefined) {
    return res.status(400).json({ error: 'view_config must be a JSON object' })
  }
  if (req.body?.view_config !== undefined) updates.view_config = viewConfig
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'nothing to update (send name, position and/or view_config)' })
  }

  const { data, error: updateErr } = await supabaseAdmin
    .from('tables')
    .update(updates)
    .eq('id', table.id)
    .select('id, base_id, name, position, view_config')
    .single()

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message })
  }
  res.json({ table: data })
})

router.delete('/:tableId', async (req, res) => {
  const { table, error, status, message } = await accessibleTable(req.params.tableId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!table) return res.status(status).json({ error: message })

  const { error: deleteErr } = await supabaseAdmin.from('tables').delete().eq('id', table.id)
  if (deleteErr) {
    return res.status(500).json({ error: deleteErr.message })
  }
  res.status(204).end()
})

// Fields, scoped to the table (and thus the base owner).
router.get('/:tableId/fields', async (req, res) => {
  const { table, error, status, message } = await accessibleTable(req.params.tableId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!table) return res.status(status).json({ error: message })

  const { data, error: listErr } = await supabaseAdmin
    .from('fields')
    .select('id, table_id, name, type, options, position')
    .eq('table_id', table.id)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (listErr) {
    return res.status(500).json({ error: listErr.message })
  }
  res.json({ fields: data })
})

router.post('/:tableId/fields', async (req, res) => {
  const { table, error, status, message } = await accessibleTable(req.params.tableId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!table) return res.status(status).json({ error: message })

  const name = parseName(req.body)
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }
  const type = req.body?.type
  if (!ALLOWED_FIELD_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${ALLOWED_FIELD_TYPES.join(', ')}` })
  }
  const options = parseOptions(req.body?.options)
  if (options === undefined) {
    return res.status(400).json({ error: 'options must be a JSON object' })
  }
  if (type === 'linked_record') {
    const target = await resolveLinkedTableId(options?.table_id, table.base_id)
    if (target.error) {
      return res.status(400).json({ error: target.error })
    }
  }
  if (type === 'formula') {
    const { data: existingFields } = await supabaseAdmin
      .from('fields')
      .select('id, name, type, options, position')
      .eq('table_id', table.id)
    const err = validateFormula(existingFields ?? [], options?.formula)
    if (err) {
      return res.status(400).json({ error: err })
    }
  }
  const position = parsePosition(req.body)

  const { data, error: insertErr } = await supabaseAdmin
    .from('fields')
    .insert({
      table_id: table.id,
      name,
      type,
      options,
      ...(position !== undefined ? { position } : {}),
    })
    .select('id, table_id, name, type, options, position')
    .single()

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message })
  }
  res.status(201).json({ field: data })
})

// Records, scoped to the table (and thus the base owner).
router.get('/:tableId/records', async (req, res) => {
  const { table, error, status, message } = await accessibleTable(req.params.tableId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!table) return res.status(status).json({ error: message })

  const { data, error: listErr } = await supabaseAdmin
    .from('records')
    .select('id, table_id, data, created_at, updated_at')
    .eq('table_id', table.id)
    .order('created_at', { ascending: true })

  if (listErr) {
    return res.status(500).json({ error: listErr.message })
  }
  const fieldsQuery = await tableFields(table.id)
  const fields = fieldsQuery.error ? [] : fieldsQuery.data
  res.json({ records: data.map((record) => ({ ...record, data: computeFormulaValues(fields, record.data) })) })
})

router.post('/:tableId/records', async (req, res) => {
  const { table, error, status, message } = await accessibleTable(req.params.tableId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!table) return res.status(status).json({ error: message })

  const data = parseRecordData(req.body?.data)
  if (data === undefined) {
    return res.status(400).json({ error: 'data must be a JSON object of {field_id: value} pairs' })
  }

  const fieldsQuery = await tableFields(table.id)
  const fields = fieldsQuery.error ? [] : fieldsQuery.data

  const { data: record, error: insertErr } = await supabaseAdmin
    .from('records')
    .insert({ table_id: table.id, data: computeFormulaValues(fields, data) })
    .select('id, table_id, data, created_at, updated_at')
    .single()

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message })
  }
  res.status(201).json({ record })
})

// Shared helper: every column of a table, ordered by position.
async function tableFields(tableId) {
  return supabaseAdmin
    .from('fields')
    .select('id, table_id, name, type, options, position')
    .eq('table_id', tableId)
    .order('position', { ascending: true })
    .order('name', { ascending: true })
}

export default router