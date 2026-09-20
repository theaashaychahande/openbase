import pg from 'pg'

const AI_URL = process.env.AI_BASE_URL || 'https://api.openai.com/v1/models'
const TEST_TIMEOUT_MS = 10_000

export async function testAiKey(key) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS)
  try {
    const res = await fetch(AI_URL, {
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const detail = body ? `: ${body.slice(0, 200)}` : ''
      throw new Error(`AI provider rejected the key (HTTP ${res.status})${detail}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

async function tryConnect(config) {
  const client = new pg.Client(config)
  try {
    await client.connect()
    await client.query('SELECT 1')
  } finally {
    await client.end().catch(() => {})
  }
}

function describeConnectError(err) {
  return err.message || (err.code ? `code ${err.code}` : String(err))
}

export async function testDatabase(connectionString) {
  let url
  try {
    url = new URL(String(connectionString))
  } catch {
    throw new Error(
      'Invalid connection string: expected a URL such as postgresql://user:pass@host:5432/db'
    )
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error(
      `Unsupported scheme "${url.protocol}". Only postgres/postgresql (PostgreSQL) connection strings are supported.`
    )
  }

  const sslMode = url.searchParams.get('sslmode')
  const ssl =
    sslMode && sslMode !== 'disable'
      ? { rejectUnauthorized: sslMode === 'verify-ca' || sslMode === 'verify-full' }
      : false

  try {
    await tryConnect({ connectionString, connectionTimeoutMillis: TEST_TIMEOUT_MS, ssl })
  } catch (firstErr) {
    if (!ssl && /SSL|sslmode|pg_hba/i.test(firstErr.message)) {
      try {
        await tryConnect({
          connectionString,
          connectionTimeoutMillis: TEST_TIMEOUT_MS,
          ssl: { rejectUnauthorized: false },
        })
        return
      } catch {
        // fall through to the generic error below
      }
    }
    throw new Error(`Connection failed: ${describeConnectError(firstErr)}`)
  }
}