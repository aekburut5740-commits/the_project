import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().optional(),
  JWT_SECRET: z.string().min(8),
  NEXT_PUBLIC_API_URL: z.string().optional(),
})

export const env = envSchema.parse(process.env)
