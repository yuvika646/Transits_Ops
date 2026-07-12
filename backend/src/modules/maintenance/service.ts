import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { maintenanceRecords, vehicles } from '../../db/schema';
import { conflict, notFound } from '../../shared/errors';
export async function openMaintenance(
  orgId: string,
  actorId: string,
  input: { vehicleId: string; serviceType: string; description?: string; cost: number },
) {
  return db.transaction(async (tx) => {
    const [vehicle] = await tx
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, input.vehicleId), eq(vehicles.organizationId, orgId)))
      .for('update');
    if (!vehicle) throw notFound('Vehicle');
    if (['ON_TRIP', 'RETIRED'].includes(vehicle.status))
      throw conflict(
        'VEHICLE_NOT_MAINTAINABLE',
        'On-trip or retired vehicles cannot enter maintenance.',
      );
    const [active] = await tx
      .select()
      .from(maintenanceRecords)
      .where(
        and(eq(maintenanceRecords.vehicleId, vehicle.id), eq(maintenanceRecords.status, 'ACTIVE')),
      )
      .limit(1);
    if (active)
      throw conflict('MAINTENANCE_ALREADY_ACTIVE', 'Vehicle already has active maintenance.');
    const [record] = await tx
      .insert(maintenanceRecords)
      .values({
        organizationId: orgId,
        vehicleId: vehicle.id,
        serviceType: input.serviceType,
        description: input.description,
        cost: String(input.cost),
        createdBy: actorId,
      })
      .returning();
    await tx
      .update(vehicles)
      .set({ status: 'IN_SHOP', version: sql`${vehicles.version}+1`, updatedAt: new Date() })
      .where(eq(vehicles.id, vehicle.id));
    return record;
  });
}
export async function closeMaintenance(orgId: string, id: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(maintenanceRecords)
      .where(and(eq(maintenanceRecords.id, id), eq(maintenanceRecords.organizationId, orgId)))
      .for('update');
    if (!record) throw notFound('Maintenance record');
    if (record.status !== 'ACTIVE')
      throw conflict('MAINTENANCE_INVALID_TRANSITION', 'Only active maintenance can be closed.');
    const now = new Date();
    await tx
      .update(maintenanceRecords)
      .set({ status: 'COMPLETED', closedAt: now, closedBy: actorId, updatedAt: now })
      .where(eq(maintenanceRecords.id, id));
    await tx
      .update(vehicles)
      .set({
        status: sql`case when ${vehicles.status}='RETIRED' then 'RETIRED'::vehicle_status else 'AVAILABLE'::vehicle_status end`,
        updatedAt: now,
      })
      .where(eq(vehicles.id, record.vehicleId));
    return { ...record, status: 'COMPLETED' as const, closedAt: now };
  });
}
