import { describe, expect, it } from 'vitest';

import { eligibleDrivers, eligibleVehicles } from '../../src/lib/store';
import type { State } from '../../src/lib/types';

const fixture = {
  vehicles: [
    {
      id: 'v1',
      registrationNumber: 'GJ01',
      name: 'Van-05',
      model: 'Van',
      type: 'VAN',
      maximumLoadKg: 500,
      odometerKm: 0,
      acquisitionCost: 0,
      status: 'AVAILABLE',
      region: 'Ahmedabad',
    },
    {
      id: 'v2',
      registrationNumber: 'GJ02',
      name: 'Shop Van',
      model: 'Van',
      type: 'VAN',
      maximumLoadKg: 500,
      odometerKm: 0,
      acquisitionCost: 0,
      status: 'IN_SHOP',
      region: 'Ahmedabad',
    },
  ],
  drivers: [
    {
      id: 'd1',
      name: 'Alex',
      licenseNumber: 'DL1',
      licenseCategory: 'LMV',
      licenseExpiryDate: '2038-12-01',
      contactNumber: '+91',
      safetyScore: 96,
      tripCompletionRate: 98,
      status: 'AVAILABLE',
    },
    {
      id: 'd2',
      name: 'John',
      licenseNumber: 'DL2',
      licenseCategory: 'HMV',
      licenseExpiryDate: '2024-01-01',
      contactNumber: '+91',
      safetyScore: 80,
      tripCompletionRate: 80,
      status: 'SUSPENDED',
    },
  ],
  trips: [],
  maintenance: [],
  fuel: [],
  expenses: [],
} satisfies State;

describe('dispatch eligibility', () => {
  it('only returns available usable vehicles', () =>
    expect(eligibleVehicles(fixture).map((vehicle) => vehicle.name)).toEqual(['Van-05']));

  it('blocks expired, suspended and unavailable drivers', () =>
    expect(eligibleDrivers(fixture).map((driver) => driver.name)).toEqual(['Alex']));
});
