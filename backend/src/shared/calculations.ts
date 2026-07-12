export const fuelEfficiency = (distanceKm: number, liters: number) =>
  liters > 0 ? distanceKm / liters : null;
export const fleetUtilization = (onTrip: number, active: number) =>
  active > 0 ? (onTrip / active) * 100 : 0;
export const operationalCost = (fuel: number, maintenance: number) => fuel + maintenance;
export const vehicleRoi = (
  revenue: number,
  maintenance: number,
  fuel: number,
  acquisition: number,
) => (acquisition > 0 ? ((revenue - maintenance - fuel) / acquisition) * 100 : null);
export const canCarry = (cargoKg: number, capacityKg: number) =>
  cargoKg >= 0 && cargoKg <= capacityKg;
export const isLicenseValid = (expiry: string, today = new Date()) =>
  new Date(`${expiry}T23:59:59Z`).getTime() >= today.getTime();
