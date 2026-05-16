import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, requireAuth, loadCampaign, requireDM, requireMember } from '../lib/middleware.js';

const router = Router();

const createSchema = z.object({
  characterId: z.string(),
  type: z.enum(['levelup', 'feature', 'item', 'spell', 'other']),
  payload: z.record(z.any()),
  note: z.string().max(2000).optional(),
});

// Lista approvals da campanha. DM vê tudo; jogador vê só os dele.
router.get('/campaign/:campaignId', requireAuth, loadCampaign, requireMember, asyncRoute(async (req, res) => {
  const where = { campaignId: req.campaign.id };
  if (!req.isDM) where.requestedById = req.user.id;
  const approvals = await prisma.approval.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      requestedBy: { select: { id: true, displayName: true } },
      reviewedBy: { select: { id: true, displayName: true } },
      character: { select: { id: true, name: true } },
    },
  });
  res.json({
    approvals: approvals.map(a => ({ ...a, payload: JSON.parse(a.payload) })),
  });
}));

router.post('/campaign/:campaignId', requireAuth, loadCampaign, requireMember, asyncRoute(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', issues: parsed.error.issues });
  const ch = await prisma.character.findUnique({ where: { id: parsed.data.characterId } });
  if (!ch) return res.status(404).json({ error: 'character_not_found' });
  // Só pode pedir aprovação para personagem próprio (ou DM em nome de jogador)
  if (ch.ownerId !== req.user.id && !req.isDM) return res.status(403).json({ error: 'forbidden' });

  const a = await prisma.approval.create({
    data: {
      campaignId: req.campaign.id,
      characterId: ch.id,
      requestedById: req.user.id,
      type: parsed.data.type,
      payload: JSON.stringify(parsed.data.payload),
      note: parsed.data.note || null,
    },
  });
  const io = req.app.get('io');
  io?.to(`campaign:${req.campaign.id}`).emit('approval:new', { id: a.id });
  res.json({ approval: { ...a, payload: JSON.parse(a.payload) } });
}));

router.post('/:approvalId/review', requireAuth, asyncRoute(async (req, res) => {
  const schema = z.object({
    status: z.enum(['approved', 'rejected']),
    note: z.string().max(2000).optional(),
    // Se aprovado e type=levelup, o backend pode aplicar a mudança no personagem
    applyChanges: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const a = await prisma.approval.findUnique({
    where: { id: req.params.approvalId },
    include: { campaign: true, character: true },
  });
  if (!a) return res.status(404).json({ error: 'not_found' });
  if (a.campaign.dmId !== req.user.id) return res.status(403).json({ error: 'dm_only' });

  const updated = await prisma.approval.update({
    where: { id: a.id },
    data: {
      status: parsed.data.status,
      note: parsed.data.note ?? a.note,
      reviewedById: req.user.id,
      reviewedAt: new Date(),
    },
  });

  // Aplicar mudança ao personagem se aprovado.
  if (parsed.data.status === 'approved' && parsed.data.applyChanges !== false) {
    const data = JSON.parse(a.character.data);
    const payload = JSON.parse(a.payload);
    const next = applyApprovalToCharacter(data, a.type, payload);
    if (next) {
      await prisma.character.update({
        where: { id: a.characterId },
        data: { data: JSON.stringify(next) },
      });
      const io = req.app.get('io');
      io?.to(`campaign:${a.campaignId}`).emit('character:update', { id: a.characterId });
    }
  }

  const io = req.app.get('io');
  io?.to(`campaign:${a.campaignId}`).emit('approval:reviewed', { id: a.id, status: updated.status });
  res.json({ approval: { ...updated, payload: JSON.parse(updated.payload) } });
}));

// Aplica uma aprovação ao objeto data da ficha. Cobre os casos comuns; o resto
// fica como anotação que o jogador aplica manualmente.
function applyApprovalToCharacter(data, type, payload) {
  const next = { ...data };
  switch (type) {
    case 'levelup': {
      // payload: { toLevel: number, hpGain?: number, spellsAdded?: string[], featuresAdded?: any[] }
      if (typeof payload.toLevel === 'number') next.level = payload.toLevel;
      if (typeof payload.hpGain === 'number') {
        next.maxHp = (next.maxHp || 0) + payload.hpGain;
        next.currentHp = Math.min((next.currentHp ?? next.maxHp) + payload.hpGain, next.maxHp);
      }
      if (Array.isArray(payload.spellsAdded)) {
        const existing = new Set((next.spells || []).map(s => typeof s === 'string' ? s : s.id));
        const more = payload.spellsAdded.filter(id => !existing.has(id)).map(id => ({ id, prepared: false }));
        next.spells = [...(next.spells || []), ...more];
      }
      if (Array.isArray(payload.featuresAdded)) {
        next.customFeatures = [...(next.customFeatures || []), ...payload.featuresAdded];
      }
      return next;
    }
    case 'feature': {
      next.customFeatures = [...(next.customFeatures || []), payload];
      return next;
    }
    case 'item': {
      next.equipment = [...(next.equipment || []), payload];
      return next;
    }
    case 'spell': {
      const id = payload.id || payload.spellId;
      if (!id) return null;
      const existing = new Set((next.spells || []).map(s => typeof s === 'string' ? s : s.id));
      if (existing.has(id)) return null;
      next.spells = [...(next.spells || []), { id, prepared: !!payload.prepared }];
      return next;
    }
    default:
      return null;
  }
}

export default router;
