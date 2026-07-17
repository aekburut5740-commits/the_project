export type AuthUser = {
  id: number
  username: string
  email?: string
  role: "admin" | "customer" | string
  [key: string]: unknown
}

const TOKEN_KEY = "nexus_token"
const USER_KEY = "nexus_user"

export function setToken(token: string, remember = true) {
  const storage = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  other.removeItem(TOKEN_KEY)
  storage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

export function setUser(user: AuthUser, remember = true) {
  const storage = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  other.removeItem(USER_KEY)
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
  if (!raw) return decodeToken(getToken())
  try { return JSON.parse(raw) as AuthUser } catch { return decodeToken(getToken()) }
}

export function clearAuth() {
  if (typeof window === "undefined") return
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(USER_KEY)
  }
}

function decodeToken(token: string | null): AuthUser | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    return payload as AuthUser
  } catch { return null }
}
