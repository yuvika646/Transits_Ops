import {
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { deliveryStatus } from './enums';
import { organizations } from './organizations';
import { users } from './auth';
import { vehicles } from './fleet';

export const vehicleDocuments = pgTable('vehicle_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 80 }).notNull(),
  displayName: varchar('display_name', { length: 240 }).notNull(),
  objectKey: text('object_key').notNull().unique(),
  contentType: varchar('content_type', { length: 120 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  expiresAt: date('expires_at'),
  uploadedBy: text('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 80 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    targetPath: text('target_path'),
    readAt: timestamp('read_at', { withTimezone: true }),
    deduplicationKey: text('deduplication_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('notification_dedup_uq')
      .on(t.userId, t.deduplicationKey)
      .where(sql`${t.deduplicationKey} is not null`),
  ],
);
export const emailDeliveries = pgTable('email_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  recipient: text('recipient').notNull(),
  template: varchar('template', { length: 100 }).notNull(),
  deduplicationKey: text('deduplication_key').notNull().unique(),
  status: deliveryStatus('status').notNull().default('PENDING'),
  providerMessageId: text('provider_message_id'),
  attemptCount: integer('attempt_count').notNull().default(0),
  lastError: text('last_error'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  actorUserId: text('actor_user_id').references(() => users.id),
  action: varchar('action', { length: 120 }).notNull(),
  resourceType: varchar('resource_type', { length: 80 }).notNull(),
  resourceId: text('resource_id'),
  beforeData: jsonb('before_data'),
  afterData: jsonb('after_data'),
  requestId: text('request_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
