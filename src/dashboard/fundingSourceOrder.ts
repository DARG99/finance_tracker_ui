const STORAGE_KEY = "finance-funding-source-order-v1";

export function loadFundingSourceOrder(): number[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0))]
      : [];
  } catch {
    return [];
  }
}

export function orderFundingSources<T extends { id: number }>(sources: T[], order: number[]): T[] {
  const remaining = new Map(sources.map((source) => [source.id, source]));
  const sorted: T[] = [];
  for (const id of order) {
    const source = remaining.get(id);
    if (source) {
      sorted.push(source);
      remaining.delete(id);
    }
  }
  return [...sorted, ...remaining.values()];
}

export function saveFundingSourceOrder(ids: number[]): boolean {
  try {
    // Retain preferences for source IDs outside the current account's response.
    // Only IDs are stored; names, balances, and credentials are never persisted here.
    const visible = new Set(ids);
    const otherIds = loadFundingSourceOrder().filter((id) => !visible.has(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, ...otherIds]));
    return true;
  } catch {
    return false;
  }
}
