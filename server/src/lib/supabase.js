import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_KEY || ''

if (!url || !serviceKey) {
  console.warn(
    '[warn] SUPABASE_URL / SUPABASE_SERVICE_KEY not set. Auth routes will fail until you configure server/.env'
  )
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})