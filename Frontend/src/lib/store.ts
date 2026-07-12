'use client';
import { Driver, Role, State, Trip, Vehicle } from './types';
const key = 'transitops-state';
export const accounts = [
  ['Raven K.', 'raven.k@transitops.in', 'DISPATCHER', 'RK'],
  ['Fleet Manager', 'fleet@transitops.in', 'FLEET_MANAGER', 'FM'],
  ['Alex', 'driver.alex@transitops.in', 'DRIVER', 'AX'],
  ['Safety Officer', 'safety@transitops.in', 'SAFETY_OFFICER', 'SO'],
  ['Financial Analyst', 'finance@transitops.in', 'FINANCIAL_ANALYST', 'FA'],
] as const;
export const seed = (): State => ({
  vehicles: [
    {
      id: 'v1',
      registrationNumber: 'GJ01AB4523',
      name: 'Van-05',
      model: 'Cargo Van',
      type: 'VAN',
      maximumLoadKg: 500,
      odometerKm: 74000,
      acquisitionCost: 630000,
      status: 'AVAILABLE',
      region: 'Ahmedabad',
    },
    {
      id: 'v2',
      registrationNumber: 'GJ01AB9989',
      name: 'Truck-11',
      model: 'Hauler',
      type: 'TRUCK',
      maximumLoadKg: 5000,
      odometerKm: 123000,
      acquisitionCost: 2450000,
      status: 'ON_TRIP',
      region: 'Ahmedabad',
    },
    {
      id: 'v3',
      registrationNumber: 'GJ01AB1120',
      name: 'Mini-03',
      model: 'Mini Carrier',
      type: 'MINI',
      maximumLoadKg: 1000,
      odometerKm: 66000,
      acquisitionCost: 410000,
      status: 'IN_SHOP',
      region: 'Gandhinagar',
    },
    {
      id: 'v4',
      registrationNumber: 'GJ01AB0098',
      name: 'Van-09',
      model: 'Cargo Van',
      type: 'VAN',
      maximumLoadKg: 750,
      odometerKm: 241900,
      acquisitionCost: 590000,
      status: 'RETIRED',
      region: 'Ahmedabad',
    },
  ],
  drivers: [
    {
      id: 'd1',
      linkedUserId: 'driver.alex@transitops.in',
      name: 'Alex',
      licenseNumber: 'DL-898213',
      licenseCategory: 'LMV',
      licenseExpiryDate: '2038-12-01',
      contactNumber: '+91 98••• 4421',
      safetyScore: 96,
      tripCompletionRate: 98,
      status: 'AVAILABLE',
    },
    {
      id: 'd2',
      name: 'John',
      licenseNumber: 'DL-441210',
      licenseCategory: 'HMV',
      licenseExpiryDate: '2024-01-01',
      contactNumber: '+91 97••• 1120',
      safetyScore: 81,
      tripCompletionRate: 82,
      status: 'SUSPENDED',
    },
    {
      id: 'd3',
      name: 'Priya',
      licenseNumber: 'DL-77031',
      licenseCategory: 'LMV',
      licenseExpiryDate: '2030-01-01',
      contactNumber: '+91 99••• 8045',
      safetyScore: 99,
      tripCompletionRate: 99,
      status: 'ON_TRIP',
    },
    {
      id: 'd4',
      name: 'Suresh',
      licenseNumber: 'DL-10045',
      licenseCategory: 'HMV',
      licenseExpiryDate: '2031-01-01',
      contactNumber: '+91 96••• 2234',
      safetyScore: 88,
      tripCompletionRate: 91,
      status: 'OFF_DUTY',
    },
  ],
  trips: [
    {
      id: 't1',
      tripNumber: 'TR001',
      source: 'Gandhinagar Depot',
      destination: 'Ahmedabad Hub',
      vehicleId: 'v1',
      driverId: 'd1',
      cargoWeightKg: 350,
      plannedDistanceKm: 32,
      status: 'DISPATCHED',
      estimatedDurationMinutes: 75,
    },
    {
      id: 't2',
      tripNumber: 'TR002',
      source: 'Vatva Industrial Area',
      destination: 'Sanand Warehouse',
      cargoWeightKg: 400,
      plannedDistanceKm: 48,
      status: 'DRAFT',
      estimatedDurationMinutes: 100,
    },
    {
      id: 't3',
      tripNumber: 'TR003',
      source: 'Mansa',
      destination: 'Kalol Depot',
      cargoWeightKg: 200,
      plannedDistanceKm: 42,
      status: 'CANCELLED',
      estimatedDurationMinutes: 85,
    },
    {
      id: 't4',
      tripNumber: 'TR004',
      source: 'Ahmedabad',
      destination: 'Surat',
      vehicleId: 'v2',
      driverId: 'd3',
      cargoWeightKg: 2500,
      plannedDistanceKm: 265,
      status: 'COMPLETED',
      estimatedDurationMinutes: 350,
      fuelConsumedLiters: 110,
      finalOdometerKm: 123265,
      revenue: 46000,
    },
  ],
  maintenance: [
    {
      id: 'm1',
      vehicleId: 'v1',
      serviceType: 'Oil Change',
      cost: 2500,
      status: 'COMPLETED',
      openedAt: '2026-06-10',
    },
    {
      id: 'm2',
      vehicleId: 'v2',
      serviceType: 'Engine Repair',
      cost: 18000,
      status: 'ACTIVE',
      openedAt: '2026-07-02',
    },
    {
      id: 'm3',
      vehicleId: 'v3',
      serviceType: 'Tyre Replacement',
      cost: 6300,
      status: 'ACTIVE',
      openedAt: '2026-07-08',
    },
  ],
  fuel: [
    { id: 'f1', vehicleId: 'v1', liters: 42, cost: 3150, date: '2026-07-01' },
    { id: 'f2', vehicleId: 'v2', liters: 110, cost: 8400, date: '2026-07-03' },
    { id: 'f3', vehicleId: 'v3', liters: 28, cost: 2050, date: '2026-07-05' },
  ],
  expenses: [
    { id: 'e1', vehicleId: 'v1', category: 'TOLL', amount: 120 },
    { id: 'e2', vehicleId: 'v1', category: 'TOLL', amount: 340 },
    { id: 'e3', vehicleId: 'v1', category: 'MISCELLANEOUS', amount: 150 },
  ],
});
export function load() {
  if (typeof window === 'undefined') return seed();
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || seed();
  } catch {
    return seed();
  }
}
export function save(s: State) {
  localStorage.setItem(key, JSON.stringify(s));
}
export function money(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}
export const allowed: Record<Role, string[]> = {
  FLEET_MANAGER: ['/dashboard', '/fleet', '/drivers', '/maintenance', '/analytics', '/settings'],
  DISPATCHER: ['/dashboard', '/fleet', '/drivers', '/trips'],
  DRIVER: ['/dashboard', '/driver/my-trips'],
  SAFETY_OFFICER: ['/dashboard', '/drivers', '/trips'],
  FINANCIAL_ANALYST: ['/dashboard', '/fleet', '/fuel-expenses', '/analytics'],
};
export function eligibleVehicles(s: State) {
  return s.vehicles.filter((v) => v.status === 'AVAILABLE');
}
export function eligibleDrivers(s: State) {
  return s.drivers.filter(
    (d) => d.status === 'AVAILABLE' && new Date(d.licenseExpiryDate) > new Date(),
  );
}
export function label(x: string) {
  return x.replaceAll('_', ' ');
}
