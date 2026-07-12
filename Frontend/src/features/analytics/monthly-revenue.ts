export type MonthlyRevenueResponse = {
  month: string;
  revenue: number | string;
};

export type MonthlyRevenuePoint = {
  month: string;
  monthLabel: string;
  fullMonthLabel: string;
  revenue: number;
};

const shortMonthFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  timeZone: 'UTC',
});

const fullMonthFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const fullCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseMonth(value: string): Date | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function mapMonthlyRevenue(
  response: MonthlyRevenueResponse[],
  anchorDate = new Date(),
): MonthlyRevenuePoint[] {
  if (response.length === 0) return [];

  const totals = new Map<string, number>();
  for (const entry of response) {
    if (!parseMonth(entry.month)) continue;
    const revenue = Number(entry.revenue);
    if (!Number.isFinite(revenue)) continue;
    totals.set(entry.month, (totals.get(entry.month) ?? 0) + revenue);
  }

  const anchor = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 6 + index, 1));
    const month = monthKey(date);
    return {
      month,
      monthLabel: shortMonthFormatter.format(date),
      fullMonthLabel: fullMonthFormatter.format(date),
      revenue: totals.get(month) ?? 0,
    };
  });
}

export function formatFullInr(value: number): string {
  return fullCurrencyFormatter.format(value);
}

export function formatCompactInr(value: number): string {
  const absolute = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absolute >= 10_000_000) return `${sign}₹${trimDecimal(absolute / 10_000_000)}Cr`;
  if (absolute >= 100_000) return `${sign}₹${trimDecimal(absolute / 100_000)}L`;
  if (absolute >= 1_000) return `${sign}₹${trimDecimal(absolute / 1_000)}K`;
  return `${sign}₹${trimDecimal(absolute)}`;
}

function trimDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}
