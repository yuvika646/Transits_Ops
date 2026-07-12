export type Role =
  'FLEET_MANAGER' | 'DISPATCHER' | 'DRIVER' | 'SAFETY_OFFICER' | 'FINANCIAL_ANALYST';
export type VehicleStatus = 'AVAILABLE' | 'ON_TRIP' | 'IN_SHOP' | 'RETIRED';
export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'SUSPENDED';
export type TripStatus = 'DRAFT' | 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type Vehicle = {
  id: string;
  registrationNumber: string;
  name: string;
  model: string;
  type: 'VAN' | 'TRUCK' | 'MINI' | 'BUS';
  maximumLoadKg: number;
  odometerKm: number;
  acquisitionCost: number;
  status: VehicleStatus;
  region: string;
};
export type Driver = {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: number;
  tripCompletionRate: number;
  status: DriverStatus;
  linkedUserId?: string;
};
export type Trip = {
  id: string;
  tripNumber: string;
  source: string;
  destination: string;
  vehicleId?: string;
  driverId?: string;
  cargoWeightKg: number;
  plannedDistanceKm: number;
  status: TripStatus;
  estimatedDurationMinutes: number;
  notes?: string;
  finalOdometerKm?: number;
  fuelConsumedLiters?: number;
  revenue?: number;
};
export type State = {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  maintenance: {
    id: string;
    vehicleId: string;
    serviceType: string;
    cost: number;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    openedAt: string;
  }[];
  fuel: { id: string; vehicleId: string; liters: number; cost: number; date: string }[];
  expenses: { id: string; vehicleId: string; category: string; amount: number }[];
};
