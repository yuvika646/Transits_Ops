import { Elysia } from 'elysia';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { ok } from '../../shared/response';
import { fuelLogs, maintenanceRecords, trips, vehicles } from '../../db/schema';

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
  })
  .get('/analytics/monthly-revenue', async ({ actor }) => {
    requireRole(actor, ['FLEET_MANAGER', 'FINANCIAL_ANALYST']);
    return ok(
      await db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${trips.completedAt}), 'YYYY-MM')`,
          revenue: sql<number>`coalesce(sum(${trips.revenue}), 0)`,
        })
        .from(trips)
        .where(
          sql`${trips.organizationId} = ${actor.organizationId} and ${trips.status} = 'COMPLETED' and ${trips.completedAt} is not null`,
        )
        .groupBy(sql`date_trunc('month', ${trips.completedAt})`)
        .orderBy(sql`date_trunc('month', ${trips.completedAt})`),
    );
  })
  .get('/analytics/vehicle-costs', async ({ actor }) => {
    requireRole(actor, ['FLEET_MANAGER', 'FINANCIAL_ANALYST']);
    const rows = await db
      .select({
        id: vehicles.id,
        name: vehicles.name,
        fuelCost: sql<number>`coalesce((select sum(f.cost) from fuel_logs f where f.vehicle_id = ${vehicles.id}), 0)`,
        maintenanceCost: sql<number>`coalesce((select sum(m.cost) from maintenance_records m where m.vehicle_id = ${vehicles.id}), 0)`,
        expenseCost: sql<number>`coalesce((select sum(e.amount) from expenses e where e.vehicle_id = ${vehicles.id}), 0)`,
      })
      .from(vehicles)
      .where(eq(vehicles.organizationId, actor.organizationId))
      .orderBy(desc(vehicles.acquisitionCost));
    return ok(
      rows
        .map((row) => ({
          ...row,
          totalCost: Number(row.fuelCost) + Number(row.maintenanceCost) + Number(row.expenseCost),
        }))
        .sort((left, right) => right.totalCost - left.totalCost),
    );
  });
