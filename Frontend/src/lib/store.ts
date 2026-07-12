import type { Driver, State } from './types';

export function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}
export function eligibleVehicles(state: State) {
  return state.vehicles.filter((vehicle) => vehicle.status === 'AVAILABLE');
}
export function eligibleDrivers(state: State) {
  return state.drivers.filter(
    (driver) => driver.status === 'AVAILABLE' && new Date(driver.licenseExpiryDate) > new Date(),
  );
}
export function label(value: string) {
  return value.replaceAll('_', ' ');
}
export function isEligibleDriver(driver: Driver, today = new Date()) {
  return driver.status === 'AVAILABLE' && new Date(driver.licenseExpiryDate) > today;
}
