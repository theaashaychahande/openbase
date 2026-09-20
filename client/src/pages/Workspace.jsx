import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'
import Grid from '../components/Grid'
import Sidebar from '../components/Sidebar'
import TableTabs from '../components/TableTabs'

function Workspace() {
  const { baseId, tableId } = useParams()
  const navigate = useNavigate()
  const { user, token, loading, logout } = useAuth()

  const [bases, setBases] = useState([])
  const [tablesFor, setTablesFor] = useState({ baseId: null, tables: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let active = true
    api
      .bases(token)
      .then((data) => {
        if (active) setBases(data.bases)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    if (!token || !baseId) return
    let active = true
    api
      .tables(token, baseId)
      .then((data) => {
        if (active) setTablesFor({ baseId, tables: data.tables })
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [token, baseId])

  const tables = tablesFor.baseId === baseId ? tablesFor.tables : []

  async function run(fn) {
    try {
      await fn()
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function reloadBases() {
    const data = await api.bases(token)
    setBases(data.bases)
  }

  async function reloadTables() {
    const data = await api.tables(token, baseId)
    setTablesFor({ baseId, tables: data.tables })
  }

  const actions = {
    createBase: (name) =>
      run(async () => {
        await api.createBase(token, name)
        await reloadBases()
      }),
    createTable: (name) =>
      run(async () => {
        await api.createTable(token, baseId, name)
        await reloadTables()
      }),
    renameBase: (id, name) =>
      run(async () => {
        const data = await api.renameBase(token, id, name)
        setBases((current) => current.map((b) => (b.id === id ? { ...b, name: data.base.name } : b)))
      }),
    renameTable: (id, name) =>
      run(async () => {
        const data = await api.renameTable(token, id, name)
        setTablesFor((current) => {
          if (current.baseId !== baseId) return current
          return {
            baseId: current.baseId,
            tables: current.tables.map((t) =>
              t.id === id ? { ...t, name: data.table.name } : t,
            ),
          }
        })
      }),
    deleteBase: (base) =>
      run(async () => {
        if (!window.confirm(`Delete base "${base.name}"? This also removes its tables and records.`)) {
          return
        }
        await api.deleteBase(token, base.id)
        setBases((current) => current.filter((b) => b.id !== base.id))
        if (baseId === base.id) navigate('/app')
      }),
    deleteTable: (table) =>
      run(async () => {
        if (!window.confirm(`Delete table "${table.name}"? This also removes its fields and records.`)) {
          return
        }
        await api.deleteTable(token, table.id)
        setTablesFor((current) => {
          if (current.baseId !== baseId) return current
          return {
            baseId: current.baseId,
            tables: current.tables.filter((t) => t.id !== table.id),
          }
        })
        if (tableId === table.id) navigate(`/app/${baseId}`)
      }),
  }

  const activeBase = bases.find((b) => b.id === baseId)

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading…</p>
      </main>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <main className="flex h-screen flex-col bg-gray-100">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-baseline gap-4">
          <h1 className="text-lg font-semibold text-gray-900">openbase</h1>
          {activeBase && <span className="text-sm text-gray-500">{activeBase.name}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <Link
            to="/"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Home
          </Link>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      {error && <div className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          bases={bases}
          activeBaseId={baseId}
          onCreate={actions.createBase}
          onRename={actions.renameBase}
          onDelete={actions.deleteBase}
          onSelect={(id) => navigate(`/app/${id}`)}
        />

        <section className="flex flex-1 flex-col overflow-hidden">
          {baseId ? (
            <>
              <TableTabs
                key={baseId}
                tables={tables}
                activeTableId={tableId}
                onCreate={actions.createTable}
                onRename={actions.renameTable}
                onDelete={actions.deleteTable}
                onSelect={(id) => navigate(`/app/${baseId}/${id}`)}
              />
              <div className="flex-1 overflow-hidden bg-white">
                {tableId ? (
                  <Grid key={tableId} token={token} tableId={tableId} />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-gray-400">Select a table to open the grid.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">Select a base to see its tables.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Workspace