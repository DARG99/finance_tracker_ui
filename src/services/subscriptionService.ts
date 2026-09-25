import { z } from "zod";
import { api } from "../api/client";

export const subscriptionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  amount: z.number().positive(),
  frequency: z.enum(["MONTHLY", "YEARLY"]),
  nextPaymentDate: z.string(),
  active: z.boolean(),
  fundingSourceId: z.number().int().positive(),
  fundingSourceName: z.string(),
  categoryId: z.number().int().positive(),
  categoryName: z.string(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;
export type NewSubscription = Pick<Subscription, "name" | "amount" | "frequency" | "nextPaymentDate" | "fundingSourceId" | "categoryId">;
export type SubscriptionUpdate = Partial<NewSubscription & { active: boolean }>;

export const subscriptionService = {
  async list(signal?: AbortSignal): Promise<Subscription[]> {
    const response = await api.get("/subscriptions", { signal });
    return z.array(subscriptionSchema).parse(response.data);
  },
  async create(value: NewSubscription): Promise<Subscription> {
    const response = await api.post("/subscriptions", value);
    return subscriptionSchema.parse(response.data);
  },
  async update(id: number, value: SubscriptionUpdate): Promise<Subscription> {
    const response = await api.patch(`/subscriptions/${id}`, value);
    return subscriptionSchema.parse(response.data);
  },
  async deactivate(id: number): Promise<Subscription> {
    const response = await api.patch(`/subscriptions/${id}/deactivate`);
    return subscriptionSchema.parse(response.data);
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/subscriptions/${id}`);
  },
};
