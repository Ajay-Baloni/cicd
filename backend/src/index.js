import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { prisma } from './db.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'server listening');
});

/**
 * Graceful shutdown.
 *
 * This matters more than it looks. During a blue/green switch the old
 * container gets a SIGTERM while requests may still be in flight. Without
 * this handler Node exits immediately and those requests fail — users see
 * errors during what is supposed to be a zero-downtime deploy.
 *
 * So: stop accepting new connections, let in-flight work drain, close the DB
 * pool, then exit. If draining takes too long, force the exit rather than
 * hanging forever and blocking the deploy.
 */
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'shutdown started');

  const force = setTimeout(() => {
    logger.error('graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);
  force.unref();

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'error closing server');
      process.exit(1);
    }
    try {
      await prisma.$disconnect();
      logger.info('shutdown complete');
      process.exit(0);
    } catch (disconnectErr) {
      logger.error({ err: disconnectErr }, 'error disconnecting from database');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A crashed process is better than a silently wedged one — let the container
// restart rather than serve traffic from an unknown state.
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandled rejection');
  process.exit(1);
});
