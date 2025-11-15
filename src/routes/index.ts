import express from 'express';
import authRoutes from './auth';
import gameRoutes from './game';
import leaderboardRoutes from './leaderboard';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/game', gameRoutes);
router.use('/leaderboard', leaderboardRoutes);

export default router;

