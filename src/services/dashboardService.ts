import { z } from "zod";
import { api } from "../api/client";
import { dashboardSchema, type DashboardData } from "../dashboard/dashboardData";

export type ForecastHorizon = "THIS_MONTH" | "NEXT_MONTH";
export const forecastSchema = z.object({
  asOf: z.iso.date(),
  through: z.iso.date(),
  fundingSources: z.array(z.object({
    id: z.number().int().positive(),
    scheduledExpenses: z.number().nonnegative(),
    subscriptionExpenses: z.number().nonnegative(),
    predictedBalance: z.number(),
  })),
}).refine((value) => value.through >= value.asOf, { message: "Invalid forecast period" });
export type Forecast = z.infer<typeof forecastSchema>;

export const dashboardService = {
  async getForecast(horizon: ForecastHorizon, signal?: AbortSignal): Promise<Forecast> {
    const response = await api.get("/dashboard/forecast", { params: { horizon }, signal });
    return forecastSchema.parse(response.data);
  },
  async getOverview(year: number, signal?: AbortSignal): Promise<DashboardData> {
    const response = await api.get("/dashboard/overview", { params: { year }, signal });
    return dashboardSchema.parse(response.data);
  },
};
