import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, requireAuth } from '../lib/middleware.js';

const router = Router();

const charBodySchema = z.object({
  name: z.string().min(1).max(120),
  data: z.record(z.any()), // ficha completa em JSON
});

// Lista personagens do usuário logado
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const list = await prisma.character.findMany({
    where: { ownerId: req.user.id },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({
    characters: list.map(c => ({
      id: c.id,
      name: c.name,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
      data: JSON.parse(c.data),
    })),
  });
}));

router.get('/:id', requireAuth, asyncRoute(async (req, res) => {
  const c = await prisma.character.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: 'not_found' });
  // Permitir leitura se for dono OU mestre de uma campanha em que esse personagem está
  if (c.ownerId !== req.user.id) {
    const member = await prisma.membership.findFirst({
      where: { characterId: c.id, campaign: { dmId: req.user.id } },
    });
    if (!member) return res.status(403).json({ error: 'forbidden' });
  }
  res.json({ character: { ...c, data: JSON.parse(c.data) } });
}));

router.post('/', requireAuth, asyncRoute(async (req, res) => {
  const parsed = charBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', issues: parsed.error.issues });
  const c = await prisma.character.create({
    data: {
      ownerId: req.user.id,
      name: parsed.data.name,
      data: JSON.stringify(parsed.data.data),
    },
  });
  res.json({ character: { ...c, data: JSON.parse(c.data) } });
}));

router.put('/:id', requireAuth, asyncRoute(async (req, res) => {
  const parsed = charBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const existing = await prisma.character.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });
  if (existing.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const c = await prisma.character.update({
    where: { id: req.params.id },
    data: { name: parsed.data.name, data: JSON.stringify(parsed.data.data) },
  });
  // Notifica telão da campanha em que este personagem está
  const memberships = await prisma.membership.findMany({ where: { characterId: c.id } });
  const io = req.app.get('io');
  for (const m of memberships) {
    io?.to(`campaign:${m.campaignId}`).emit('character:update', { id: c.id });
  }
  res.json({ character: { ...c, data: JSON.parse(c.data) } });
}));

router.delete('/:id', requireAuth, asyncRoute(async (req, res) => {
  const existing = await prisma.character.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });
  if (existing.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  await prisma.character.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;
