import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';

import { auth } from '../../auth';
import { env } from '../../config/env';
import { db } from '../../db/client';
import { organizations, users } from '../../db/schema';
import { AppError } from '../../shared/errors';
import { ok } from '../../shared/response';

const registrationBody = t.Object({
  name: t.String({ minLength: 2, maxLength: 120 }),
  email: t.String({ format: 'email', maxLength: 254 }),
  password: t.String({ minLength: 10, maxLength: 128 }),
  organizationCode: t.String({ minLength: 8, maxLength: 128 }),
});

const genericResult = {
  status: 'PENDING_APPROVAL' as const,
  message: 'Registration received. A Fleet Manager must approve your account.',
};

async function findOrganizationByCode(code: string) {
  const organizationsWithCodes = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, env.DEFAULT_ORGANIZATION_SLUG));

  for (const organization of organizationsWithCodes) {
    if (await Bun.password.verify(code, organization.signupCodeHash)) {
      return organization;
    }
  }

  return null;
}

export const registrationRoutes = new Elysia({ prefix: '/api/v1' }).post(
  '/registration',
  async ({ body, request }) => {
    const organization = await findOrganizationByCode(body.organizationCode.trim());
    if (!organization) {
      throw new AppError('INVALID_ORGANIZATION_CODE', 'The organization code is invalid.', 422, {
        organizationCode: 'Enter a valid organization code.',
      });
    }

    const email = body.email.trim().toLowerCase();
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existingUser) return ok(genericResult);

    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: body.name.trim(),
          email,
          password: body.password,
        },
        headers: new Headers({
          'x-transitops-registration-secret': env.REGISTRATION_INTERNAL_SECRET,
          'user-agent': request.headers.get('user-agent') ?? 'TransitOps registration',
        }),
      });

      await db
        .update(users)
        .set({
          organizationId: organization.id,
          active: false,
          approvalStatus: 'PENDING',
          updatedAt: new Date(),
        })
        .where(eq(users.id, result.user.id));
    } catch {
      return ok(genericResult);
    }

    return ok(genericResult);
  },
  { body: registrationBody },
);
