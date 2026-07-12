import { Elysia } from 'elysia';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok } from '../../shared/response';
import { auditEvents } from '../../db/schema';

export const auditRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/audit', async ({ actor }) => {
    requireRole(actor, ['FLEET_MANAGER']);
    return ok(
      await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.organizationId, actor.organizationId))
        .orderBy(desc(auditEvents.createdAt))
        .limit(100),
    );
  });
