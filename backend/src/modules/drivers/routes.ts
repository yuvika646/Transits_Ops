import { Elysia, t } from 'elysia';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok, pageMeta } from '../../shared/response';
import { notFound } from '../../shared/errors';
import { drivers } from '../../db/schema';
const pagination = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1 })),
  pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
});
const privileged = ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];

export const driverRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get(
    '/drivers',
    async ({ actor, query }) => {
      requireRole(actor, privileged);
      const page = Number(query.page ?? 1),
        pageSize = Number(query.pageSize ?? 25);
      const where = eq(drivers.organizationId, actor.organizationId);
      const rows = await db
        .select()
        .from(drivers)
        .where(where)
        .orderBy(asc(drivers.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(drivers)
        .where(where);
      return ok(rows, pageMeta(page, pageSize, Number(countRows[0]?.count ?? 0)));
    },
    { query: pagination },
  )
  .get('/drivers/eligible', async ({ actor }) =>
    ok(
      await db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.organizationId, actor.organizationId),
            eq(drivers.status, 'AVAILABLE'),
            sql`${drivers.licenseExpiryDate} >= current_date`,
          ),
        ),
    ),
  )
  .get('/drivers/me', async ({ actor }) => {
    if (!actor.driverId) throw notFound('Linked driver profile');
    const [row] = await db.select().from(drivers).where(eq(drivers.id, actor.driverId));
    return ok(row);
  })
  .post(
    '/drivers',
    async ({ actor, body }) => {
      requireRole(actor, ['FLEET_MANAGER', 'SAFETY_OFFICER']);
      const [row] = await db
        .insert(drivers)
        .values({
          ...body,
          organizationId: actor.organizationId,
          safetyScore: String(body.safetyScore ?? 100),
          tripCompletionRate: '100',
        })
        .returning();
      return ok(row);
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        licenseNumber: t.String({ minLength: 1 }),
        licenseCategory: t.String({ minLength: 1 }),
        licenseExpiryDate: t.String({ format: 'date' }),
        contactNumber: t.String({ minLength: 5 }),
        safetyScore: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
      }),
    },
  )
  .post(
    '/drivers/:id/suspend',
    async ({ actor, params, body }) => {
      requireRole(actor, ['SAFETY_OFFICER']);
      const [row] = await db
        .update(drivers)
        .set({ status: 'SUSPENDED', suspensionReason: body.reason, updatedAt: new Date() })
        .where(and(eq(drivers.id, params.id), eq(drivers.organizationId, actor.organizationId)))
        .returning();
      if (!row) throw notFound('Driver');
      return ok(row);
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({ reason: t.String({ minLength: 3 }) }),
    },
  );
