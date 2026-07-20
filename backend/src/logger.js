import pino from 'pino';
import { config } from './config.js';

/**
 * Structured JSON logs in production so CloudWatch can parse and filter them;
 * human-readable output locally.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
    : {}),
});
