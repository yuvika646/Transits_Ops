import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { drivers, tripEvents, trips, vehicles } from '../../db/schema';
import { conflict, notFound } from '../../shared/errors';
const active = ['DISPATCHED', 'IN_PROGRESS'] as const;
export async function dispatchTrip(orgId: string, tripId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [trip] = await tx
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.organizationId, orgId)))
      .for('update');
    if (!trip) throw notFound('Trip');
    if (trip.status !== 'DRAFT')
      throw conflict('TRIP_INVALID_TRANSITION', 'Only a draft trip can be dispatched.');
    if (!trip.vehicleId || !trip.driverId)
      throw conflict('TRIP_ASSIGNMENT_REQUIRED', 'Vehicle and driver are required.');
    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, trip.vehicleId), eq(vehicles.organizationId, orgId)))
      .for('update');
    const [driver] = await tx
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, trip.driverId), eq(drivers.organizationId, orgId)))
      .for('update');
    if (!vehicle || !driver) throw notFound('Assigned resource');
    if (vehicle.status !== 'AVAILABLE')
      throw conflict('VEHICLE_NOT_AVAILABLE', 'The selected vehicle is not available.');
    if (driver.status !== 'AVAILABLE')
      throw conflict('DRIVER_NOT_ELIGIBLE', 'The selected driver is not available.');
    if (new Date(`${driver.licenseExpiryDate}T23:59:59Z`) < new Date())
      throw conflict('DRIVER_LICENSE_EXPIRED', 'The selected driver license has expired.');
    if (Number(trip.cargoWeightKg) > Number(vehicle.maximumLoadKg))
      throw conflict(
        'TRIP_CAPACITY_EXCEEDED',
        `Cargo exceeds vehicle capacity of ${vehicle.maximumLoadKg} kg.`,
      );
    const [busy] = await tx
      .select({ id: trips.id })
      .from(trips)
      .where(
        and(
          eq(trips.organizationId, orgId),
          inArray(trips.status, [...active]),
          sql`(${trips.vehicleId}=${vehicle.id} or ${trips.driverId}=${driver.id})`,
        ),
      )
      .limit(1);
    if (busy)
      throw conflict('RESOURCE_ALREADY_ASSIGNED', 'Vehicle or driver already has an active trip.');
    const now = new Date();
    await tx
      .update(trips)
      .set({
        status: 'DISPATCHED',
        dispatchedAt: now,
        updatedAt: now,
        version: sql`${trips.version}+1`,
      })
      .where(and(eq(trips.id, trip.id), eq(trips.version, trip.version)));
    await tx
      .update(vehicles)
      .set({ status: 'ON_TRIP', version: sql`${vehicles.version}+1`, updatedAt: now })
      .where(eq(vehicles.id, vehicle.id));
    await tx
      .update(drivers)
      .set({ status: 'ON_TRIP', version: sql`${drivers.version}+1`, updatedAt: now })
      .where(eq(drivers.id, driver.id));
    await tx.insert(tripEvents).values({
      tripId: trip.id,
      eventType: 'DISPATCH',
      fromStatus: 'DRAFT',
      toStatus: 'DISPATCHED',
      performedBy: actorId,
    });
    return { ...trip, status: 'DISPATCHED' as const, dispatchedAt: now };
  });
}
export async function startTrip(orgId: string, tripId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [trip] = await tx
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.organizationId, orgId)))
      .for('update');
    if (!trip) throw notFound('Trip');
    if (trip.status !== 'DISPATCHED')
      throw conflict('TRIP_INVALID_TRANSITION', 'Only a dispatched trip can be started.');
    const now = new Date();
    await tx
      .update(trips)
      .set({ status: 'IN_PROGRESS', startedAt: now, updatedAt: now })
      .where(eq(trips.id, trip.id));
    await tx.insert(tripEvents).values({
      tripId: trip.id,
      eventType: 'START',
      fromStatus: 'DISPATCHED',
      toStatus: 'IN_PROGRESS',
      performedBy: actorId,
    });
    return { ...trip, status: 'IN_PROGRESS' as const, startedAt: now };
  });
}
export async function completeTrip(
  orgId: string,
  tripId: string,
  actorId: string,
  input: { finalOdometerKm: number; fuelConsumedLiters: number },
) {
  return db.transaction(async (tx) => {
    const [trip] = await tx
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.organizationId, orgId)))
      .for('update');
    if (!trip) throw notFound('Trip');
    if (!['DISPATCHED', 'IN_PROGRESS'].includes(trip.status))
      throw conflict(
        'TRIP_INVALID_TRANSITION',
        'Trip cannot be completed from its current status.',
      );
    if (!trip.vehicleId || !trip.driverId)
      throw conflict('TRIP_ASSIGNMENT_REQUIRED', 'Trip assignment is missing.');
    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, trip.vehicleId))
      .for('update');
    if (!vehicle) throw notFound('Vehicle');
    if (input.finalOdometerKm < Number(vehicle.odometerKm))
      throw conflict('INVALID_ODOMETER', 'Final odometer cannot be lower than current odometer.');
    const now = new Date();
    await tx
      .update(trips)
      .set({
        status: 'COMPLETED',
        finalOdometerKm: String(input.finalOdometerKm),
        fuelConsumedLiters: String(input.fuelConsumedLiters),
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(trips.id, trip.id));
    await tx
      .update(vehicles)
      .set({ status: 'AVAILABLE', odometerKm: String(input.finalOdometerKm), updatedAt: now })
      .where(eq(vehicles.id, trip.vehicleId));
    await tx
      .update(drivers)
      .set({ status: 'AVAILABLE', updatedAt: now })
      .where(eq(drivers.id, trip.driverId));
    await tx.insert(tripEvents).values({
      tripId: trip.id,
      eventType: 'COMPLETE',
      fromStatus: trip.status,
      toStatus: 'COMPLETED',
      performedBy: actorId,
      metadata: input,
    });
    return { ...trip, status: 'COMPLETED' as const, completedAt: now };
  });
}
export async function cancelTrip(orgId: string, tripId: string, actorId: string, reason: string) {
  return db.transaction(async (tx) => {
    const [trip] = await tx
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.organizationId, orgId)))
      .for('update');
    if (!trip) throw notFound('Trip');
    if (['COMPLETED', 'CANCELLED'].includes(trip.status))
      throw conflict('TRIP_INVALID_TRANSITION', 'Terminal trips cannot be cancelled.');
    const from = trip.status;
    const now = new Date();
    await tx
      .update(trips)
      .set({ status: 'CANCELLED', cancelledAt: now, cancellationReason: reason, updatedAt: now })
      .where(eq(trips.id, trip.id));
    if (from !== 'DRAFT' && trip.vehicleId) {
      await tx
        .update(vehicles)
        .set({
          status: sql`case when ${vehicles.status}='RETIRED' then 'RETIRED'::vehicle_status else 'AVAILABLE'::vehicle_status end`,
          updatedAt: now,
        })
        .where(eq(vehicles.id, trip.vehicleId));
    }
    if (from !== 'DRAFT' && trip.driverId)
      await tx
        .update(drivers)
        .set({ status: 'AVAILABLE', updatedAt: now })
        .where(eq(drivers.id, trip.driverId));
    await tx.insert(tripEvents).values({
      tripId: trip.id,
      eventType: 'CANCEL',
      fromStatus: from,
      toStatus: 'CANCELLED',
      performedBy: actorId,
      metadata: { reason },
    });
    return { ...trip, status: 'CANCELLED' as const };
  });
}
