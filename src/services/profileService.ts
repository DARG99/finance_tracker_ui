import { api } from "../api/client";

export const profileService = {
  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
  async deleteFundingSource(id: number): Promise<void> {
    await api.delete(`/funding-sources/${id}`);
  },
  async addFundingSource(name: string, initialBalance?: number): Promise<void> {
    await api.post("/funding-sources", { name, initialBalance });
  },
  async addCategory(name: string): Promise<void> {
    await api.post("/categories", { name });
  },
};
