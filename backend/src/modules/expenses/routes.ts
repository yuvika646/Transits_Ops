import { Elysia, t } from 'elysia';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok } from '../../shared/response';
import { expenses } from '../../db/schema';

export const expenseRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/expenses', async ({ actor }) => {
    requireRole(actor, ['FINANCIAL_ANALYST', 'FLEET_MANAGER']);
    return ok(
      await db
        .select()
        .from(expenses)
        .where(eq(expenses.organizationId, actor.organizationId))
        .orderBy(desc(expenses.date)),
    );
  })
  .post(
    '/expenses',
    async ({ actor, body }) => {
      requireRole(actor, ['FINANCIAL_ANALYST']);
      const [row] = await db
        .insert(expenses)
        .values({
          ...body,
          organizationId: actor.organizationId,
          amount: String(body.amount),
          createdBy: actor.id,
        })
        .returning();
      return ok(row);
    },
    {
      body: t.Object({
        vehicleId: t.String({ format: 'uuid' }),
        tripId: t.Optional(t.String({ format: 'uuid' })),
        category: t.Union([
          t.Literal('TOLL'),
          t.Literal('MAINTENANCE'),
          t.Literal('PARKING'),
          t.Literal('PERMIT'),
          t.Literal('MISCELLANEOUS'),
        ]),
        amount: t.Number({ exclusiveMinimum: 0 }),
        date: t.String({ format: 'date' }),
        description: t.Optional(t.String()),
      }),
    },
  );
