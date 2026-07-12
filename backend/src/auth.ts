import { APIError, createAuthMiddleware } from 'better-auth/api';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';

import { env } from './config/env';
import { db } from './db/client';
import { accounts, sessions, users, verifications } from './db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/v1/auth',
  trustedOrigins: [env.FRONTEND_ORIGIN],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path === '/sign-up/email') {
        const internalSecret = context.headers?.get('x-transitops-registration-secret');
        if (internalSecret !== env.REGISTRATION_INTERNAL_SECRET) {
          throw new APIError('FORBIDDEN', { message: 'Use the TransitOps registration endpoint.' });
        }
      }

      if (context.path === '/sign-in/email') {
        const email = String(context.body?.email ?? '').toLowerCase();
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (user && user.approvalStatus !== 'ACTIVE') {
          const message =
            user.approvalStatus === 'PENDING'
              ? 'ACCOUNT_PENDING'
              : user.approvalStatus === 'REJECTED'
                ? 'ACCOUNT_REJECTED'
                : 'ACCOUNT_SUSPENDED';
          throw new APIError('FORBIDDEN', { message });
        }

        if (user && !user.active) {
          throw new APIError('FORBIDDEN', { message: 'ACCOUNT_INACTIVE' });
        }
      }
    }),
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === 'production',
  },
});
