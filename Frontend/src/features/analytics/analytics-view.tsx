'use client';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { money } from '@/lib/store';
type Summary = {
  fuelEfficiency: number | null;
  operationalCost: number;
  revenue: number;
  fleetUtilization?: number;
  vehicleRoi?: number | null;
};
type MonthlyRevenue = { month: string; revenue: number | string };
type VehicleCost = { id: string; name: string; totalCost: number };
export function AnalyticsView() {
  const summary = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api<Summary>('/api/v1/analytics/summary'),
  });
  const monthly = useQuery({
    queryKey: ['analytics', 'monthly-revenue'],
    queryFn: () => api<MonthlyRevenue[]>('/api/v1/analytics/monthly-revenue'),
  });
  const costs = useQuery({
    queryKey: ['analytics', 'vehicle-costs'],
    queryFn: () => api<VehicleCost[]>('/api/v1/analytics/vehicle-costs'),
  });
  const revenue =
    monthly.data?.map((entry) => ({ ...entry, revenue: Number(entry.revenue) })) ?? [];
  return (
    <>
      <div className="row between">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p className="sub">Server-calculated data from PostgreSQL</p>
        </div>
        <button className="button" onClick={() => window.print()}>
          Export PDF / Print
        </button>
      </div>
      <div className="kpis grid">
        {[
          [
            'Fuel Efficiency',
            summary.data?.fuelEfficiency == null
              ? '—'
              : `${summary.data.fuelEfficiency.toFixed(1)} km/L`,
          ],
          ['Operational Cost', money(summary.data?.operationalCost ?? 0)],
          ['Revenue', money(summary.data?.revenue ?? 0)],
        ].map(([name, value]) => (
          <div className="card kpi" key={name}>
            <small>{name}</small>
            <div className="value">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid two">
        <section className="card">
          <h2>Monthly revenue</h2>
          <div style={{ width: '100%', height: 260 }}>
            {revenue.length ? (
              <ResponsiveContainer>
                <BarChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Bar dataKey="revenue" fill="#5b9bd5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="sub">No completed-trip revenue has been recorded.</p>
            )}
          </div>
        </section>
        <section className="card">
          <h2>Costliest vehicles</h2>
          {costs.data?.slice(0, 5).map((vehicle, index) => (
            <div key={vehicle.id}>
              <div className="row between">
                <span>{vehicle.name}</span>
                <span>{money(vehicle.totalCost)}</span>
              </div>
              <div className="chartbar" style={{ width: `${Math.max(10, 95 - index * 15)}%` }} />
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
