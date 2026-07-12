import { Elysia, t } from 'elysia';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok, pageMeta } from '../../shared/response';
import { notFound } from '../../shared/errors';
import { vehicles } from '../../db/schema';
const pagination = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
});
const privileged = ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];

export const vehicleRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get(
    '/vehicles',
    async ({ actor, query }) => {
      requireRole(actor, privileged);
      const page = Number(query.page ?? 1),
        pageSize = Number(query.pageSize ?? 25);
      const where = eq(vehicles.organizationId, actor.organizationId);
      const rows = await db
        .select()
        .from(vehicles)
        .where(where)
        .orderBy(asc(vehicles.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(vehicles)
        .where(where);
      return ok(rows, pageMeta(page, pageSize, Number(countRows[0]?.count ?? 0)));
    },
    { query: pagination },
  )
  .get('/vehicles/available', async ({ actor }) =>
    ok(
      await db
        .select()
        .from(vehicles)
        .where(
          and(eq(vehicles.organizationId, actor.organizationId), eq(vehicles.status, 'AVAILABLE')),
        ),
    ),
  )
  .post(
    '/vehicles',
    async ({ actor, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const [row] = await db
        .insert(vehicles)
        .values({
          ...body,
          organizationId: actor.organizationId,
          maximumLoadKg: String(body.maximumLoadKg),
          odometerKm: String(body.odometerKm),
          acquisitionCost: String(body.acquisitionCost),
        })
        .returning();
      return ok(row);
    },
    {
      body: t.Object({
        registrationNumber: t.String({ minLength: 1 }),
        name: t.String({ minLength: 1 }),
        model: t.Optional(t.String()),
        type: t.Union([t.Literal('VAN'), t.Literal('TRUCK'), t.Literal('MINI'), t.Literal('BUS')]),
        maximumLoadKg: t.Number({ minimum: 0 }),
        odometerKm: t.Number({ minimum: 0 }),
        acquisitionCost: t.Number({ minimum: 0 }),
        region: t.String({ minLength: 1 }),
      }),
    },
  )
  .get(
    '/vehicles/:id',
    async ({ actor, params }) => {
      const [row] = await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, params.id), eq(vehicles.organizationId, actor.organizationId)));
      if (!row) throw notFound('Vehicle');
      return ok(row);
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .post(
    '/vehicles/:id/retire',
    async ({ actor, params }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const [row] = await db
        .update(vehicles)
        .set({ status: 'RETIRED', retiredAt: new Date(), updatedAt: new Date() })
        .where(and(eq(vehicles.id, params.id), eq(vehicles.organizationId, actor.organizationId)))
        .returning();
      if (!row) throw notFound('Vehicle');
      return ok(row);
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .patch(
    '/vehicles/:id',
    async ({ actor, params, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const [vehicle] = await db
        .update(vehicles)
        .set({
          ...body,
          maximumLoadKg: body.maximumLoadKg === undefined ? undefined : String(body.maximumLoadKg),
          odometerKm: body.odometerKm === undefined ? undefined : String(body.odometerKm),
          acquisitionCost:
            body.acquisitionCost === undefined ? undefined : String(body.acquisitionCost),
          updatedAt: new Date(),
        })
        .where(and(eq(vehicles.id, params.id), eq(vehicles.organizationId, actor.organizationId)))
        .returning();
      if (!vehicle) throw notFound('Vehicle');
      return ok(vehicle);
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Partial(
        t.Object({
          registrationNumber: t.String({ minLength: 1 }),
          name: t.String({ minLength: 1 }),
          model: t.String(),
          type: t.Union([
            t.Literal('VAN'),
            t.Literal('TRUCK'),
            t.Literal('MINI'),
            t.Literal('BUS'),
          ]),
          maximumLoadKg: t.Number({ minimum: 0 }),
          odometerKm: t.Number({ minimum: 0 }),
          acquisitionCost: t.Number({ minimum: 0 }),
          region: t.String({ minLength: 1 }),
        }),
      ),
    },
  );
