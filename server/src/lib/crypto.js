import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

function loadKey() {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    console.error(
      '[ENCRYPTION_KEY] Missing required environment variable. Generate one with:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
        'and set it in server/.env'
    )
    process.exit(1)
  }
  const hex = raw.trim().replace(/^0x/i, '')
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, 'hex')
  }
  return createHash('sha256').update(raw).digest()
}

const KEY = loadKey()

export function encrypt(plaintext) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':')
}

export function decrypt(payload) {
  const [ivB64, tagB64, dataB64] = String(payload).split(':')
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

export function mask(value) {
  if (!value) return ''
  const text = String(value)
  if (text.length <= 8) {
    return text.slice(0, 2) + '...' + text.slice(-2)
  }
  return text.slice(0, 3) + '...' + text.slice(-4)
}