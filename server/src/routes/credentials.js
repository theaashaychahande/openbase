import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { decrypt, encrypt, mask } from '../lib/crypto.js'
import { testAiKey, testDatabase } from '../lib/connectionTest.js'

const router = Router()

const ALLOWED_TYPES = ['db_connection', 'ai_key', 'other']
const MAX_VALUE_LENGTH = 10_000
const MAX_NAME_LENGTH = 100

router.use(requireAuth)

function validatePayload(body) {
  const { type, value, name } = body ?? {}
  if (!ALLOWED_TYPES.includes(type)) {
    return { error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` }
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { error: 'value is required and must be a non-empty string' }
  }
  if (value.length > MAX_VALUE_LENGTH) {
    return { error: `value exceeds the ${MAX_VALUE_LENGTH} character limit` }
  }
  if (name != null && (typeof name !== 'string' || name.length > MAX_NAME_LENGTH)) {
    return { error: `name must be a string of at most ${MAX_NAME_LENGTH} characters` }
  }
  return {}
}

function isMissingColumnError(error) {
  const code = String(error?.code ?? '')
  const text = `${error?.message ?? ''} ${error?.details ?? ''}`
  return (
    /^42/.test(code) ||
    /^PGRST/i.test(code) ||
    (/column/i.test(text) && /exist|not defined|not found|not present/i.test(text))
  )
}

async function fetchCredentials(userId) {
  const attempt = (withName) =>
    supabaseAdmin
      .from('credentials')
      .select(withName ? 'id, type, name, encrypted_value, created_at' : 'id, type, encrypted_value, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

  let { data, error } = await attempt(true)
  if (error && isMissingColumnError(error)) {
    ;({ data, error } = await attempt(false))
  }
  return { data, error }
}

router.post('/test', async (req, res) => {
  const { error } = validatePayload(req.body)
  if (error) {
    return res.status(400).json({ error })
  }

  const { type, value } = req.body
  try {
    if (type === 'ai_key') {
      await testAiKey(value)
    } else if (type === 'db_connection') {
      await testDatabase(value)
    } else {
      return res.status(400).json({ error: `Connection testing is not supported for type "${type}"` })
    }
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  res.json({ ok: true })
})

router.get('/', async (req, res) => {
  const { data, error } = await fetchCredentials(req.user.id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const credentials = data.map((row) => {
    let maskedValue = ''
    try {
      maskedValue = mask(decrypt(row.encrypted_value))
    } catch {
      maskedValue = '[unreadable]'
    }
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      masked_value: maskedValue,
      created_at: row.created_at,
    }
  })

  res.json({ credentials })
})

router.post('/', async (req, res) => {
  const { error } = validatePayload(req.body)
  if (error) {
    return res.status(400).json({ error })
  }

  const { type, value, name } = req.body
  const { encrypted_value, encryptError } = (() => {
    try {
      return { encrypted_value: encrypt(value) }
    } catch (err) {
      return { encryptError: err.message }
    }
  })()

  if (encryptError) {
    return res.status(500).json({ error: `Failed to encrypt value: ${encryptError}` })
  }

  const base = { user_id: req.user.id, type, encrypted_value }

  const attempt = (withName) =>
    supabaseAdmin
      .from('credentials')
      .insert(withName ? { ...base, name: name || null } : base)
      .select(withName ? 'id, type, name, created_at' : 'id, type, created_at')
      .single()

  let { data, error: insertErr } = await attempt(Boolean(name))
  if (insertErr && isMissingColumnError(insertErr)) {
    ;({ data, error: insertErr } = await attempt(false))
  }

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message })
  }

  res.status(201).json({
    credential: {
      id: data.id,
      type: data.type,
      name: data.name,
      masked_value: mask(value),
      created_at: data.created_at,
    },
  })
})

router.delete('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('credentials')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  if (!data) {
    return res.status(404).json({ error: 'Credential not found' })
  }
  res.status(204).end()
})

export default router