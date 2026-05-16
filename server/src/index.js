import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { attachUser, errorHandler } from './lib/middleware.js';
import authRoutes from './routes/auth.js';
import characterRoutes from './routes/characters.js';
import campaignRoutes from './routes/campaigns.js';
import approvalRoutes from './routes/approvals.js';
import diceRoutes from './routes/dice.js';
import screenRoutes from './routes/screen.js';
import { createSocketServer } from './sockets/io.js';

const app = express();
const server = http.createServer(app);

const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/dice', diceRoutes);
app.use('/api/screen', screenRoutes);

app.use(errorHandler);

const io = createSocketServer(server, { corsOrigin: CORS_ORIGIN });
app.set('io', io);

const PORT = parseInt(process.env.PORT || '4000', 10);
server.listen(PORT, () => {
  console.log(`[forja-de-herois] server on http://localhost:${PORT}`);
});
