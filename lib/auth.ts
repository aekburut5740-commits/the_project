import { jwtDecode } from "jwt-decode"

export type UserRole = "admin" | "customer"

export interface JwtUser {
  id: number
  username: string
  role: UserRole
  iat?: number
  exp?: number
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function setToken(token: string) {
  localStorage.setItem("token", token)
}

export function removeToken() {
  localStorage.removeItem("token")
}

export function getUser(): JwtUser | null {
  const token = getToken()
  if (!token) return null
  try {
    return jwtDecode<JwtUser>(token)
  } catch {
    return null
  }
}

export function isTokenExpired(): boolean {
  const user = getUser()
  if (!user?.exp) return true
  return Date.now() / 1000 > user.exp
}

export function authHeader(): { Authorization: string } | Record<string, never> {
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}
