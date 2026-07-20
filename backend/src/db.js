import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';
import { config } from './config.js';

/**
 * Prisma 7 notes, since both of these differ from older tutorials:
 *
 * 1. The generated client is TypeScript. Node 22.18+/24 strips types at load
 *    time, so plain JS can import the `.ts` file directly — but the extension
 *    is required in the specifier and package.json must be "type": "module".
 *
 * 2. The Rust query engine is gone. Prisma 7 uses a JS driver adapter, so the
 *    connection is owned by `pg` rather than a native binary. That's a real win
 *    for our Docker image later: no engine binaries, no musl/OpenSSL mismatches
 *    on Alpine, and a much smaller final layer.
 */
const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
