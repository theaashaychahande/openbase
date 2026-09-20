import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'

function Home() {
  const { user, token, loading, logout } = useAuth()
  const [credentials, setCredentials] = useState([])
  const [creditError, setCreditError] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    api
      .credentials(token)
      .then((data) => {
        if (active) setCredentials(data.credentials)
      })
      .catch((err) => {
        if (active) setCreditError(err.message)
      })
    return () => {
      active = false
    }
  }, [token])

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
          <h1 className="text-xl font-semibold text-gray-900">openbase</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <Link
              to="/settings"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Settings
            </Link>
            <button
              onClick={logout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="text-lg font-medium text-gray-900">Your credentials</h2>
        <p className="mt-1 text-sm text-gray-500">
          This view is protected by the JWT session middleware.
        </p>

        {creditError && <p className="mt-4 text-sm text-red-600">{creditError}</p>}

        {credentials.length === 0 && !creditError && (
          <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-400">
            No credentials yet.
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {credentials.map((cred) => (
            <li
              key={cred.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium text-gray-900">{cred.type}</span>
                <p className="mt-0.5 font-mono text-xs text-gray-500">{cred.masked_value}</p>
              </div>
              <span className="text-xs text-gray-400">{new Date(cred.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default Home