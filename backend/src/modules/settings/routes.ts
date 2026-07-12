import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok } from '../../shared/response';
import { organizations } from '../../db/schema';

export const settingsRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/settings/organization', async ({ actor }) => {
    const [row] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, actor.organizationId));
    return ok(row);
  })
  .patch(
    '/settings/organization',
    async ({ actor, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const [row] = await db
        .update(organizations)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(organizations.id, actor.organizationId))
        .returning();
      return ok(row);
    },
    {
      body: t.Partial(
        t.Object({
          depotName: t.String(),
          currency: t.String({ minLength: 3, maxLength: 3 }),
          distanceUnit: t.String(),
          weightUnit: t.String(),
          timezone: t.String(),
          licenseReminderDays: t.Number({ minimum: 1, maximum: 365 }),
        }),
      ),
    },
  );
