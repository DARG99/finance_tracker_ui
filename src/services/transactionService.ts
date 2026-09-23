import { z } from "zod";
import { api } from "../api/client";
import { transactionPageSchema, transactionSchema, type TransactionUpdate } from "../schemas/transactionSchema";

const optionsSchema = z.array(z.object({
  id: z.number().int().positive(),
  name: z.string(),
}));

export type TransactionOption = z.infer<typeof optionsSchema>[number];
export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

type CommonTransaction = { amount: number; transactionDate: string };
export type NewTransaction = CommonTransaction & (
  | { type: "EXPENSE"; sourceFundingSourceId: number; categoryId: number; description?: string }
  | { type: "INCOME"; destinationFundingSourceId: number }
  | { type: "TRANSFER"; sourceFundingSourceId: number; destinationFundingSourceId: number; description?: string }
);

// Paths are relative to the API base URL (which already includes /api).
export const transactionService = {
  async list(page = 0, signal?: AbortSignal) {
    const response = await api.get("/transactions", { params: { page, size: 20 }, signal });
    return transactionPageSchema.parse(response.data);
  },
  async update(id: number, transaction: TransactionUpdate) {
    const response = await api.patch(`/transactions/${id}`, transaction);
    return transactionSchema.parse(response.data);
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/transactions/${id}`);
  },
  async getFundingSources(signal?: AbortSignal): Promise<TransactionOption[]> {
    const response = await api.get("/funding-sources", { signal });
    return optionsSchema.parse(response.data);
  },
  async getCategories(signal?: AbortSignal): Promise<TransactionOption[]> {
    const response = await api.get("/categories", { signal });
    return optionsSchema.parse(response.data);
  },
  async create(transaction: NewTransaction): Promise<void> {
    await api.post("/transactions", transaction);
  },
};
