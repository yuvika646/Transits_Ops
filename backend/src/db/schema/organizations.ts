import { integer, pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from './common';

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 80 }).notNull().default('transitops'),
    signupCodeHash: text('signup_code_hash').notNull().default(''),
    depotName: varchar('depot_name', { length: 200 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    distanceUnit: varchar('distance_unit', { length: 20 }).notNull().default('KILOMETERS'),
    weightUnit: varchar('weight_unit', { length: 20 }).notNull().default('KILOGRAMS'),
    timezone: varchar('timezone', { length: 80 }).notNull().default('Asia/Kolkata'),
    licenseReminderDays: integer('license_reminder_days').notNull().default(30),
    ...timestamps,
  },
  (table) => [uniqueIndex('organizations_slug_uq').on(table.slug)],
);
