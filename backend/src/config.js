import { z } from 'zod';

/**
 * Every environment variable the app needs, in one place.
 *
 * The point of validating here is fail-fast: if DATABASE_URL is missing, the
 * process must die on startup — while a deploy is still watching health checks
 * and can roll back — rather than throwing on the first request at 3am.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'must be a postgres:// or postgresql:// connection string',
    }),

  // Comma-separated list of allowed browser origins.
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // How long to let in-flight requests finish before forcing exit on SIGTERM.
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Plain console, not the logger — the logger depends on this config.
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  console.error('\nCompare your .env against .env.example.');
  process.exit(1);
}

export const config = Object.freeze(parsed.data);
