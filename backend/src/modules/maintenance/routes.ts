import { Elysia, t } from 'elysia';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok } from '../../shared/response';
import { maintenanceRecords } from '../../db/schema';
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
  );
