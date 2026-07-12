'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { api, patchJson, postJson } from '@/lib/api';
import type { Driver, State, Trip, Vehicle } from '@/lib/types';

type DbNumber = number | string;
type ApiVehicle = Omit<Vehicle, 'maximumLoadKg' | 'odometerKm' | 'acquisitionCost'> & {
  maximumLoadKg: DbNumber;
  odometerKm: DbNumber;
  acquisitionCost: DbNumber;
};
type ApiDriver = Omit<Driver, 'safetyScore' | 'tripCompletionRate'> & {
  safetyScore: DbNumber;
  tripCompletionRate: DbNumber;
};
type ApiTrip = Omit<
  Trip,
  'cargoWeightKg' | 'plannedDistanceKm' | 'revenue' | 'finalOdometerKm' | 'fuelConsumedLiters'
> & {
  cargoWeightKg: DbNumber;
  plannedDistanceKm: DbNumber;
  revenue?: DbNumber;
  finalOdometerKm?: DbNumber;
  fuelConsumedLiters?: DbNumber;
};
type ApiMaintenance = State['maintenance'][number] & { cost: DbNumber };
type ApiFuel = State['fuel'][number] & { liters: DbNumber; cost: DbNumber };
type ApiExpense = State['expenses'][number] & { amount: DbNumber };
const number = (value: DbNumber | undefined) => (value === undefined ? undefined : Number(value));

async function optionalList<T>(path: string): Promise<T[]> {
  try {
    return await api<T[]>(path);
  } catch {
    return [];
  }
}

async function loadState(): Promise<State> {
  const [vehicles, drivers, trips, maintenance, fuel, expenses] = await Promise.all([
    optionalList<ApiVehicle>('/api/v1/vehicles?pageSize=100'),
    optionalList<ApiDriver>('/api/v1/drivers?pageSize=100'),
    optionalList<ApiTrip>('/api/v1/trips?pageSize=100'),
    optionalList<ApiMaintenance>('/api/v1/maintenance'),
    optionalList<ApiFuel>('/api/v1/fuel-logs'),
    optionalList<ApiExpense>('/api/v1/expenses'),
  ]);
  return {
    vehicles: vehicles.map((vehicle) => ({
      ...vehicle,
      maximumLoadKg: Number(vehicle.maximumLoadKg),
      odometerKm: Number(vehicle.odometerKm),
      acquisitionCost: Number(vehicle.acquisitionCost),
    })),
    drivers: drivers.map((driver) => ({
      ...driver,
      safetyScore: Number(driver.safetyScore),
      tripCompletionRate: Number(driver.tripCompletionRate),
    })),
    trips: trips.map((trip) => ({
      ...trip,
      cargoWeightKg: Number(trip.cargoWeightKg),
      plannedDistanceKm: Number(trip.plannedDistanceKm),
      revenue: number(trip.revenue),
      finalOdometerKm: number(trip.finalOdometerKm),
      fuelConsumedLiters: number(trip.fuelConsumedLiters),
    })),
    maintenance: maintenance.map((record) => ({ ...record, cost: Number(record.cost) })),
    fuel: fuel.map((record) => ({
      ...record,
      liters: Number(record.liters),
      cost: Number(record.cost),
    })),
    expenses: expenses.map((record) => ({ ...record, amount: Number(record.amount) })),
  };
}

