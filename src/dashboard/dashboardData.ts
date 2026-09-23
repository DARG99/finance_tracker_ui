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

// Replace this with dashboardSchema.parse(response.data) when the API is ready.
export const mockDashboardData = dashboardSchema.parse({
  allTimeIncome: 5500.00,
  allTimeExpense: 1920.50,
  cashFlow: 3579.50,
  currentTrackedMoney: 3579.50,
  fundingSources: [
    { id: 7, name: "BPI", balance: 2500.00 },
    { id: 6, name: "Trade Republic", balance: 450.00 },
    { id: 8, name: "Cash", balance: 629.50 },
  ],
  monthlySpending: [
    { month: 1, amount: 200.00 },
    { month: 2, amount: 320.50 },
    { month: 3, amount: 0.00 },
  ],
  spendingByCategory: [
    { categoryId: 1, categoryName: "Groceries", amount: 420.50 },
    { categoryId: 2, categoryName: "Restaurants", amount: 180.00 },
    { categoryId: 3, categoryName: "Transport", amount: 95.00 },
  ],
});
