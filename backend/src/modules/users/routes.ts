import { Elysia, t } from 'elysia';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '../../db/client';
import {
  auditEvents,
  drivers,
  organizations,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../../db/schema';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { AppError, notFound } from '../../shared/errors';
import { ok } from '../../shared/response';

const operationalRole = t.Union([
  t.Literal('FLEET_MANAGER'),
  t.Literal('DISPATCHER'),
  t.Literal('DRIVER'),
  t.Literal('SAFETY_OFFICER'),
  t.Literal('FINANCIAL_ANALYST'),
]);

async function getUserRoles(userId: string) {
  const assignments = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return assignments.map((assignment) => assignment.name);
}

async function getPermissions(userId: string) {
  const assignments = await db
    .select({ resource: permissions.resource, access: rolePermissions.access })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, userId));

  return Object.fromEntries(
    assignments.map((assignment) => [assignment.resource, assignment.access]),
  );
}

async function assignRole(input: {
  organizationId: string;
  userId: string;
  roleName: 'FLEET_MANAGER' | 'DISPATCHER' | 'DRIVER' | 'SAFETY_OFFICER' | 'FINANCIAL_ANALYST';
  driverId?: string;
  actorId: string;
}) {
  return db.transaction(async (transaction) => {
    const [targetUser] = await transaction
      .select()
      .from(users)
      .where(and(eq(users.id, input.userId), eq(users.organizationId, input.organizationId)))
      .for('update');
    if (!targetUser) throw notFound('User');

    const [role] = await transaction.select().from(roles).where(eq(roles.name, input.roleName));
    if (!role) throw notFound('Role');

    await transaction
      .update(drivers)
      .set({ linkedUserId: null })
      .where(eq(drivers.linkedUserId, input.userId));

    if (input.roleName === 'DRIVER') {
      if (!input.driverId) {
        throw new AppError('DRIVER_PROFILE_REQUIRED', 'Select a driver profile.', 422, {
          driverId: 'A Driver account must be linked to a driver profile.',
        });
      }
      const [driver] = await transaction
        .select()
        .from(drivers)
        .where(
          and(eq(drivers.id, input.driverId), eq(drivers.organizationId, input.organizationId)),
        )
        .for('update');
      if (!driver) throw notFound('Driver');
      if (driver.linkedUserId && driver.linkedUserId !== input.userId) {
        throw new AppError('DRIVER_ALREADY_LINKED', 'That driver profile is already linked.', 409);
      }
      await transaction
        .update(drivers)
        .set({ linkedUserId: input.userId, updatedAt: new Date() })
        .where(eq(drivers.id, driver.id));
    }

    await transaction.delete(userRoles).where(eq(userRoles.userId, input.userId));
    await transaction.insert(userRoles).values({ userId: input.userId, roleId: role.id });

    const [updatedUser] = await transaction
      .update(users)
      .set({
        active: true,
        approvalStatus: 'ACTIVE',
        approvedAt: new Date(),
        approvedBy: input.actorId,
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, input.userId))
      .returning();

    await transaction.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorId,
      action: 'USER_ROLE_ASSIGNED',
      resourceType: 'USER',
      resourceId: input.userId,
      beforeData: { approvalStatus: targetUser.approvalStatus },
      afterData: { approvalStatus: 'ACTIVE', role: input.roleName },
    });

    return updatedUser;
  });
}

