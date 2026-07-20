import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

const router = Router();

const noteInput = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(10_000).default(''),
});

/** Turn a zod failure into a 400 with useful detail. */
function parseBody(schema, req) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw err;
  }
  return result.data;
}

// Express 5 forwards rejected promises from async handlers to the error
// middleware automatically, so no try/catch wrapper is needed here.
router.get('/', async (_req, res) => {
  const notes = await prisma.note.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(notes);
});

router.get('/:id', async (req, res) => {
  const note = await prisma.note.findUnique({ where: { id: req.params.id } });
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

router.post('/', async (req, res) => {
  const data = parseBody(noteInput, req);
  const note = await prisma.note.create({ data });
  res.status(201).json(note);
});

router.put('/:id', async (req, res) => {
  const data = parseBody(noteInput, req);
  const existing = await prisma.note.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Note not found' });

  const note = await prisma.note.update({ where: { id: req.params.id }, data });
  res.json(note);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.note.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Note not found' });

  await prisma.note.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
