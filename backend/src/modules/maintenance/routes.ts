import { Elysia, t } from 'elysia';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok } from '../../shared/response';
import { notFound } from '../../shared/errors';
import { maintenanceRecords, vehicles } from '../../db/schema';
import { closeMaintenance, openMaintenance } from './service';

export const maintenanceRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/maintenance', async ({ actor }) => {
    requireRole(actor, ['FLEET_MANAGER', 'FINANCIAL_ANALYST']);
    return ok(
      await db
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.organizationId, actor.organizationId))
        .orderBy(desc(maintenanceRecords.openedAt)),
    );
  })
  .post(
    '/maintenance',
    async ({ actor, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      return ok(await openMaintenance(actor.organizationId, actor.id, body));
    },
    {
      body: t.Object({
        vehicleId: t.String({ format: 'uuid' }),
        serviceType: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        cost: t.Number({ minimum: 0 }),
      }),
    },
  )
  .post(
    '/maintenance/:id/close',
    async ({ actor, params }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      return ok(await closeMaintenance(actor.organizationId, params.id, actor.id));
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .get(
    '/maintenance/:id',
    async ({ actor, params }) => {
      const [record] = await db
        .select()
        .from(maintenanceRecords)
        .where(
          and(
            eq(maintenanceRecords.id, params.id),
            eq(maintenanceRecords.organizationId, actor.organizationId),
          ),
        );
      if (!record) throw notFound('Maintenance record');
      return ok(record);
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .post(
    '/maintenance/:id/cancel',
    async ({ actor, params }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      return ok(
        await db.transaction(async (transaction) => {
          const [record] = await transaction
            .select()
            .from(maintenanceRecords)
            .where(
              and(
                eq(maintenanceRecords.id, params.id),
                eq(maintenanceRecords.organizationId, actor.organizationId),
              ),
            )
            .for('update');
          if (!record) throw notFound('Maintenance record');
          const [cancelled] = await transaction
            .update(maintenanceRecords)
            .set({
              status: 'CANCELLED',
              closedAt: new Date(),
              closedBy: actor.id,
              updatedAt: new Date(),
            })
            .where(eq(maintenanceRecords.id, record.id))
            .returning();
          await transaction
            .update(vehicles)
            .set({ status: 'AVAILABLE', updatedAt: new Date() })
            .where(
              and(
                eq(vehicles.id, record.vehicleId),
                eq(vehicles.organizationId, actor.organizationId),
                eq(vehicles.status, 'IN_SHOP'),
              ),
            );
          return cancelled;
        }),
      );
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  );
