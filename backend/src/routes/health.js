import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

/**
 * Liveness — "is this process alive?"
 *
 * Deliberately checks NO dependencies. If this returned 503 whenever the
 * database blipped, the orchestrator would restart a perfectly healthy
 * container and make the outage worse.
 */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/**
 * Readiness — "can this process actually serve traffic?"
 *
 * Checks the database, because an API that can't reach its DB is useless.
 * This is the endpoint the blue/green deploy polls before switching nginx
 * over, and the one a load balancer uses to decide whether to route traffic.
 * If this lies, deploys ship broken versions with confidence.
 */
router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch (err) {
    req.log.warn({ err }, 'readiness check failed');
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;
