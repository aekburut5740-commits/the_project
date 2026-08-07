import { useEffect, useState } from "react"
import { getUser } from "./auth"

export function useCurrentUser() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const user = mounted ? getUser() : null
  const isAdmin = user?.role === "admin"

  return { user, isAdmin, mounted }
}