import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import multer from 'multer'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const BUCKET = process.env.STORAGE_BUCKET || 'openbase-attachments'
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
})

function fileExt(name) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(name || ''))
  return match ? `.${match[1].toLowerCase()}` : ''
}

async function ensureBucket() {
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
  if (error && !/already exist/i.test(error.message)) {
    throw error
  }
}

router.post(
  '/',
  requireAuth,
  upload.single('file'),
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 10MB)' : err.message
      return res.status(400).json({ error: message })
    }
    next(err)
  },
  async (req, res) => {
    const file = req.file
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded (expected a multipart field "file")' })
    }

    const objectPath = `${req.user.id}/${randomUUID()}${fileExt(file.originalname)}`

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false })

    if (error) {
      if (/bucket/i.test(error.message)) {
        try {
          await ensureBucket()
        } catch (bucketErr) {
          return res.status(500).json({ error: `Failed to init storage: ${bucketErr.message}` })
        }
        const retry = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false })
        if (retry.error) {
          return res.status(500).json({ error: retry.error.message })
        }
      } else {
        return res.status(500).json({ error: error.message })
      }
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath)
    res.status(201).json({ url: data.publicUrl, name: file.originalname })
  },
)

export default router