import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { accessibleBase } from '../lib/ownership.js'

const router = Router()

router.use(requireAuth)

function parseName(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  return name || null
}

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('bases')
    .select('id, name, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  res.json({ bases: data })
})

router.post('/', async (req, res) => {
  const name = parseName(req.body)
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const { data, error } = await supabaseAdmin
    .from('bases')
    .insert({ user_id: req.user.id, name })
    .select('id, name, created_at')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  res.status(201).json({ base: data })
})

router.get('/:baseId', async (req, res) => {
  const { base, error, status, message } = await accessibleBase(req.params.baseId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!base) return res.status(status).json({ error: message })

  res.json({
    base: { id: base.id, name: base.name, created_at: base.created_at },
  })
})

router.patch('/:baseId', async (req, res) => {
  const { base, error, status, message } = await accessibleBase(req.params.baseId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!base) return res.status(status).json({ error: message })

  const name = parseName(req.body)
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const { data, error: updateErr } = await supabaseAdmin
    .from('bases')
    .update({ name })
    .eq('id', base.id)
    .select('id, name, created_at')
    .single()

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message })
  }
  res.json({ base: data })
})

router.delete('/:baseId', async (req, res) => {
  const { base, error, status, message } = await accessibleBase(req.params.baseId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!base) return res.status(status).json({ error: message })

  const { error: deleteErr } = await supabaseAdmin.from('bases').delete().eq('id', base.id)
  if (deleteErr) {
    return res.status(500).json({ error: deleteErr.message })
  }
  res.status(204).end()
})

// Tables, scoped to a base the user owns.
router.get('/:baseId/tables', async (req, res) => {
  const { base, error, status, message } = await accessibleBase(req.params.baseId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!base) return res.status(status).json({ error: message })

  const { data, error: listErr } = await supabaseAdmin
    .from('tables')
    .select('id, base_id, name, position, view_config')
    .eq('base_id', base.id)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (listErr) {
    return res.status(500).json({ error: listErr.message })
  }
  res.json({ tables: data })
})

router.post('/:baseId/tables', async (req, res) => {
  const { base, error, status, message } = await accessibleBase(req.params.baseId, req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  if (!base) return res.status(status).json({ error: message })

  const name = parseName(req.body)
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }
  const position = Number.isInteger(req.body?.position) ? req.body.position : 0

  const { data, error: insertErr } = await supabaseAdmin
    .from('tables')
    .insert({ base_id: base.id, name, position })
    .select('id, base_id, name, position, view_config')
    .single()

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message })
  }
  res.status(201).json({ table: data })
})

export default router