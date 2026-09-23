import { z } from "zod";
import { api } from "../api/client";

// Keep Java Long IDs as strings to avoid rounding.
export const adminUserIdSchema = z.string().trim().regex(/^[1-9]\d*$/)
  .refine((value) => /^[1-9]\d*$/.test(value) && BigInt(value) <= 9223372036854775807n, "Invalid user ID");
const deleteResultSchema = z.object({ deletedTransactions: z.number().int().nonnegative() });

export const adminService = {
  async deleteAllTransactionsForUser(userId: string) {
    const id = adminUserIdSchema.parse(userId);
    const response = await api.delete(`/admin/users/${id}/transactions`);
    return deleteResultSchema.parse(response.data);
  },
};
