import express, { Response } from 'express';
import { body } from 'express-validator';
import GameSession from '@/models/GameSession';
import { AuthRequest, protect } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validation';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   POST /api/game/session
// @desc    Create a new game session
// @access  Private
router.post(
  '/session',
  [
    body('score').isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
    body('level').isInt({ min: 1 }).withMessage('Level must be at least 1'),
    body('timeSpent').isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer'),
    body('gameType')
      .optional()
      .isIn(['memory', 'logic', 'focus', 'mixed'])
      .withMessage('Invalid game type'),
  ],
  validate([
    body('score').notEmpty().withMessage('Score is required'),
    body('level').notEmpty().withMessage('Level is required'),
    body('timeSpent').notEmpty().withMessage('Time spent is required'),
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { score, level, timeSpent, gameType = 'mixed', completed = true } = req.body;

    const gameSession = await GameSession.create({
      user: req.user!._id,
      score,
      level,
      timeSpent,
      gameType,
      completed,
    });

    res.status(201).json({
      success: true,
      data: {
        gameSession,
      },
    });
  })
);

// @route   GET /api/game/sessions
// @desc    Get user's game sessions
// @access  Private
router.get(
  '/sessions',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const sessions = await GameSession.find({ user: req.user!._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await GameSession.countDocuments({ user: req.user!._id });

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// @route   GET /api/game/stats
// @desc    Get user's game statistics
// @access  Private
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!._id;

    const [
      totalGames,
      totalScore,
      averageScore,
      highestScore,
      totalTimeSpent,
      highestLevel,
    ] = await Promise.all([
      GameSession.countDocuments({ user: userId }),
      GameSession.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, total: { $sum: '$score' } } },
      ]),
      GameSession.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, avg: { $avg: '$score' } } },
      ]),
      GameSession.findOne({ user: userId }).sort({ score: -1 }).select('score'),
      GameSession.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, total: { $sum: '$timeSpent' } } },
      ]),
      GameSession.findOne({ user: userId }).sort({ level: -1 }).select('level'),
    ]);

    res.json({
      success: true,
      data: {
        totalGames,
        totalScore: totalScore[0]?.total || 0,
        averageScore: Math.round(averageScore[0]?.avg || 0),
        highestScore: highestScore?.score || 0,
        totalTimeSpent: totalTimeSpent[0]?.total || 0,
        highestLevel: highestLevel?.level || 0,
      },
    });
  })
);

export default router;

