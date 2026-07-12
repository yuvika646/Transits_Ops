import { Elysia, t } from 'elysia';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor } from '../../shared/auth-context';
import { ok } from '../../shared/response';
import { notFound } from '../../shared/errors';
import { notifications } from '../../db/schema';

export const notificationRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/notifications', async ({ actor }) =>
    ok(
      await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, actor.id))
        .orderBy(desc(notifications.createdAt)),
    ),
  )
  .post(
    '/notifications/:id/read',
    async ({ actor, params }) => {
      const [row] = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, params.id), eq(notifications.userId, actor.id)))
        .returning();
      if (!row) throw notFound('Notification');
      return ok(row);
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  );
