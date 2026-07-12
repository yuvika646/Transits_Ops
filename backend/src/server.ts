import { app } from './app';
import { env } from './config/env';
import { logger } from './shared/logger';
import { pool } from './db/client';
const server = app.listen({ hostname: env.HOST, port: env.PORT });
logger.info({ port: env.PORT }, 'TransitOps API listening');
const shutdown = async () => {
  logger.info('Shutting down');
  server.stop();
  await pool.end();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
