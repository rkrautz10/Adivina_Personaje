import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().min(1).default('qwen2.5:3b'),
  AI_BASE_URL: z.string().url().default('http://localhost:11434/v1'),
})

export const environment = environmentSchema.parse(process.env)