export const userRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get('/me', async ({ actor }) =>
    ok({
      ...actor,
      approvalStatus: 'ACTIVE' as const,
      permissions: await getPermissions(actor.id),
    }),
  )
  .get(
    '/settings/users',
    async ({ actor, query }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const conditions = [eq(users.organizationId, actor.organizationId)];
      if (query.status) conditions.push(eq(users.approvalStatus, query.status));
      const records = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          active: users.active,
          approvalStatus: users.approvalStatus,
          createdAt: users.createdAt,
          approvedAt: users.approvedAt,
          rejectionReason: users.rejectionReason,
        })
        .from(users)
        .where(and(...conditions))
        .orderBy(asc(users.createdAt));

      return ok(
        await Promise.all(
          records.map(async (record) => ({ ...record, roles: await getUserRoles(record.id) })),
        ),
      );
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal('PENDING'),
            t.Literal('ACTIVE'),
            t.Literal('REJECTED'),
            t.Literal('SUSPENDED'),
          ]),
        ),
      }),
    },
  )
  .get(
    '/settings/users/:id',
    async ({ actor, params }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const [record] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, params.id), eq(users.organizationId, actor.organizationId)));
      if (!record) throw notFound('User');
      return ok({ ...record, roles: await getUserRoles(record.id) });
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    '/settings/users/:id/approve',
    async ({ actor, params, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const user = await assignRole({
        organizationId: actor.organizationId,
        userId: params.id,
        roleName: body.role,
        driverId: body.driverId,
        actorId: actor.id,
      });
      return ok({ ...user, roles: [body.role] });
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ role: operationalRole, driverId: t.Optional(t.String({ format: 'uuid' })) }),
    },
  )
  .post(
    '/settings/users/:id/reject',
    async ({ actor, params, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const [user] = await db
        .update(users)
        .set({
          active: false,
          approvalStatus: 'REJECTED',
          rejectionReason: body.reason,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, params.id), eq(users.organizationId, actor.organizationId)))
        .returning();
      if (!user) throw notFound('User');
      await db.delete(userRoles).where(eq(userRoles.userId, user.id));
      await db.insert(auditEvents).values({
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        action: 'USER_REJECTED',
        resourceType: 'USER',
        resourceId: user.id,
        afterData: { reason: body.reason },
      });
      return ok(user);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ reason: t.String({ minLength: 3 }) }),
    },
  )
  .patch(
    '/settings/users/:id/role',
    async ({ actor, params, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const user = await assignRole({
        organizationId: actor.organizationId,
        userId: params.id,
        roleName: body.role,
        driverId: body.driverId,
        actorId: actor.id,
      });
      return ok({ ...user, roles: [body.role] });
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ role: operationalRole, driverId: t.Optional(t.String({ format: 'uuid' })) }),
    },
  )
  .patch(
    '/settings/users/:id/status',
    async ({ actor, params, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const active = body.status === 'ACTIVE';
      const [user] = await db
        .update(users)
        .set({ active, approvalStatus: body.status, updatedAt: new Date() })
        .where(and(eq(users.id, params.id), eq(users.organizationId, actor.organizationId)))
        .returning();
      if (!user) throw notFound('User');
      return ok(user);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ status: t.Union([t.Literal('ACTIVE'), t.Literal('SUSPENDED')]) }),
    },
  )
  .post('/settings/organization/signup-code/rotate', async ({ actor }) => {
    requireRole(actor, ['FLEET_MANAGER']);
    const code = `TRANSITOPS-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const signupCodeHash = await Bun.password.hash(code);
    await db
      .update(organizations)
      .set({ signupCodeHash, updatedAt: new Date() })
      .where(eq(organizations.id, actor.organizationId));
    await db.insert(auditEvents).values({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      action: 'ORGANIZATION_SIGNUP_CODE_ROTATED',
      resourceType: 'ORGANIZATION',
      resourceId: actor.organizationId,
    });
    return ok({ code });
  })
  .get('/settings/permissions', async ({ actor }) => {
    requireRole(actor, ['FLEET_MANAGER']);
    const matrix = await db
      .select({ role: roles.name, resource: permissions.resource, access: rolePermissions.access })
      .from(rolePermissions)
      .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId));
    return ok(matrix);
  })
  .put(
    '/settings/permissions',
    async ({ actor, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      await db.transaction(async (transaction) => {
        for (const entry of body.entries) {
          const [role] = await transaction.select().from(roles).where(eq(roles.name, entry.role));
          const [permission] = await transaction
            .select()
            .from(permissions)
            .where(eq(permissions.resource, entry.resource));
          if (!role || !permission) throw notFound('Role or permission');
          await transaction
            .insert(rolePermissions)
            .values({ roleId: role.id, permissionId: permission.id, access: entry.access })
            .onConflictDoUpdate({
              target: [rolePermissions.roleId, rolePermissions.permissionId],
              set: { access: entry.access },
            });
        }
      });
      return ok({ updated: body.entries.length });
    },
    {
      body: t.Object({
        entries: t.Array(
          t.Object({
            role: operationalRole,
            resource: t.String({ minLength: 1 }),
            access: t.Union([t.Literal('NONE'), t.Literal('VIEW'), t.Literal('MANAGE')]),
          }),
        ),
      }),
    },
  );
