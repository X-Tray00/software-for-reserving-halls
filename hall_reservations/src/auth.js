const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export function getUser() {
  const raw = sessionStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

export function isAdmin() {
  return getUser()?.roles?.includes('ADMIN') ?? false
}

export async function logout() {
  try {
    await fetch(`${BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' })
  } catch (_) { /* ignore network errors on logout */ }
  sessionStorage.clear()
  window.location.href = '/#/login'
}

/** Redirect to login if no stored user, returns user object otherwise */
export function requireAuth() {
  const user = getUser()
  if (!user?.username) {
    window.location.href = '/#/login'
    return null
  }
  return user
}
