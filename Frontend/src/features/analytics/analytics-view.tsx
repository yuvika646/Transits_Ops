'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { money } from '@/lib/store';
import type { State } from '@/lib/types';
import { MonthlyRevenueChart } from './monthly-revenue-chart';
import { mapMonthlyRevenue, type MonthlyRevenueResponse } from './monthly-revenue';

type Summary = {
  fuelEfficiency: number | null;
  operationalCost: number;
  revenue: number;
  fuelCost?: number;
  maintenanceCost?: number;
  fleetUtilization?: number;
  vehicleRoi?: number | null;
};

type VehicleCost = {
  id: string;
  name: string;
  totalCost: number;
};

export function AnalyticsView({ state }: { state: State }) {
  const summary = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api<Summary>('/api/v1/analytics/summary'),
  });
  const monthlyRevenue = useQuery({
    queryKey: ['analytics', 'monthly-revenue'],
    queryFn: () => api<MonthlyRevenueResponse[]>('/api/v1/analytics/monthly-revenue'),
  });
  const vehicleCosts = useQuery({
    queryKey: ['analytics', 'vehicle-costs'],
    queryFn: () => api<VehicleCost[]>('/api/v1/analytics/vehicle-costs'),
  });

  const revenuePoints = mapMonthlyRevenue(monthlyRevenue.data ?? []);
  const activeVehicles = state.vehicles.filter((vehicle) => vehicle.status !== 'RETIRED');
  const activeTrips = state.trips.filter(
    (trip) => trip.status === 'DISPATCHED' || trip.status === 'IN_PROGRESS',
  );
  const fleetUtilization = (activeTrips.length / Math.max(1, activeVehicles.length)) * 100;
  const acquisitionCost = state.vehicles.reduce(
    (total, vehicle) => total + vehicle.acquisitionCost,
    0,
  );
  const vehicleRoi = acquisitionCost
    ? (((summary.data?.revenue ?? 0) - (summary.data?.operationalCost ?? 0)) / acquisitionCost) *
      100
    : 0;

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
          ['Fleet Utilization', Math.round(fleetUtilization) + '%'],
          ['Operational Cost', money(summary.data?.operationalCost ?? 0)],
          ['Vehicle ROI', vehicleRoi.toFixed(1) + '%'],
        ].map(([name, value]) => (
          <div className="card kpi" key={name}>
            <small>{name}</small>
            <div className="value">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid two analytics-chart-grid">
        <MonthlyRevenueChart
          data={revenuePoints}
          isLoading={monthlyRevenue.isLoading}
          error={monthlyRevenue.error}
          onRetry={() => void monthlyRevenue.refetch()}
        />

        <section className="card analytics-chart-section">
          <h2>Costliest vehicles</h2>
          {vehicleCosts.data?.slice(0, 5).map((vehicle, index) => (
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
