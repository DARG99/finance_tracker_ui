import { z } from "zod";
import { api } from "../api/client";
import { dashboardSchema, type DashboardData } from "../dashboard/dashboardData";

export const paydaySchema = z.object({ paydayDay: z.number().int().min(1).max(31).nullable() });
const paydayUpdateSchema = z.object({ paydayDay: z.number().int().min(1).max(31) });
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
  async getPayday(signal?: AbortSignal) {
    const response = await api.get("/users/me/payday", { signal });
    return paydaySchema.parse(response.data);
  },
  async setPayday(paydayDay: number) {
    const response = await api.patch("/users/me/payday", paydayUpdateSchema.parse({ paydayDay }));
    return paydayUpdateSchema.parse(response.data);
  },
  async getForecast(signal?: AbortSignal): Promise<Forecast> {
    const response = await api.get("/dashboard/forecast", { signal });
    return forecastSchema.parse(response.data);
  },
  async getOverview(year: number, signal?: AbortSignal): Promise<DashboardData> {
    const response = await api.get("/dashboard/overview", { params: { year }, signal });
    return dashboardSchema.parse(response.data);
  },
};
