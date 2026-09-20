import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { accessibleRecord } from '../lib/ownership.js'
import { parseRecordData } from './validation.js'

const router = Router()

router.use(requireAuth)

router.get('/:recordId', async (req, res) => {
  const { record, error, status, message } = await accessibleRecord(req.params.recordId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!record) return res.status(status).json({ error: message })

  res.json({
    record: {
      id: record.id,
      table_id: record.table_id,
      data: record.data,
      created_at: record.created_at,
      updated_at: record.updated_at,
    },
  })
})

router.patch('/:recordId', async (req, res) => {
  const { record, error, status, message } = await accessibleRecord(req.params.recordId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!record) return res.status(status).json({ error: message })

  const data = parseRecordData(req.body?.data)
  if (data === undefined) {
    return res.status(400).json({ error: 'data must be a JSON object of {field_id: value} pairs' })
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('records')
    .update({ data, updated_at: new Date().toISOString() })
    .eq('id', record.id)
    .select('id, table_id, data, created_at, updated_at')
    .single()

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message })
  }
  res.json({ record: updated })
})

router.delete('/:recordId', async (req, res) => {
  const { record, error, status, message } = await accessibleRecord(req.params.recordId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!record) return res.status(status).json({ error: message })

  const { error: deleteErr } = await supabaseAdmin.from('records').delete().eq('id', record.id)
  if (deleteErr) {
    return res.status(500).json({ error: deleteErr.message })
  }
  res.status(204).end()
})

export default router