import { z } from "zod";

const categorySpendingSchema = z.object({
  categoryId: z.number().int().positive(),
  categoryName: z.string(),
  amount: z.number().nonnegative(),
});

export const dashboardSchema = z.object({
  allTimeIncome: z.number(),
  allTimeExpense: z.number(),
  cashFlow: z.number(),
  currentTrackedMoney: z.number(),
  fundingSources: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string(),
    balance: z.number(),
  })),
  monthlySpending: z.array(z.object({
    month: z.number().int().min(1).max(12),
    amount: z.number(),
  })),
  spendingByCategory: z.array(categorySpendingSchema),
  monthlySpendingByCategory: z.array(categorySpendingSchema.extend({
    month: z.number().int().min(1).max(12),
  })).optional(),
});

export type DashboardData = z.infer<typeof dashboardSchema>;

