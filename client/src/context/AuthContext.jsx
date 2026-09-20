import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { AuthContext } from './auth-context'

const TOKEN_KEY = 'openbase_token'
const USER_KEY = 'openbase_user'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(readUser)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    let active = true
    api
      .me(token)
      .then((data) => {
        if (!active) return
        setUser(data.user)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        logout()
      })
    return () => {
      active = false
    }
  }, [token])

  function saveSession(nextToken, nextUser) {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  }

  function logout() {
    setToken(null)
    setUser(null)
    setLoading(false)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}