import { describe, expect, it } from 'vitest';

import {
  formatCompactInr,
  formatFullInr,
  mapMonthlyRevenue,
} from '../../src/features/analytics/monthly-revenue';

describe('monthly revenue mapping', () => {
  const anchor = new Date('2026-07-12T00:00:00Z');

  it('sorts the latest seven calendar months and converts numeric strings', () => {
    const points = mapMonthlyRevenue(
      [
        { month: '2026-07', revenue: '245000' },
        { month: '2026-01', revenue: 185000 },
        { month: '2026-03', revenue: '210000' },
      ],
      anchor,
    );

    expect(points.map((point) => point.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
    ]);
    expect(points.at(-1)?.revenue).toBe(245000);
  });

  it('fills missing months with zero and preserves explicit zero revenue', () => {
    const points = mapMonthlyRevenue(
      [
        { month: '2026-02', revenue: 0 },
        { month: '2026-07', revenue: 1000 },
      ],
      anchor,
    );

    expect(points).toHaveLength(7);
    expect(points.find((point) => point.month === '2026-02')?.revenue).toBe(0);
    expect(points.find((point) => point.month === '2026-06')?.revenue).toBe(0);
  });

  it('returns an empty collection when the API has no revenue records', () => {
    expect(mapMonthlyRevenue([], anchor)).toEqual([]);
  });
});

describe('INR formatting', () => {
  it('formats complete INR values', () => {
    expect(formatFullInr(245000)).toContain('2,45,000');
  });

  it('formats compact thousands, lakhs and crores', () => {
    expect(formatCompactInr(25000)).toBe('₹25K');
    expect(formatCompactInr(100000)).toBe('₹1L');
    expect(formatCompactInr(250000)).toBe('₹2.5L');
    expect(formatCompactInr(10000000)).toBe('₹1Cr');
  });
});
