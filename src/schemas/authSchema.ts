import { z } from "zod";

export const loginResponseSchema = z.object({
  token: z.string().trim().min(1),
});
