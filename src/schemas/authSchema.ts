import { z } from "zod";

export const loginResponseSchema = z.object({
  token: z.string().trim().min(1),
  expiresIn: z.number().positive().finite(),
  refreshToken: z.string().trim().min(1),
  refreshExpiresIn: z.number().positive().finite(),
});
