import { z } from 'zod'

export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50, 'Team name too long'),
  city: z.string().min(1, 'City is required').max(50, 'City name too long'),
})

export type TeamFormData = z.infer<typeof teamSchema>

