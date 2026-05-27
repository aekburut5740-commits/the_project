import axios from 'axios'

export const login = async (email: string, password: string) => {
  const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, { email, password })
  return res.data
}
