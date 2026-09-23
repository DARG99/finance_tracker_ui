import { api } from "../api/client";

export const profileService = {
  async addFundingSource(name: string, initialBalance?: number): Promise<void> {
    await api.post("/funding-sources", { name, initialBalance });
  },
  async addCategory(name: string): Promise<void> {
    await api.post("/categories", { name });
  },
};
