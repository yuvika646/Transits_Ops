import { Elysia, t } from 'elysia';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok } from '../../shared/response';
import { notFound } from '../../shared/errors';
import { fuelLogs } from '../../db/schema';

export const fuelRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/fuel-logs', async ({ actor }) => {
    requireRole(actor, ['FINANCIAL_ANALYST', 'FLEET_MANAGER']);
    return ok(
      await db
        .select()
        .from(fuelLogs)
        .where(eq(fuelLogs.organizationId, actor.organizationId))
        .orderBy(desc(fuelLogs.date)),
    );
  })
  .post(
    '/fuel-logs',
    async ({ actor, body }) => {
      requireRole(actor, ['FINANCIAL_ANALYST']);
      const [row] = await db
        .insert(fuelLogs)
        .values({
          ...body,
          organizationId: actor.organizationId,
          liters: String(body.liters),
          cost: String(body.cost),
          odometerKm: body.odometerKm === undefined ? undefined : String(body.odometerKm),
          createdBy: actor.id,
        })
        .returning();
      return ok(row);
    },
    {
      body: t.Object({
        vehicleId: t.String({ format: 'uuid' }),
        tripId: t.Optional(t.String({ format: 'uuid' })),
        date: t.String({ format: 'date' }),
        liters: t.Number({ exclusiveMinimum: 0 }),
        cost: t.Number({ exclusiveMinimum: 0 }),
        odometerKm: t.Optional(t.Number({ minimum: 0 })),
      }),
    },
  )
  .patch(
    '/fuel-logs/:id',
    async ({ actor, params, body }) => {
      requireRole(actor, ['FINANCIAL_ANALYST']);
      const [record] = await db
        .update(fuelLogs)
        .set({
          ...body,
          liters: body.liters === undefined ? undefined : String(body.liters),
          cost: body.cost === undefined ? undefined : String(body.cost),
          odometerKm: body.odometerKm === undefined ? undefined : String(body.odometerKm),
          updatedAt: new Date(),
        })
        .where(and(eq(fuelLogs.id, params.id), eq(fuelLogs.organizationId, actor.organizationId)))
        .returning();
      if (!record) throw notFound('Fuel log');
      return ok(record);
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Partial(
        t.Object({
          vehicleId: t.String({ format: 'uuid' }),
          tripId: t.String({ format: 'uuid' }),
          date: t.String({ format: 'date' }),
          liters: t.Number({ exclusiveMinimum: 0 }),
          cost: t.Number({ exclusiveMinimum: 0 }),
          odometerKm: t.Number({ minimum: 0 }),
        }),
      ),
    },
  )
  .delete(
    '/fuel-logs/:id',
    async ({ actor, params }) => {
      requireRole(actor, ['FINANCIAL_ANALYST']);
      const [record] = await db
        .delete(fuelLogs)
        .where(and(eq(fuelLogs.id, params.id), eq(fuelLogs.organizationId, actor.organizationId)))
        .returning();
      if (!record) throw notFound('Fuel log');
      return ok({ id: record.id });
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  );
