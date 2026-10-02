import { z } from "zod";

export const transactionSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: z.number().positive(),
  transactionNature: z.enum(["NORMAL", "REIMBURSEMENT"]).optional(),
  reimbursementForTransactionId: z.number().int().positive().nullish(),
  reimbursementForDescription: z.string().nullish(),
  reimbursementForTransactionDate: z.string().nullish(),
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

function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
  content: z.array(item),
  page: z.number().int().nonnegative().optional(),
  number: z.number().int().nonnegative().optional(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  first: z.boolean(),
  last: z.boolean(),
}).refine((value) => value.page !== undefined || value.number !== undefined, {
  message: "Missing page number",
}).transform((value) => ({ ...value, page: value.page ?? value.number! }));
}

export const transactionPageSchema = pageSchema(transactionSchema);

export const reimbursableExpenseSchema = z.object({
  id: z.number().int().positive(),
  description: z.string().nullish(),
  transactionDate: z.string(),
  amount: z.number().positive(),
  alreadyReimbursedAmount: z.number().nonnegative(),
  remainingReimbursableAmount: z.number().nonnegative(),
  categoryName: z.string().nullish(),
  sourceFundingSourceName: z.string().nullish(),
});
export const reimbursableExpensePageSchema = pageSchema(reimbursableExpenseSchema);
export type ReimbursableExpense = z.infer<typeof reimbursableExpenseSchema>;
export type ReimbursableExpensePage = z.infer<typeof reimbursableExpensePageSchema>;

export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionPage = z.infer<typeof transactionPageSchema>;

// Deliberately excludes type: an existing transaction cannot change its type.
export type TransactionUpdate = {
  amount?: number;
  transactionDate?: string;
  description?: string;
  sourceFundingSourceId?: number;
  destinationFundingSourceId?: number;
  categoryId?: number;
  transactionNature?: "NORMAL" | "REIMBURSEMENT";
  reimbursementForTransactionId?: number | null;
};
