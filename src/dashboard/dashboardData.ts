import { z } from "zod";

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
    amount: z.number().nonnegative(),
  })),
  spendingByCategory: z.array(z.object({
    categoryId: z.number().int().positive(),
    categoryName: z.string(),
    amount: z.number().nonnegative(),
  })),
});

export type DashboardData = z.infer<typeof dashboardSchema>;

