import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { requireAdmin } from './middleware/requireAuth';
import prisma from './lib/db';

const app = express();
const PORT = process.env.PORT ?? 3000;

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)

app.use(cors({
  origin: trustedOrigins,
  credentials: true,
}));

if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth/sign-in', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' },
  }));
}

// Auth handler MUST come before express.json() — it handles its own body parsing
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      banned: true,
      banReason: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
