const AUTH_URL = (import.meta.env.VITE_JKOS_AUTH_URL as string | undefined)
  ?? 'https://auth.jkos.net'

export interface JkosUser {
  id:         string
  email:      string
  name:       string
  avatar_url: string | null
  role:       string
}

export async function getMe(): Promise<JkosUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.ok) {
    const data = await res.json()
    return data.user as JkosUser
  }
  return null
}

export async function refreshToken(): Promise<boolean> {
  const res = await fetch(`${AUTH_URL}/auth/refresh`, {
    method:      'POST',
    credentials: 'include',
  })
  return res.ok
}

export function redirectToLogin(): void {
  window.location.href =
    `${AUTH_URL}/auth/login?redirect_to=${encodeURIComponent(window.location.href)}`
}

export async function logout(): Promise<void> {
  await fetch(`${AUTH_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
  window.location.href = `${AUTH_URL}/auth/login`
}
