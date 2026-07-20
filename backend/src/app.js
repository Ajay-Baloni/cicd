import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config.js';
import { logger } from './logger.js';
import healthRouter from './routes/health.js';
import notesRouter from './routes/notes.js';

export function createApp() {
  const app = express();

  // Behind nginx (and later an ALB), so trust the proxy's X-Forwarded-* headers
  // — otherwise every client IP in the logs is the proxy's.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  // Attaches req.log with a request id, so one request's logs can be traced
  // across the whole pipeline. Honours an inbound id if a proxy set one.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id'] ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
    }),
  );

  app.use('/', healthRouter);
  app.use('/api/notes', notesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Error handler must be last, and must keep all four parameters — that
  // arity is how Express recognises it as error middleware.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status ?? 500;

    if (status >= 500) {
      req.log.error({ err }, 'unhandled error');
    } else {
      req.log.warn({ err: err.message }, 'request rejected');
    }

    res.status(status).json({
      error: status >= 500 && config.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  });

  return app;
}
