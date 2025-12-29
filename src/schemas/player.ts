import { z } from 'zod'

export const playerSchema = z.object({
  name: z.string().min(1, 'Player name is required').max(50, 'Name too long'),
  number: z.number().min(0, 'Number must be 0 or higher').max(99, 'Number must be 99 or less'),
  gender: z.enum(['male', 'female'], { message: 'Gender is required' }),
})

export type PlayerFormData = z.infer<typeof playerSchema>
