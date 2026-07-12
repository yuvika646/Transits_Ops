import { Elysia } from 'elysia';
import { pool } from '../../db/client';
import { resolveActor } from '../../shared/auth-context';
import { ok } from '../../shared/response';

export const healthRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/health/ready', async () => {
    await pool.query('select 1');
    return ok({ status: 'ready', database: 'up' });
  });
