const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`)
  }
  return data
}

export const api = {
  signup: (email, password) =>
    request('/api/auth/signup', { method: 'POST', body: { email, password } }),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/api/auth/me', { token }),
  credentials: (token) => request('/api/credentials', { token }),
  createCredential: (token, { type, name, value }) =>
    request('/api/credentials', { method: 'POST', token, body: { type, name, value } }),
  deleteCredential: (token, id) =>
    request(`/api/credentials/${id}`, { method: 'DELETE', token }),
  testCredential: (token, { type, value }) =>
    request('/api/credentials/test', { method: 'POST', token, body: { type, value } }),
  bases: (token) => request('/api/bases', { token }),
  createBase: (token, name) =>
    request('/api/bases', { method: 'POST', token, body: { name } }),
  renameBase: (token, id, name) =>
    request(`/api/bases/${id}`, { method: 'PATCH', token, body: { name } }),
  deleteBase: (token, id) => request(`/api/bases/${id}`, { method: 'DELETE', token }),
  tables: (token, baseId) => request(`/api/bases/${baseId}/tables`, { token }),
  createTable: (token, baseId, name) =>
    request(`/api/bases/${baseId}/tables`, { method: 'POST', token, body: { name } }),
  renameTable: (token, id, name) =>
    request(`/api/tables/${id}`, { method: 'PATCH', token, body: { name } }),
  deleteTable: (token, id) => request(`/api/tables/${id}`, { method: 'DELETE', token }),
}