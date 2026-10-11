import type { TransactionOption } from "./transactionService";
import { api } from "../api/client";

export const profileService = {
  async renameCategory(id: number, name: string): Promise<TransactionOption> {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Enter a category name.");
    const response = await api.patch<TransactionOption>(`/categories/${id}`, { name: trimmedName });
    return response.data;
  },
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
