import express, { Response } from 'express';
import GameSession from '@/models/GameSession';
import User from '@/models/User';
import { asyncHandler } from '@/middleware/errorHandler';

const router = express.Router();

// @route   GET /api/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const gameType = req.query.gameType as string;

    // Build match query
    const matchQuery: any = {};
    if (gameType && ['memory', 'logic', 'focus', 'mixed'].includes(gameType)) {
      matchQuery.gameType = gameType;
    }

    // Aggregate to get top scores per user
    const leaderboard = await GameSession.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$user',
          highestScore: { $max: '$score' },
          totalGames: { $sum: 1 },
          averageScore: { $avg: '$score' },
          lastPlayed: { $max: '$createdAt' },
        },
      },
      { $sort: { highestScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: '$userInfo',
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$userInfo.username',
          highestScore: 1,
          totalGames: 1,
          averageScore: { $round: ['$averageScore', 2] },
          lastPlayed: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        leaderboard,
      },
    });
  })
);

// @route   GET /api/leaderboard/user/:userId
// @desc    Get user's position on leaderboard
// @access  Public
router.get(
  '/user/:userId',
  asyncHandler(async (req, res: Response) => {
    const { userId } = req.params;
    const gameType = req.query.gameType as string;

    // Build match query
    const matchQuery: any = {};
    if (gameType && ['memory', 'logic', 'focus', 'mixed'].includes(gameType)) {
      matchQuery.gameType = gameType;
    }

    // Get user's highest score
    const userHighestScore = await GameSession.findOne({
      user: userId,
      ...matchQuery,
    })
      .sort({ score: -1 })
      .select('score');

    if (!userHighestScore) {
      res.json({
        success: true,
        data: {
          position: null,
          score: 0,
        },
      });
      return;
    }

    // Count users with higher scores
    const position = await GameSession.countDocuments({
      ...matchQuery,
      score: { $gt: userHighestScore.score },
    });

    res.json({
      success: true,
      data: {
        position: position + 1,
        score: userHighestScore.score,
      },
    });
  })
);

export default router;

