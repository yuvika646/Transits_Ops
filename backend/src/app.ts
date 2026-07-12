import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { auth } from './auth';
import { env } from './config/env';
import { analyticsRoutes } from './modules/analytics/routes';
import { auditRoutes } from './modules/audit/routes';
import { dashboardRoutes } from './modules/dashboard/routes';
import { documentRoutes } from './modules/documents/routes';
import { driverRoutes } from './modules/drivers/routes';
import { expenseRoutes } from './modules/expenses/routes';
import { exportRoutes } from './modules/exports/routes';
import { fuelRoutes } from './modules/fuel/routes';
import { healthRoutes } from './modules/health/routes';
import { maintenanceRoutes } from './modules/maintenance/routes';
import { registrationRoutes } from './modules/registration/routes';
import { notificationRoutes } from './modules/notifications/routes';
import { settingsRoutes } from './modules/settings/routes';
import { tripRoutes } from './modules/trips/routes';
import { userRoutes } from './modules/users/routes';
import { vehicleRoutes } from './modules/vehicles/routes';
import { AppError } from './shared/errors';
export const app = new Elysia()
  .use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      allowedHeaders: ['content-type', 'authorization'],
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  )
  .use(
    openapi({
      path: '/api/v1/docs',
      documentation: {
        info: {
          title: 'TransitOps API',
          version: '1.0.0',
          description: 'Self-hosted transport operations API',
        },
      },
    }),
  )
  .onRequest(({ request, set }) => {
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
    set.headers['x-request-id'] = requestId;
  })
  .onAfterHandle(({ set }) => {
    set.headers['x-content-type-options'] = 'nosniff';
    set.headers['x-frame-options'] = 'DENY';
    set.headers['referrer-policy'] = 'no-referrer';
  })
  .onError(({ error, set, request }) => {
    const requestId = request.headers.get('x-request-id') ?? 'unknown';
    if (error instanceof AppError) {
      set.status = error.status;
      return {
        error: { code: error.code, message: error.message, fields: error.fields, requestId },
      };
    }
    const candidate = error as Error & { code?: string };
    if (candidate.code === '23505') {
      set.status = 409;
      return { error: { code: 'CONFLICT', message: 'A unique value already exists.', requestId } };
    }
    set.status = 500;
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : String(error),
        requestId,
      },
    };
  })
  .get('/api/v1/health/live', () => ({ data: { status: 'live' } }))
  .all('/api/v1/auth/*', ({ request }) => auth.handler(request))
  .use(healthRoutes)
  .use(registrationRoutes)
  .use(userRoutes)
  .use(dashboardRoutes)
  .use(vehicleRoutes)
  .use(driverRoutes)
  .use(tripRoutes)
  .use(maintenanceRoutes)
  .use(fuelRoutes)
  .use(expenseRoutes)
  .use(analyticsRoutes)
  .use(notificationRoutes)
  .use(settingsRoutes)
  .use(auditRoutes)
  .use(documentRoutes)
  .use(exportRoutes);
export type App = typeof app;
