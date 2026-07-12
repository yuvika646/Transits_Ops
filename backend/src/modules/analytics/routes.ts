import { Elysia } from 'elysia';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok } from '../../shared/response';
import { fuelLogs, maintenanceRecords, trips } from '../../db/schema';

export const analyticsRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/analytics/summary', async ({ actor }) => {
    requireRole(actor, ['FLEET_MANAGER', 'FINANCIAL_ANALYST']);
    const [fuel] = await db
      .select({
        cost: sql<number>`coalesce(sum(${fuelLogs.cost}),0)`,
        liters: sql<number>`coalesce(sum(${fuelLogs.liters}),0)`,
      })
      .from(fuelLogs)
      .where(eq(fuelLogs.organizationId, actor.organizationId));
    const [maint] = await db
      .select({ cost: sql<number>`coalesce(sum(${maintenanceRecords.cost}),0)` })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.organizationId, actor.organizationId));
    const [trip] = await db
      .select({
        distance: sql<number>`coalesce(sum(${trips.plannedDistanceKm}) filter(where ${trips.status}='COMPLETED'),0)`,
        revenue: sql<number>`coalesce(sum(${trips.revenue}) filter(where ${trips.status}='COMPLETED'),0)`,
      })
      .from(trips)
      .where(eq(trips.organizationId, actor.organizationId));
    const fuelCost = Number(fuel?.cost ?? 0),
      maintenanceCost = Number(maint?.cost ?? 0),
      liters = Number(fuel?.liters ?? 0),
      distance = Number(trip?.distance ?? 0);
    return ok({
      fuelEfficiency: liters ? distance / liters : null,
      fuelCost,
      maintenanceCost,
      operationalCost: fuelCost + maintenanceCost,
      revenue: Number(trip?.revenue ?? 0),
    });
  });
