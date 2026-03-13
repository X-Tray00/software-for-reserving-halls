const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

const OPTS = { credentials: 'include' }

// Called when the backend returns 401 (expired/invalid access token). We don't
// redirect immediately; instead we raise a global event so the app can ask the
// user whether they want to continue the session.
function on401() {
  window.dispatchEvent(new CustomEvent('session-expired'))
}

export async function fetchHalls() {
  const res = await fetch(`${BASE}/api/halls`, OPTS)
  if (res.status === 401) { on401(); throw new Error('Unauthorized') }
  const data = await res.json()
  return data.body
}

export async function fetchHall(id) {
  const res = await fetch(`${BASE}/api/halls/${id}`, OPTS)
  if (res.status === 401) { on401(); throw new Error('Unauthorized') }
  const data = await res.json()
  return data.body
}

export async function createHall(formData) {
  const res = await fetch(`${BASE}/api/halls`, { ...OPTS, method: 'POST', body: formData })
  return { ok: res.ok, data: await res.json() }
}

export async function updateHall(id, formData) {
  const res = await fetch(`${BASE}/api/halls/${id}`, { ...OPTS, method: 'PUT', body: formData })
  return { ok: res.ok, data: await res.json() }
}

export async function deleteHall(id) {
  const res = await fetch(`${BASE}/api/halls/${id}`, { ...OPTS, method: 'DELETE' })
  return { ok: res.ok, data: await res.json() }
}

export async function createReservation(payload) {
  const res = await fetch(`${BASE}/api/reservations`, {
    ...OPTS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return { ok: res.ok, status: res.status, data: await res.json() }
}

export async function fetchUserReservations() {
  const res = await fetch(`${BASE}/api/reservations?mine=true`, OPTS)
  if (res.status === 401) { on401(); throw new Error('Unauthorized') }
  const data = await res.json()
  return data.body || []
}

export async function cancelReservation(id) {
  const res = await fetch(`${BASE}/api/reservations/${id}`, { ...OPTS, method: 'DELETE' })
  return { ok: res.ok, data: await res.json() }
}

export async function fetchAdminReservations() {
  const res = await fetch(`${BASE}/api/reservations`, OPTS)
  if (res.status === 401) { on401(); throw new Error('Unauthorized') }
  const data = await res.json()
  return data.body || []
}

export async function loginUser(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    ...OPTS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return { ok: res.ok, data: await res.json() }
}

export async function registerUser(username, password) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    ...OPTS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return { ok: res.ok, data: await res.json() }
}

export async function fetchReservationSummary() {
  const res = await fetch(`${BASE}/api/reservations/summary`, OPTS)
  if (res.status === 401) { on401(); throw new Error('Unauthorized') }
  const data = await res.json()
  return data.body || {}
}

// Try to refresh the session using the HttpOnly refresh_token cookie. Returns
// true on success (new cookies issued) and false if the refresh token is
// missing/invalid/expired.
export async function refreshSession() {
  const res = await fetch(`${BASE}/api/auth/refresh`, {
    ...OPTS,
    method: 'POST',
  })
  if (!res.ok) return false
  const data = await res.json()
  // Keep frontend user info (username, roles) in sync with the backend payload.
  if (data.body) {
    try {
      sessionStorage.setItem('user', JSON.stringify(data.body))
    } catch {
      // ignore storage errors
    }
  }
  return true
}

export async function updateReservationStatus(id, status) {
  const res = await fetch(`${BASE}/api/reservations/${id}/status`, {
    ...OPTS,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return { ok: res.ok, data: await res.json() }
}

export function imageUrl(filename) {
  return `${BASE}/api/halls/images/${filename}`
}

export async function joinWaitlist(hallId, startDate, endDate) {
  const res = await fetch(`${BASE}/api/halls/${hallId}/waitlist`, {
    ...OPTS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date: startDate, end_date: endDate }),
  })
  return { ok: res.ok, data: await res.json() }
}

export async function leaveWaitlist(hallId) {
  const res = await fetch(`${BASE}/api/halls/${hallId}/waitlist`, { ...OPTS, method: 'DELETE' })
  return { ok: res.ok, data: await res.json() }
}

export async function fetchWaitlist() {
  const res = await fetch(`${BASE}/api/admin/waitlist`, OPTS)
  if (res.status === 401) { on401(); throw new Error('Unauthorized') }
  const data = await res.json()
  return data.body || []
}
