const API_BASE = import.meta.env.VITE_API_URL || ''

export async function apiFetch(path, options = {}) {
  const url = API_BASE ? `${API_BASE}${path}` : path
  return fetch(url, options)
}
