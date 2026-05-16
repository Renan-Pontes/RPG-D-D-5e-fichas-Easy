import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncRoute, requireAuth, loadCampaign, requireDM, requireMember } from '../lib/middleware.js';
import { newSlug, newScreenToken, newInviteCode, slugify } from '../lib/codes.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

// Lista todas as campanhas em que o usuário está envolvido (como DM ou jogador)
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const [owned, memberships] = await Promise.all([
    prisma.campaign.findMany({ where: { dmId: req.user.id } }),
    prisma.membership.findMany({ where: { userId: req.user.id }, include: { campaign: true } }),
  ]);
  const seen = new Set();
  const campaigns = [];
  for (const c of owned) {
    seen.add(c.id);
    campaigns.push({ ...c, state: JSON.parse(c.state), role: 'dm' });
  }
  for (const m of memberships) {
    if (seen.has(m.campaignId)) continue;
    campaigns.push({ ...m.campaign, state: JSON.parse(m.campaign.state), role: m.role });
  }
  res.json({ campaigns });
}));

router.post('/', requireAuth, asyncRoute(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  let slug = slugify(parsed.data.name);
  // garante unicidade
  let attempt = 0;
  while (await prisma.campaign.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${slugify(parsed.data.name)}-${newSlug().slice(0, 4)}`;
    if (attempt > 5) { slug = newSlug(); break; }
  }
  const c = await prisma.campaign.create({
    data: {
      dmId: req.user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      slug,
      screenToken: newScreenToken(),
      inviteCode: newInviteCode(),
    },
  });
  res.json({ campaign: { ...c, state: JSON.parse(c.state), role: 'dm' } });
}));

// Detalhes da campanha (DM ou membro)
router.get('/:id', requireAuth, loadCampaign, requireMember, asyncRoute(async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { campaignId: req.campaign.id },
    include: {
      user: { select: { id: true, displayName: true, email: true } },
      character: true,
    },
  });
  // mestre vê todos os personagens com dados; jogadores veem nomes + estado público
  const members = memberships.map(m => ({
    id: m.id,
    role: m.role,
    user: m.user,
    characterId: m.characterId,
    joinedAt: m.joinedAt,
    character: m.character ? {
      id: m.character.id,
      name: m.character.name,
      // se for DM ou dono, manda data completo; senão só estado público
      ...(req.isDM || m.character.ownerId === req.user.id
        ? { data: JSON.parse(m.character.data) }
        : { summary: publicSummary(JSON.parse(m.character.data)) }),
    } : null,
  }));
  const payload = {
    id: req.campaign.id,
    name: req.campaign.name,
    slug: req.campaign.slug,
    description: req.campaign.description,
    state: JSON.parse(req.campaign.state),
    inviteCode: req.isDM ? req.campaign.inviteCode : undefined,
    screenToken: req.isDM ? req.campaign.screenToken : undefined,
    screenUrl: req.isDM ? `/tv/${req.campaign.screenToken}` : undefined,
    role: req.isDM ? 'dm' : req.membership?.role,
    dmId: req.campaign.dmId,
    members,
    createdAt: req.campaign.createdAt,
  };
  res.json({ campaign: payload });
}));

router.put('/:id', requireAuth, loadCampaign, requireDM, asyncRoute(async (req, res) => {
  const updateSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
    state: z.record(z.any()).optional(),
  });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const data = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.state) data.state = JSON.stringify(parsed.data.state);
  const c = await prisma.campaign.update({ where: { id: req.campaign.id }, data });
  const io = req.app.get('io');
  io?.to(`campaign:${c.id}`).emit('campaign:update', { id: c.id });
  res.json({ campaign: { ...c, state: JSON.parse(c.state) } });
}));

router.delete('/:id', requireAuth, loadCampaign, requireDM, asyncRoute(async (req, res) => {
  await prisma.campaign.delete({ where: { id: req.campaign.id } });
  res.json({ ok: true });
}));

// Entrar via inviteCode
router.post('/join', requireAuth, asyncRoute(async (req, res) => {
  const schema = z.object({ inviteCode: z.string().min(4).max(20), characterId: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const code = parsed.data.inviteCode.toUpperCase();
  const campaign = await prisma.campaign.findUnique({ where: { inviteCode: code } });
  if (!campaign) return res.status(404).json({ error: 'invite_invalid' });

  let characterId = parsed.data.characterId || null;
  if (characterId) {
    const ch = await prisma.character.findUnique({ where: { id: characterId } });
    if (!ch || ch.ownerId !== req.user.id) return res.status(403).json({ error: 'character_forbidden' });
  }
  const m = await prisma.membership.upsert({
    where: { campaignId_userId: { campaignId: campaign.id, userId: req.user.id } },
    update: characterId ? { characterId } : {},
    create: {
      campaignId: campaign.id,
      userId: req.user.id,
      characterId,
      role: campaign.dmId === req.user.id ? 'dm' : 'player',
    },
  });
  const io = req.app.get('io');
  io?.to(`campaign:${campaign.id}`).emit('campaign:member', { id: campaign.id });
  res.json({ membership: m, campaignId: campaign.id, slug: campaign.slug });
}));

router.put('/:id/members/:membershipId', requireAuth, loadCampaign, asyncRoute(async (req, res) => {
  const schema = z.object({ characterId: z.string().nullable().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const m = await prisma.membership.findUnique({ where: { id: req.params.membershipId } });
  if (!m || m.campaignId !== req.campaign.id) return res.status(404).json({ error: 'not_found' });
  // O próprio jogador pode mudar o personagem dele; o DM pode mudar qualquer um.
  if (m.userId !== req.user.id && !req.isDM) return res.status(403).json({ error: 'forbidden' });
  if (parsed.data.characterId) {
    const ch = await prisma.character.findUnique({ where: { id: parsed.data.characterId } });
    if (!ch) return res.status(404).json({ error: 'character_not_found' });
    // Se for o próprio jogador, precisa ser dono. DM pode atribuir personagens só de jogadores
    // (não permite linkar personagem de outro user).
    if (ch.ownerId !== m.userId) return res.status(403).json({ error: 'character_not_owned' });
  }
  const updated = await prisma.membership.update({
    where: { id: m.id },
    data: { characterId: parsed.data.characterId ?? null },
  });
  const io = req.app.get('io');
  io?.to(`campaign:${req.campaign.id}`).emit('campaign:member', { id: req.campaign.id });
  res.json({ membership: updated });
}));

router.delete('/:id/members/:membershipId', requireAuth, loadCampaign, requireDM, asyncRoute(async (req, res) => {
  const m = await prisma.membership.findUnique({ where: { id: req.params.membershipId } });
  if (!m || m.campaignId !== req.campaign.id) return res.status(404).json({ error: 'not_found' });
  if (m.userId === req.campaign.dmId) return res.status(400).json({ error: 'cannot_remove_dm' });
  await prisma.membership.delete({ where: { id: m.id } });
  const io = req.app.get('io');
  io?.to(`campaign:${req.campaign.id}`).emit('campaign:member', { id: req.campaign.id });
  res.json({ ok: true });
}));

// Rotacionar tokens
router.post('/:id/rotate-screen-token', requireAuth, loadCampaign, requireDM, asyncRoute(async (req, res) => {
  const c = await prisma.campaign.update({
    where: { id: req.campaign.id },
    data: { screenToken: newScreenToken() },
  });
  res.json({ screenToken: c.screenToken });
}));

router.post('/:id/rotate-invite-code', requireAuth, loadCampaign, requireDM, asyncRoute(async (req, res) => {
  const c = await prisma.campaign.update({
    where: { id: req.campaign.id },
    data: { inviteCode: newInviteCode() },
  });
  res.json({ inviteCode: c.inviteCode });
}));

function publicSummary(data) {
  return {
    name: data?.name || '',
    race: data?.race || '',
    className: data?.className || '',
    level: data?.level || 1,
    currentHp: data?.currentHp ?? null,
    maxHp: data?.maxHp ?? null,
    tempHp: data?.tempHp ?? 0,
    conditions: data?.conditions || [],
    avatar: data?.avatar || '',
  };
}

export default router;
