import { pgEnum } from 'drizzle-orm/pg-core';

export const roleName = pgEnum('role_name', [
  'FLEET_MANAGER',
  'DISPATCHER',
  'DRIVER',
  'SAFETY_OFFICER',
  'FINANCIAL_ANALYST',
]);
export const accessLevel = pgEnum('access_level', ['NONE', 'VIEW', 'MANAGE']);
export const approvalStatus = pgEnum('approval_status', [
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
]);
export const vehicleType = pgEnum('vehicle_type', ['VAN', 'TRUCK', 'MINI', 'BUS']);
export const vehicleStatus = pgEnum('vehicle_status', [
  'AVAILABLE',
  'ON_TRIP',
  'IN_SHOP',
  'RETIRED',
]);
export const driverStatus = pgEnum('driver_status', [
  'AVAILABLE',
  'ON_TRIP',
  'OFF_DUTY',
  'SUSPENDED',
]);
export const tripStatus = pgEnum('trip_status', [
  'DRAFT',
  'DISPATCHED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export const maintenanceStatus = pgEnum('maintenance_status', ['ACTIVE', 'COMPLETED', 'CANCELLED']);
export const expenseCategory = pgEnum('expense_category', [
  'TOLL',
  'MAINTENANCE',
  'PARKING',
  'PERMIT',
  'MISCELLANEOUS',
]);
export const deliveryStatus = pgEnum('delivery_status', ['PENDING', 'SENT', 'FAILED']);
