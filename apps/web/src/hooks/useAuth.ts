import { useState, useEffect } from 'react'

export function useAuth() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // placeholder: fetch current user from /api/auth/me
  }, [])

  return { user, setUser }
}