async function persistDifference(previous: State, next: State): Promise<void> {
  const addedVehicle = next.vehicles.find(
    (item) => !previous.vehicles.some(({ id }) => id === item.id),
  );
  if (addedVehicle)
    await postJson('/api/v1/vehicles', {
      registrationNumber: addedVehicle.registrationNumber,
      name: addedVehicle.name,
      model: addedVehicle.model,
      type: addedVehicle.type,
      maximumLoadKg: addedVehicle.maximumLoadKg,
      odometerKm: addedVehicle.odometerKm,
      acquisitionCost: addedVehicle.acquisitionCost,
      region: addedVehicle.region,
    });
  for (const vehicle of next.vehicles) {
    const before = previous.vehicles.find(({ id }) => id === vehicle.id);
    if (before && before.status !== 'RETIRED' && vehicle.status === 'RETIRED')
      await postJson(`/api/v1/vehicles/${vehicle.id}/retire`);
  }

  const addedDriver = next.drivers.find(
    (item) => !previous.drivers.some(({ id }) => id === item.id),
  );
  if (addedDriver)
    await postJson('/api/v1/drivers', {
      name: addedDriver.name,
      licenseNumber: addedDriver.licenseNumber,
      licenseCategory: addedDriver.licenseCategory,
      licenseExpiryDate: addedDriver.licenseExpiryDate,
      contactNumber: addedDriver.contactNumber,
      safetyScore: addedDriver.safetyScore,
    });
  for (const driver of next.drivers) {
    const before = previous.drivers.find(({ id }) => id === driver.id);
    if (before && before.status !== 'SUSPENDED' && driver.status === 'SUSPENDED')
      await postJson(`/api/v1/drivers/${driver.id}/suspend`, {
        reason: 'Suspended from driver management',
      });
  }

  const addedTrip = next.trips.find((item) => !previous.trips.some(({ id }) => id === item.id));
  if (addedTrip) {
    const created = await postJson<ApiTrip>('/api/v1/trips', {
      source: addedTrip.source,
      destination: addedTrip.destination,
      vehicleId: addedTrip.vehicleId,
      driverId: addedTrip.driverId,
      cargoWeightKg: addedTrip.cargoWeightKg,
      plannedDistanceKm: addedTrip.plannedDistanceKm,
      notes: addedTrip.notes,
    });
    if (addedTrip.status === 'DISPATCHED') await postJson(`/api/v1/trips/${created.id}/dispatch`);
  }
  for (const trip of next.trips) {
    const before = previous.trips.find(({ id }) => id === trip.id);
    if (!before || before.status === trip.status) continue;
    if (trip.status === 'IN_PROGRESS') await postJson(`/api/v1/trips/${trip.id}/start`);
    if (trip.status === 'COMPLETED')
      await postJson(`/api/v1/trips/${trip.id}/complete`, {
        finalOdometerKm: trip.finalOdometerKm,
        fuelConsumedLiters: trip.fuelConsumedLiters,
      });
    if (trip.status === 'CANCELLED')
      await postJson(`/api/v1/trips/${trip.id}/cancel`, {
        reason: trip.notes ?? 'Cancelled from trip board',
      });
  }

  const addedMaintenance = next.maintenance.find(
    (item) => !previous.maintenance.some(({ id }) => id === item.id),
  );
  if (addedMaintenance)
    await postJson('/api/v1/maintenance', {
      vehicleId: addedMaintenance.vehicleId,
      serviceType: addedMaintenance.serviceType,
      cost: addedMaintenance.cost,
    });
  for (const record of next.maintenance) {
    const before = previous.maintenance.find(({ id }) => id === record.id);
    if (before?.status === 'ACTIVE' && record.status === 'COMPLETED')
      await postJson(`/api/v1/maintenance/${record.id}/close`);
    if (before?.status === 'ACTIVE' && record.status === 'CANCELLED')
      await postJson(`/api/v1/maintenance/${record.id}/cancel`);
  }
}

export function useLiveOperations() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['operations'], queryFn: loadState });
  const current = useRef<State | undefined>(undefined);
  if (query.data) current.current = query.data;
  const set = useCallback(
    (next: State) => {
      const previous = current.current;
      if (!previous) return;
      current.current = next;
      queryClient.setQueryData(['operations'], next);
      void persistDifference(previous, next)
        .then(() => query.refetch())
        .catch((error) => {
          alert(error instanceof Error ? error.message : 'Operation failed.');
          void query.refetch();
        });
    },
    [query, queryClient],
  );
  return {
    state: query.data,
    set,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
