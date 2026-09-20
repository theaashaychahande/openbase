import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('credentials')
    .select('id, type, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  res.json({ credentials: data })
})

export default router