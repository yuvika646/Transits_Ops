import { db } from '../db/client';
import { roles, userRoles, users, drivers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../auth';
import { AppError } from './errors';
export type Actor = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  roles: string[];
  driverId: string | null;
};
export async function resolveActor(headers: Headers): Promise<Actor> {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new AppError('UNAUTHENTICATED', 'Authentication is required.', 401);
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user || !user.active || !user.organizationId)
    throw new AppError('UNAUTHENTICATED', 'Account is unavailable.', 401);
  const assigned = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, user.id));
  const [driver] = await db
    .select({ id: drivers.id })
    .from(drivers)
    .where(eq(drivers.linkedUserId, user.id))
    .limit(1);
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    name: user.name,
    roles: assigned.map((x) => x.name),
    driverId: driver?.id ?? null,
  };
}
export const requireRole = (actor: Actor, allowed: string[]) => {
  if (!actor.roles.some((r) => allowed.includes(r)))
    throw new AppError('FORBIDDEN', 'You do not have permission to perform this action.', 403);
};
