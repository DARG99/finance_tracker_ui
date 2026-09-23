import { z } from "zod";

export const transactionSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: z.number().positive(),
  sourceFundingSourceId: z.number().int().positive().nullish(),
  sourceFundingSourceName: z.string().nullish(),
  destinationFundingSourceId: z.number().int().positive().nullish(),
  destinationFundingSourceName: z.string().nullish(),
  categoryId: z.number().int().positive().nullish(),
  categoryName: z.string().nullish(),
  description: z.string().nullish(),
  transactionDate: z.string().nullish(),
  createdAt: z.string().nullish(),
});

export const transactionPageSchema = z.object({
  content: z.array(transactionSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  first: z.boolean(),
  last: z.boolean(),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionPage = z.infer<typeof transactionPageSchema>;

// Deliberately excludes type: an existing transaction cannot change its type.
export type TransactionUpdate = {
  amount: number;
  transactionDate: string;
  description: string;
  sourceFundingSourceId?: number;
  destinationFundingSourceId?: number;
  categoryId?: number;
};
