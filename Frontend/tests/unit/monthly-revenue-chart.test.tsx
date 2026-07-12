import { fireEvent, render, screen } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children, data }: { children: ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-bar-count={data.length}>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Bar: () => null,
}));

import { MonthlyRevenueChart } from '../../src/features/analytics/monthly-revenue-chart';
import { mapMonthlyRevenue } from '../../src/features/analytics/monthly-revenue';

const retry = vi.fn();

describe('MonthlyRevenueChart', () => {
  it('renders a stable loading state', () => {
    render(<MonthlyRevenueChart data={[]} isLoading error={null} onRetry={retry} />);
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading monthly revenue');
  });

  it('renders an empty state', () => {
    render(<MonthlyRevenueChart data={[]} isLoading={false} error={null} onRetry={retry} />);
    expect(screen.getByText('No revenue data for this period.')).toBeTruthy();
  });

  it('renders an isolated error and retries', () => {
    render(
      <MonthlyRevenueChart
        data={[]}
        isLoading={false}
        error={new Error('network')}
        onRetry={retry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders seven chart points and an accessible revenue summary', () => {
    const data = mapMonthlyRevenue(
      [
        { month: '2026-02', revenue: 0 },
        { month: '2026-07', revenue: 245000 },
      ],
      new Date('2026-07-12T00:00:00Z'),
    );
    render(<MonthlyRevenueChart data={data} isLoading={false} error={null} onRetry={retry} />);

    expect(screen.getByTestId('bar-chart').getAttribute('data-bar-count')).toBe('7');
    expect(screen.getByText(/July 2026:.*2,45,000/)).toBeTruthy();
    expect(screen.getByText(/February 2026:.*0/)).toBeTruthy();
  });
});
