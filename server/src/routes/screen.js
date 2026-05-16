import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncRoute } from '../lib/middleware.js';

const router = Router();

// Rota pública: estado da campanha para o telão (TV).
// Acesso só por screenToken (sem auth).
router.get('/:token', asyncRoute(async (req, res) => {
  const campaign = await prisma.campaign.findUnique({
    where: { screenToken: req.params.token },
    include: {
      memberships: {
        include: {
          user: { select: { id: true, displayName: true } },
          character: true,
        },
      },
      dm: { select: { id: true, displayName: true } },
    },
  });
  if (!campaign) return res.status(404).json({ error: 'not_found' });

  res.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description,
      state: JSON.parse(campaign.state),
      dm: campaign.dm,
      members: campaign.memberships.map(m => ({
        id: m.id,
        role: m.role,
        user: m.user,
        character: m.character ? publicCharacter(JSON.parse(m.character.data), m.character.name, m.character.id) : null,
      })),
    },
  });
}));

function publicCharacter(data, name, id) {
  return {
    id,
    name: name || data.name,
    race: data.race,
    className: data.className,
    subclass: data.subclass,
    level: data.level,
    currentHp: data.currentHp,
    maxHp: data.maxHp,
    tempHp: data.tempHp,
    armorClass: computeAC(data),
    speed: data.speedOverride || 30,
    conditions: data.conditions || [],
    inspiration: !!data.inspiration,
    deathSaves: data.deathSaves || { success: 0, fail: 0 },
    avatar: data.avatar || '',
    initiative: data.initiative ?? null,
    symbol: data.symbol || '',
  };
}

// AC simplificada: o telão é só leitura, não tem todo o SRD ao alcance.
function computeAC(data) {
  // O frontend já guarda computações em alguns casos; se não, faz uma estimativa rasa.
  const dex = data?.abilities?.dex ?? 10;
  const dexMod = Math.floor((dex - 10) / 2);
  return 10 + dexMod + (data.hasShield ? 2 : 0) + (+(data.extraAcBonus || 0));
}

export default router;
