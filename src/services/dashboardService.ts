import { api } from "../api/client";
import { dashboardSchema, type DashboardData } from "../dashboard/dashboardData";

export const dashboardService = {
  async getOverview(year: number, signal?: AbortSignal): Promise<DashboardData> {
    const response = await api.get("/dashboard/overview", { params: { year }, signal });
    return dashboardSchema.parse(response.data);
  },
};
