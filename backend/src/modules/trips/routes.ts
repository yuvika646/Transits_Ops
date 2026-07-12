import { Elysia, t } from 'elysia';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok, pageMeta } from '../../shared/response';
import { notFound } from '../../shared/errors';
import { tripEvents, trips } from '../../db/schema';
import { cancelTrip, completeTrip, dispatchTrip, startTrip } from './service';
const pagination = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
});

export const tripRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get(
    '/trips',
    async ({ actor, query }) => {
      const page = Number(query.page ?? 1),
        pageSize = Number(query.pageSize ?? 25);
      const scope =
        actor.roles.includes('DRIVER') && actor.driverId
          ? and(eq(trips.organizationId, actor.organizationId), eq(trips.driverId, actor.driverId))
          : eq(trips.organizationId, actor.organizationId);
      const rows = await db
        .select()
        .from(trips)
        .where(scope)
        .orderBy(desc(trips.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(trips)
        .where(scope);
      return ok(rows, pageMeta(page, pageSize, Number(countRows[0]?.count ?? 0)));
    },
    { query: pagination },
  )
  .get('/trips/my-assignments', async ({ actor }) => {
    if (!actor.driverId) throw notFound('Linked driver profile');
    return ok(
      await db
        .select()
        .from(trips)
        .where(
          and(eq(trips.organizationId, actor.organizationId), eq(trips.driverId, actor.driverId)),
        )
        .orderBy(desc(trips.createdAt)),
    );
  })
  .post(
    '/trips',
    async ({ actor, body }) => {
      requireRole(actor, ['DISPATCHER']);
      const tripNumber = `TR${Date.now().toString().slice(-8)}`;
      const [row] = await db
        .insert(trips)
        .values({
          ...body,
          tripNumber,
          organizationId: actor.organizationId,
          cargoWeightKg: String(body.cargoWeightKg),
          plannedDistanceKm: String(body.plannedDistanceKm),
          revenue: String(body.revenue ?? 0),
          createdBy: actor.id,
        })
        .returning();
      return ok(row);
    },
    {
      body: t.Object({
        source: t.String({ minLength: 1 }),
        destination: t.String({ minLength: 1 }),
        vehicleId: t.Optional(t.String({ format: 'uuid' })),
        driverId: t.Optional(t.String({ format: 'uuid' })),
        cargoWeightKg: t.Number({ minimum: 0 }),
        plannedDistanceKm: t.Number({ minimum: 0 }),
        revenue: t.Optional(t.Number({ minimum: 0 })),
        notes: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/trips/:id/dispatch',
    async ({ actor, params }) => {
      requireRole(actor, ['DISPATCHER']);
      return ok(await dispatchTrip(actor.organizationId, params.id, actor.id));
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .post(
    '/trips/:id/start',
    async ({ actor, params }) => {
      requireRole(actor, ['DRIVER', 'DISPATCHER']);
      return ok(await startTrip(actor.organizationId, params.id, actor.id));
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .post(
    '/trips/:id/complete',
    async ({ actor, params, body }) => {
      requireRole(actor, ['DRIVER', 'DISPATCHER']);
      return ok(await completeTrip(actor.organizationId, params.id, actor.id, body));
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        finalOdometerKm: t.Number({ minimum: 0 }),
        fuelConsumedLiters: t.Number({ minimum: 0 }),
      }),
    },
  )
  .post(
    '/trips/:id/cancel',
    async ({ actor, params, body }) => {
      requireRole(actor, ['DISPATCHER']);
      return ok(await cancelTrip(actor.organizationId, params.id, actor.id, body.reason));
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({ reason: t.String({ minLength: 3 }) }),
    },
  )
  .get(
    '/trips/:id/events',
    async ({ actor, params }) => {
      const [trip] = await db
        .select()
        .from(trips)
        .where(and(eq(trips.id, params.id), eq(trips.organizationId, actor.organizationId)));
      if (!trip) throw notFound('Trip');
      return ok(
        await db
          .select()
          .from(tripEvents)
          .where(eq(tripEvents.tripId, trip.id))
          .orderBy(asc(tripEvents.createdAt)),
      );
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  );
