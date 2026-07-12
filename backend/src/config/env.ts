import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:4000'),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_FROM: z.string(),
  REMINDER_CRON: z.string().default('0 8 * * *'),
  MAX_UPLOAD_BYTES: z.coerce.number().default(10_485_760),
  LOG_LEVEL: z.string().default('info'),
  DEFAULT_ORGANIZATION_SLUG: z.string().default('transitops'),
  SEED_ORGANIZATION_CODE: z.string().min(8),
  REGISTRATION_INTERNAL_SECRET: z.string().min(32),
});
export const env = schema.parse(process.env);
