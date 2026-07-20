import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const seedNotes = [
  { title: 'Pipeline stage 1', body: 'Every image is tagged with the git SHA, never :latest.' },
  { title: 'Pipeline stage 2', body: 'Readiness gates the traffic switch. If /ready fails, the deploy aborts.' },
  { title: 'Pipeline stage 3', body: 'Migrations expand first, contract only after the new code is stable.' },
];

async function main() {
  for (const note of seedNotes) {
    // Idempotent: seeding twice must not duplicate rows, because this runs on
    // every fresh environment and sometimes twice by accident.
    const existing = await prisma.note.findFirst({ where: { title: note.title } });
    if (!existing) await prisma.note.create({ data: note });
  }
  const count = await prisma.note.count();
  console.log(`Seed complete. ${count} notes in database.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
