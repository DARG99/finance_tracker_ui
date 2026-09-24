export function displayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function parseDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  if (Number(year) === 0) return null;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

export function monthTransactionsUrl(year: number, month: number): string {
  const prefix = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  const lastDay = new Date(`${prefix}-01T00:00:00Z`);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
  return `/transactions?${new URLSearchParams({ from: `${prefix}-01`, to: `${prefix}-${lastDay.getUTCDate()}` })}`;
}

export function dateFiltersFromSearch(search: string): { from?: string; to?: string } {
  const params = new URLSearchParams(search);
  const from = parseDate(displayDate(params.get("from") ?? "")) ?? undefined;
  const to = parseDate(displayDate(params.get("to") ?? "")) ?? undefined;
  return from && to && from > to ? {} : { from, to };
}
