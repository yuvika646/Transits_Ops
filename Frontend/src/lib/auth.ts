import type { Role } from './types';

export const demoAccounts = [
  ['Raven K.', 'raven.k@transitops.in', 'DISPATCHER'],
  ['Fleet Manager', 'fleet@transitops.in', 'FLEET_MANAGER'],
  ['Alex', 'driver.alex@transitops.in', 'DRIVER'],
  ['Safety Officer', 'safety@transitops.in', 'SAFETY_OFFICER'],
  ['Financial Analyst', 'finance@transitops.in', 'FINANCIAL_ANALYST'],
] as const satisfies ReadonlyArray<readonly [string, string, Role]>;

export type PermissionLevel = 'NONE' | 'VIEW' | 'MANAGE';
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  approvalStatus: 'ACTIVE';
  roles: Role[];
  permissions: Record<string, PermissionLevel>;
  driverId: string | null;
};

const routeResources: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/fleet': 'fleet',
  '/drivers': 'drivers',
  '/trips': 'trips',
  '/maintenance': 'maintenance',
  '/fuel-expenses': 'fuel-expenses',
  '/analytics': 'analytics',
  '/settings': 'settings',
  '/driver/my-trips': 'trips',
};

export function allowedPaths(user: CurrentUser): string[] {
  return Object.entries(routeResources)
    .filter(([, resource]) => user.permissions[resource] && user.permissions[resource] !== 'NONE')
    .map(([path]) => path);
}
