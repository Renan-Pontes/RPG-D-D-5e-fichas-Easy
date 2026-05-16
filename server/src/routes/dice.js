import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, requireAuth, loadCampaign, requireDM, requireMember } from '../lib/middleware.js';

const router = Router();

const DIE_SIDES = {
  d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100,
};

function rollFair(diceType) {
  const sides = DIE_SIDES[diceType] || 20;
  // crypto.randomInt: secure unbiased random
  return crypto.randomInt(1, sides + 1);
}

// Listar filas de rigging visíveis ao mestre
router.get('/campaign/:campaignId/rigs', requireAuth, loadCampaign, requireDM, asyncRoute(async (req, res) => {
  const rigs = await prisma.diceRig.findMany({
    where: { campaignId: req.campaign.id },
    orderBy: { updatedAt: 'desc' },
    include: { targetUser: { select: { id: true, displayName: true } } },
  });
  res.json({
    rigs: rigs.map(r => ({ ...r, values: JSON.parse(r.values) })),
  });
}));

// Criar/atualizar fila para um jogador específico
const rigSchema = z.object({
  targetUserId: z.string(),
  diceType: z.enum(['d4','d6','d8','d10','d12','d20','d100','any']).default('d20'),
  values: z.array(z.object({
    value: z.number().int().min(1).max(100),
    label: z.string().max(120).optional(),
    consumed: z.boolean().optional(),
  })).max(50),
});

router.post('/campaign/:campaignId/rigs', requireAuth, loadCampaign, requireDM, asyncRoute(async (req, res) => {
  const parsed = rigSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', issues: parsed.error.issues });
  const rig = await prisma.diceRig.create({
    data: {
      campaignId: req.campaign.id,
      targetUserId: parsed.data.targetUserId,
      diceType: parsed.data.diceType,
      values: JSON.stringify(parsed.data.values),
    },
  });
  res.json({ rig: { ...rig, values: JSON.parse(rig.values) } });
}));

router.put('/rigs/:rigId', requireAuth, asyncRoute(async (req, res) => {
  const rig = await prisma.diceRig.findUnique({
    where: { id: req.params.rigId },
    include: { campaign: true },
  });
  if (!rig) return res.status(404).json({ error: 'not_found' });
  if (rig.campaign.dmId !== req.user.id) return res.status(403).json({ error: 'dm_only' });
  const parsed = rigSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const updated = await prisma.diceRig.update({
    where: { id: rig.id },
    data: {
      diceType: parsed.data.diceType || rig.diceType,
      values: parsed.data.values ? JSON.stringify(parsed.data.values) : rig.values,
    },
  });
  res.json({ rig: { ...updated, values: JSON.parse(updated.values) } });
}));

router.delete('/rigs/:rigId', requireAuth, asyncRoute(async (req, res) => {
  const rig = await prisma.diceRig.findUnique({
    where: { id: req.params.rigId },
    include: { campaign: true },
  });
  if (!rig) return res.status(404).json({ error: 'not_found' });
  if (rig.campaign.dmId !== req.user.id) return res.status(403).json({ error: 'dm_only' });
  await prisma.diceRig.delete({ where: { id: rig.id } });
  res.json({ ok: true });
}));

// Rolar um dado. Se houver fila ativa, consome dela. Senão rola random justo.
// campaignId é opcional: se ausente, é uma rolagem solo (nunca rigged).
const rollSchema = z.object({
  diceType: z.enum(['d4','d6','d8','d10','d12','d20','d100']).default('d20'),
  campaignId: z.string().optional(),
  label: z.string().max(120).optional(),
  count: z.number().int().min(1).max(20).default(1),
});

router.post('/roll', requireAuth, asyncRoute(async (req, res) => {
  const parsed = rollSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const { diceType, campaignId, label, count } = parsed.data;
  const results = [];
  for (let i = 0; i < count; i++) {
    const r = await consumeOrRoll(req.user.id, diceType, campaignId, label);
    results.push(r);
  }
  // Notifica DM se for em campanha
  if (campaignId) {
    const io = req.app.get('io');
    io?.to(`campaign:${campaignId}:dm`).emit('dice:rolled', {
      userId: req.user.id, diceType, results, label,
    });
    io?.to(`campaign:${campaignId}`).emit('dice:public', {
      userId: req.user.id, diceType, total: results.reduce((a, r) => a + r.value, 0), label,
    });
  }
  res.json({ results, total: results.reduce((a, r) => a + r.value, 0) });
}));

async function consumeOrRoll(userId, diceType, campaignId, label) {
  if (campaignId) {
    // Procura fila ativa para esse usuário+tipo (ou any)
    const rigs = await prisma.diceRig.findMany({
      where: {
        campaignId,
        targetUserId: userId,
        OR: [{ diceType }, { diceType: 'any' }],
      },
      orderBy: { createdAt: 'asc' },
    });
    for (const rig of rigs) {
      const values = JSON.parse(rig.values);
      const idx = values.findIndex(v => !v.consumed);
      if (idx >= 0) {
        values[idx].consumed = true;
        values[idx].consumedAt = new Date().toISOString();
        await prisma.diceRig.update({ where: { id: rig.id }, data: { values: JSON.stringify(values) } });
        await prisma.diceLog.create({
          data: { campaignId, userId, diceType, result: values[idx].value, rigged: true, label: label || values[idx].label || null },
        });
        return { value: values[idx].value, rigged: true, source: rig.id };
      }
    }
  }
  const value = rollFair(diceType);
  await prisma.diceLog.create({ data: { campaignId: campaignId || null, userId, diceType, result: value, rigged: false, label: label || null } });
  return { value, rigged: false };
}

// Histórico de rolagens da campanha (DM only)
router.get('/campaign/:campaignId/log', requireAuth, loadCampaign, requireDM, asyncRoute(async (req, res) => {
  const log = await prisma.diceLog.findMany({
    where: { campaignId: req.campaign.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ log });
}));

export default router;
