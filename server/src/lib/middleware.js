import { prisma } from './prisma.js';
import { readAuthCookie, verifyToken } from './auth.js';

// Popula req.user se houver token válido. Não bloqueia se não.
export async function attachUser(req, _res, next) {
  const token = readAuthCookie(req);
  if (!token) return next();
  const payload = verifyToken(token);
  if (!payload?.sub) return next();
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (user) req.user = { id: user.id, email: user.email, displayName: user.displayName };
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  next();
}

// Carrega a campanha e verifica que o usuário tem acesso.
// req.params.campaignId | req.params.id | req.params.slug
export async function loadCampaign(req, res, next) {
  const idOrSlug = req.params.campaignId || req.params.id || req.params.slug;
  if (!idOrSlug) return res.status(400).json({ error: 'missing_campaign' });
  const campaign = await prisma.campaign.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { memberships: true },
  });
  if (!campaign) return res.status(404).json({ error: 'campaign_not_found' });
  req.campaign = campaign;
  if (req.user) {
    req.isDM = campaign.dmId === req.user.id;
    req.membership = campaign.memberships.find(m => m.userId === req.user.id);
  }
  next();
}

export function requireDM(req, res, next) {
  if (!req.isDM) return res.status(403).json({ error: 'dm_only' });
  next();
}

export function requireMember(req, res, next) {
  if (!req.isDM && !req.membership) return res.status(403).json({ error: 'not_a_member' });
  next();
}

export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err);
  if (res.headersSent) return;
  if (err?.code === 'P2002') return res.status(409).json({ error: 'conflict', detail: err.meta?.target });
  res.status(err.status || 500).json({ error: err.message || 'internal_error' });
}
