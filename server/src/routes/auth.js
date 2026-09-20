import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { signToken } from '../lib/token.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/signup', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const { data, error } = await supabaseAdmin.auth.signUp({ email, password })
  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const user = data.user
  const token = signToken(user)
  res.status(201).json({ user: { id: user.id, email: user.email }, token })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
  if (error) {
    return res.status(401).json({ error: error.message })
  }

  const user = data.user
  const token = signToken(user)
  res.json({ user: { id: user.id, email: user.email }, token })
})

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user })
})

export default router