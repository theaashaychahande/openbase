import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'

const TYPE_LABELS = {
  ai_key: 'AI API key',
  db_connection: 'Database connection string',
  other: 'Other secret',
}

function ConnectionForm({ type, existing = [], token, onSaved }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [test, setTest] = useState({ status: 'idle', message: '' })
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const isSensitive = type === 'ai_key'
  const label = TYPE_LABELS[type]
  const testerDisabled = !value.trim() || testing
  const saverDisabled = test.status !== 'ok' || !value.trim() || saving

  async function handleTest(e) {
    e.preventDefault()
    if (!value.trim()) {
      setTest({ status: 'error', message: 'Enter a value before testing' })
      return
    }
    setTesting(true)
    setTest({ status: 'idle', message: '' })
    try {
      await api.testCredential(token, { type, value })
      setTest({ status: 'ok', message: 'Connection OK' })
    } catch (err) {
      setTest({ status: 'error', message: err.message })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (test.status !== 'ok') return
    setSaving(true)
    try {
      for (const cred of existing) {
        if (cred.type === type) await api.deleteCredential(token, cred.id)
      }
      await api.createCredential(token, { type, name: name.trim() || null, value })
      setName('')
      setValue('')
      setTest({ status: 'idle', message: '' })
      await onSaved()
    } catch (err) {
      setTest({ status: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-gray-900">{label}</h2>
      {existing.length > 0 && (
        <p className="mt-1 text-sm text-gray-500">
          You have {existing.length} saved. Saving replaces {existing.length === 1 ? 'it' : 'them'}.
        </p>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor={`${type}-name`} className="block text-sm font-medium text-gray-700">
            Name <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id={`${type}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production, Anthropic, …"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor={`${type}-value`} className="block text-sm font-medium text-gray-700">
            {type === 'ai_key' ? 'Key' : 'Connection string'}
          </label>
          <input
            id={`${type}-value`}
            type={isSensitive ? 'password' : 'text'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setTest({ status: 'idle', message: '' })
            }}
            placeholder={
              type === 'ai_key'
                ? 'sk-…'
                : 'postgresql://user:pass@host:5432/dbname'
            }
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {test.message && (
          <p
            className={`text-sm ${
              test.status === 'ok' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {test.message}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testerDisabled}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saverDisabled}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Save is enabled after a successful test.
        </p>
      </div>
    </form>
  )
}

function Settings() {
  const { user, token, loading, logout } = useAuth()
  const [credentials, setCredentials] = useState([])
  const [fetchError, setFetchError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  async function loadCredentials() {
    const data = await api.credentials(token)
    setCredentials(data.credentials)
  }

  useEffect(() => {
    if (!token) return
    let active = true
    api
      .credentials(token)
      .then((data) => {
        if (active) setCredentials(data.credentials)
      })
      .catch((err) => {
        if (active) setFetchError(err.message)
      })
    return () => {
      active = false
    }
  }, [token])

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await api.deleteCredential(token, id)
      await loadCredentials()
    } catch (err) {
      setFetchError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </main>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-baseline gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            <Link to="/" className="text-sm text-indigo-600 hover:underline">
              ← Home
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <p className="text-sm text-gray-500">
          Keys are encrypted with AES-256 on the server and only ever shown masked.
        </p>

        {fetchError && <p className="text-sm text-red-600">{fetchError}</p>}

        <ConnectionForm
          type="ai_key"
          token={token}
          existing={credentials}
          onSaved={loadCredentials}
        />
        <ConnectionForm
          type="db_connection"
          token={token}
          existing={credentials}
          onSaved={loadCredentials}
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900">Saved credentials</h2>
          {credentials.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-400">
              Nothing saved yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {credentials.map((cred) => (
                <li
                  key={cred.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {TYPE_LABELS[cred.type] ?? cred.type}
                      </span>
                      {cred.name && (
                        <span className="truncate text-sm font-medium text-gray-900">
                          {cred.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-gray-500">
                      {cred.masked_value}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(cred.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(cred.id)}
                    disabled={deletingId === cred.id}
                    className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === cred.id ? 'Deleting…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}

export default Settings