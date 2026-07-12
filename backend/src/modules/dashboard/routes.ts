import { Elysia } from 'elysia';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { drivers, trips, vehicles } from '../../db/schema';
import { resolveActor } from '../../shared/auth-context';
import { ok } from '../../shared/response';

export const dashboardRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/dashboard/kpis', async ({ actor }) => {
    const [v] = await db
      .select({
        active: sql<number>`count(*) filter(where ${vehicles.status}<>'RETIRED')`,
        available: sql<number>`count(*) filter(where ${vehicles.status}='AVAILABLE')`,
        maintenance: sql<number>`count(*) filter(where ${vehicles.status}='IN_SHOP')`,
        onTrip: sql<number>`count(*) filter(where ${vehicles.status}='ON_TRIP')`,
      })
      .from(vehicles)
      .where(eq(vehicles.organizationId, actor.organizationId));
    const [tr] = await db
      .select({
        active: sql<number>`count(*) filter(where ${trips.status} in ('DISPATCHED','IN_PROGRESS'))`,
        pending: sql<number>`count(*) filter(where ${trips.status}='DRAFT')`,
      })
      .from(trips)
      .where(eq(trips.organizationId, actor.organizationId));
    const [dr] = await db
      .select({
        onDuty: sql<number>`count(*) filter(where ${drivers.status} in ('AVAILABLE','ON_TRIP'))`,
      })
      .from(drivers)
      .where(eq(drivers.organizationId, actor.organizationId));
    const active = Number(v?.active ?? 0),
      onTrip = Number(v?.onTrip ?? 0);
    return ok({
      activeVehicles: active,
      availableVehicles: Number(v?.available ?? 0),
      vehiclesInMaintenance: Number(v?.maintenance ?? 0),
      activeTrips: Number(tr?.active ?? 0),
      pendingTrips: Number(tr?.pending ?? 0),
      driversOnDuty: Number(dr?.onDuty ?? 0),
      fleetUtilization: active ? (onTrip / active) * 100 : 0,
    });
  });
