'use client';

import React from 'react';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCompactInr, formatFullInr, type MonthlyRevenuePoint } from './monthly-revenue';

export type MonthlyRevenueChartProps = {
  data: MonthlyRevenuePoint[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
};

type RevenueTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: MonthlyRevenuePoint }>;
};

function RevenueTooltip({ active, payload }: RevenueTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="revenue-tooltip">
      <strong>{point.fullMonthLabel}</strong>
      <span>{formatFullInr(point.revenue)}</span>
    </div>
  );
}

export function MonthlyRevenueChart({ data, isLoading, error, onRetry }: MonthlyRevenueChartProps) {
  return (
    <section className="card analytics-chart-section" aria-labelledby="monthly-revenue-title">
      <h2 id="monthly-revenue-title">Monthly revenue</h2>
      <p id="monthly-revenue-description" className="sr-only">
        Revenue from completed trips for the current month and previous six calendar months.
      </p>

      <div className="monthly-revenue-chart" aria-describedby="monthly-revenue-description">
        {isLoading ? (
          <div className="chart-skeleton" role="status" aria-label="Loading monthly revenue">
            <span>Loading monthly revenue…</span>
          </div>
        ) : error ? (
          <div className="chart-state" role="alert">
            <p>Monthly revenue could not be loaded.</p>
            <button className="button" type="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="chart-state">
            <p>No revenue data for this period.</p>
          </div>
        ) : (
          <>
            <div className="chart-canvas" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--line)"
                    strokeDasharray="3 5"
                    strokeOpacity={0.45}
                  />
                  <XAxis
                    dataKey="monthLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickFormatter={formatCompactInr}
                    width={56}
                  />
                  <Tooltip
                    content={<RevenueTooltip />}
                    cursor={{ fill: 'var(--line)', opacity: 0.18 }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="var(--blue)"
                    stroke="#7eafe0"
                    strokeWidth={1}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={58}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="sr-only">
              {data.map((point) => (
                <li key={point.month}>
                  {point.fullMonthLabel}: {formatFullInr(point.revenue)}.
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
