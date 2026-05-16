import { Server } from 'socket.io';
import { verifyToken, AUTH_COOKIE_NAME } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    out[k] = decodeURIComponent(rest.join('='));
  }
  return out;
}

export function createSocketServer(httpServer, { corsOrigin } = {}) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin || true, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookieHeader(socket.handshake.headers.cookie);
      const token = cookies[AUTH_COOKIE_NAME];
      const screenToken = socket.handshake.auth?.screenToken;
      if (screenToken) {
        const campaign = await prisma.campaign.findUnique({ where: { screenToken } });
        if (campaign) {
          socket.data.screenCampaignId = campaign.id;
          return next();
        }
      }
      if (token) {
        const payload = verifyToken(token);
        if (payload?.sub) {
          socket.data.userId = payload.sub;
          return next();
        }
      }
      // permite conexão "convidado" para telão público sem token (pode entrar em room de telão via join later)
      next();
    } catch (e) {
      next(e);
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.screenCampaignId) {
      socket.join(`campaign:${socket.data.screenCampaignId}`);
      socket.join(`campaign:${socket.data.screenCampaignId}:screen`);
    }

    socket.on('campaign:subscribe', async (campaignId, ack) => {
      try {
        if (!campaignId) return ack?.({ error: 'missing_campaign' });
        const userId = socket.data.userId;
        if (!userId) return ack?.({ error: 'auth_required' });
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          include: { memberships: { where: { userId } } },
        });
        if (!campaign) return ack?.({ error: 'not_found' });
        const isDM = campaign.dmId === userId;
        const isMember = isDM || campaign.memberships.length > 0;
        if (!isMember) return ack?.({ error: 'forbidden' });
        socket.join(`campaign:${campaignId}`);
        if (isDM) socket.join(`campaign:${campaignId}:dm`);
        ack?.({ ok: true, isDM });
      } catch (e) {
        ack?.({ error: e.message });
      }
    });

    socket.on('campaign:unsubscribe', (campaignId) => {
      if (!campaignId) return;
      socket.leave(`campaign:${campaignId}`);
      socket.leave(`campaign:${campaignId}:dm`);
    });

    // DM transmite mudança de iniciativa/cena/etc. para o telão
    socket.on('campaign:state', async ({ campaignId, patch }, ack) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return ack?.({ error: 'auth_required' });
        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign || campaign.dmId !== userId) return ack?.({ error: 'dm_only' });
        const state = { ...JSON.parse(campaign.state), ...patch };
        await prisma.campaign.update({ where: { id: campaignId }, data: { state: JSON.stringify(state) } });
        io.to(`campaign:${campaignId}`).emit('campaign:state', { state });
        ack?.({ ok: true });
      } catch (e) {
        ack?.({ error: e.message });
      }
    });
  });

  return io;
}
