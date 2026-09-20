import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { accessibleField, accessibleTable } from '../lib/ownership.js'
import { ALLOWED_FIELD_TYPES, parseName, parsePosition, parseOptions } from './validation.js'

const router = Router()

router.use(requireAuth)

async function resolveLinkedTableId(targetId, currentBaseId) {
  if (!targetId || typeof targetId !== 'string') {
    return { error: 'linked_record requires options.table_id' }
  }
  const { data } = await supabaseAdmin
    .from('tables')
    .select('id')
    .eq('id', targetId)
    .eq('base_id', currentBaseId)
    .maybeSingle()
  if (!data) {
    return { error: 'linked_record target table does not exist in this base' }
  }
  return { table_id: data.id }
}

router.get('/:fieldId', async (req, res) => {
  const { field, error, status, message } = await accessibleField(req.params.fieldId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!field) return res.status(status).json({ error: message })

  res.json({
    field: {
      id: field.id,
      table_id: field.table_id,
      name: field.name,
      type: field.type,
      options: field.options,
      position: field.position,
    },
  })
})

router.patch('/:fieldId', async (req, res) => {
  const { field, error, status, message } = await accessibleField(req.params.fieldId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!field) return res.status(status).json({ error: message })

  const updates = {}
  const name = parseName(req.body)
  if (name) updates.name = name
  const type = req.body?.type
  if (type !== undefined) {
    if (!ALLOWED_FIELD_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${ALLOWED_FIELD_TYPES.join(', ')}` })
    }
    updates.type = type
  }
  const options = parseOptions(req.body?.options)
  if (options === undefined) {
    return res.status(400).json({ error: 'options must be a JSON object' })
  }
  if (req.body?.options !== undefined) updates.options = options
  const position = parsePosition(req.body)
  if (position !== undefined) updates.position = position

  const nextType = updates.type ?? field.type
  const nextOptions = updates.options ?? field.options
  if (nextType === 'linked_record') {
    if (typeof nextOptions?.table_id !== 'string') {
      return res.status(400).json({ error: 'linked_record requires options.table_id' })
    }
    const { table, error: tableErr } = await accessibleTable(field.table_id, req.user.id)
    if (error || !table) {
      return res.status(500).json({ error: tableErr?.message || 'failed to resolve table' })
    }
    const target = await resolveLinkedTableId(nextOptions.table_id, table.base_id)
    if (target.error) {
      return res.status(400).json({ error: target.error })
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'nothing to update' })
  }

  const { data, error: updateErr } = await supabaseAdmin
    .from('fields')
    .update(updates)
    .eq('id', field.id)
    .select('id, table_id, name, type, options, position')
    .single()

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message })
  }
  res.json({ field: data })
})

router.delete('/:fieldId', async (req, res) => {
  const { field, error, status, message } = await accessibleField(req.params.fieldId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!field) return res.status(status).json({ error: message })

  const { error: deleteErr } = await supabaseAdmin.from('fields').delete().eq('id', field.id)
  if (deleteErr) {
    return res.status(500).json({ error: deleteErr.message })
  }
  res.status(204).end()
})

export default router