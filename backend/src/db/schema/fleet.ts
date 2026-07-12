import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { timestamps } from './common';
import { driverStatus, vehicleStatus, vehicleType } from './enums';
import { organizations } from './organizations';
import { users } from './auth';

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    registrationNumber: varchar('registration_number', { length: 40 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    model: varchar('model', { length: 120 }),
    type: vehicleType('type').notNull(),
    maximumLoadKg: numeric('maximum_load_kg', { precision: 12, scale: 2 }).notNull(),
    odometerKm: numeric('odometer_km', { precision: 14, scale: 2 }).notNull().default('0'),
    acquisitionCost: numeric('acquisition_cost', { precision: 14, scale: 2 }).notNull(),
    status: vehicleStatus('status').notNull().default('AVAILABLE'),
    region: varchar('region', { length: 100 }).notNull(),
    version: integer('version').notNull().default(1),
    retiredAt: timestamp('retired_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('vehicles_org_registration_ci_uq').on(
      t.organizationId,
      sql`lower(${t.registrationNumber})`,
    ),
    index('vehicles_status_idx').on(t.organizationId, t.status),
    check(
      'vehicle_values_nonnegative',
      sql`${t.maximumLoadKg} >= 0 and ${t.odometerKm} >= 0 and ${t.acquisitionCost} >= 0`,
    ),
  ],
);
export const drivers = pgTable(
  'drivers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    linkedUserId: text('linked_user_id')
      .unique()
      .references(() => users.id),
    name: varchar('name', { length: 160 }).notNull(),
    licenseNumber: varchar('license_number', { length: 60 }).notNull(),
    licenseCategory: varchar('license_category', { length: 30 }).notNull(),
    licenseExpiryDate: date('license_expiry_date').notNull(),
    contactNumber: varchar('contact_number', { length: 30 }).notNull(),
    safetyScore: numeric('safety_score', { precision: 5, scale: 2 }).notNull().default('100'),
    tripCompletionRate: numeric('trip_completion_rate', { precision: 5, scale: 2 })
      .notNull()
      .default('100'),
    status: driverStatus('status').notNull().default('AVAILABLE'),
    suspensionReason: text('suspension_reason'),
    version: integer('version').notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('drivers_org_license_ci_uq').on(t.organizationId, sql`lower(${t.licenseNumber})`),
    index('drivers_status_idx').on(t.organizationId, t.status),
    index('drivers_expiry_idx').on(t.licenseExpiryDate),
    check(
      'driver_scores_range',
      sql`${t.safetyScore} between 0 and 100 and ${t.tripCompletionRate} between 0 and 100`,
    ),
  ],
);
