import {
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { timestamps } from './common';
import { expenseCategory, maintenanceStatus, tripStatus } from './enums';
import { organizations } from './organizations';
import { users } from './auth';
import { drivers, vehicles } from './fleet';

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    tripNumber: varchar('trip_number', { length: 30 }).notNull(),
    source: varchar('source', { length: 240 }).notNull(),
    destination: varchar('destination', { length: 240 }).notNull(),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id),
    driverId: uuid('driver_id').references(() => drivers.id),
    cargoWeightKg: numeric('cargo_weight_kg', { precision: 12, scale: 2 }).notNull(),
    plannedDistanceKm: numeric('planned_distance_km', { precision: 12, scale: 2 }).notNull(),
    finalOdometerKm: numeric('final_odometer_km', { precision: 14, scale: 2 }),
    fuelConsumedLiters: numeric('fuel_consumed_liters', { precision: 12, scale: 2 }),
    revenue: numeric('revenue', { precision: 14, scale: 2 }).notNull().default('0'),
    estimatedDurationMinutes: integer('estimated_duration_minutes'),
    notes: text('notes'),
    status: tripStatus('status').notNull().default('DRAFT'),
    createdBy: text('created_by').references(() => users.id),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    version: integer('version').notNull().default(1),
    ...timestamps,
  },
  (t) => [
    unique('trips_org_number_uq').on(t.organizationId, t.tripNumber),
    index('trips_status_idx').on(t.organizationId, t.status),
    check('trip_values_nonnegative', sql`${t.cargoWeightKg} >= 0 and ${t.plannedDistanceKm} >= 0`),
  ],
);
export const tripEvents = pgTable('trip_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 60 }).notNull(),
  fromStatus: tripStatus('from_status'),
  toStatus: tripStatus('to_status'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  performedBy: text('performed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const maintenanceRecords = pgTable(
  'maintenance_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    serviceType: varchar('service_type', { length: 120 }).notNull(),
    description: text('description'),
    cost: numeric('cost', { precision: 14, scale: 2 }).notNull(),
    status: maintenanceStatus('status').notNull().default('ACTIVE'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdBy: text('created_by').references(() => users.id),
    closedBy: text('closed_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('one_active_maintenance_per_vehicle')
      .on(t.vehicleId)
      .where(sql`${t.status} = 'ACTIVE'`),
    check('maintenance_cost_nonnegative', sql`${t.cost} >= 0`),
  ],
);
export const fuelLogs = pgTable(
  'fuel_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    tripId: uuid('trip_id').references(() => trips.id),
    date: date('date').notNull(),
    liters: numeric('liters', { precision: 12, scale: 2 }).notNull(),
    cost: numeric('cost', { precision: 14, scale: 2 }).notNull(),
    odometerKm: numeric('odometer_km', { precision: 14, scale: 2 }),
    createdBy: text('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [check('fuel_positive', sql`${t.liters} > 0 and ${t.cost} > 0`)],
);
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    tripId: uuid('trip_id').references(() => trips.id),
    category: expenseCategory('category').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    date: date('date').notNull(),
    description: text('description'),
    createdBy: text('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [check('expense_positive', sql`${t.amount} > 0`)],
);
