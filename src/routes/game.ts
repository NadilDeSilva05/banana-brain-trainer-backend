import express, { Response } from 'express';
import { body } from 'express-validator';
import GameSession from '@/models/GameSession';
import { AuthRequest, protect } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { validate } from '@/middleware/validation';

const router = express.Router();

// Banana API endpoint
const BANANA_API_URL = 'https://marcconrad.com/uob/banana/api.php';

// Emoji API endpoint
const EMOJI_API_URL = 'https://emojihub.yurace.pro/api/random';

// Banana API response interface
interface BananaApiResponse {
  image?: string;
  question?: string;
  solution?: number | string;
  answer?: number | string;
  result?: number | string;
}

// Emoji API response interface
interface EmojiApiResponse {
  name: string;
  category: string;
  group: string;
  htmlCode: string[];
  unicode: string[];
}

// Helper function to fetch puzzle with retry logic
const fetchPuzzleWithRetry = async (base64: string, maxRetries: number = 3): Promise<{ image: string; solution: number }> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const apiUrl = `${BANANA_API_URL}?out=json&base64=${base64}`;
      
      // Create timeout controller for fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      let fetchResponse: globalThis.Response;
      try {
        fetchResponse = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timeout: Banana API took too long to respond');
        }
        throw fetchError;
      }
      
      if (!fetchResponse.ok) {
        throw new Error(`Banana API returned status ${fetchResponse.status}`);
      }
      
      const data = await fetchResponse.json() as BananaApiResponse;
      
      // Handle different possible response formats from Banana API
      const image = data.image || data.question || '';
      const solutionValue = data.solution || data.answer || data.result;
      
      // More lenient parsing - try to extract number from string if needed
      let solution: number;
      if (typeof solutionValue === 'number') {
        solution = solutionValue;
      } else if (typeof solutionValue === 'string') {
        // Try to extract number from string (e.g., "5", "answer: 5", etc.)
        const numberMatch = solutionValue.match(/\d+/);
        if (numberMatch) {
          solution = parseInt(numberMatch[0], 10);
        } else {
          throw new Error(`Could not parse solution from: ${solutionValue}`);
        }
      } else {
        throw new Error(`Solution value is not a number or string: ${typeof solutionValue}`);
      }
      
      // Validate solution is a valid number
      if (isNaN(solution) || solution < 0 || solution > 1000) {
        throw new Error(`Invalid solution value: ${solution}`);
      }
      
      // Validate image exists (can be empty string for fallback, but log it)
      if (!image) {
        console.warn('Banana API returned empty image, but solution is valid:', solution);
        // Continue anyway - frontend will handle missing image
      }
      
      return { image, solution };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Puzzle fetch attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If all retries failed, throw the last error
  throw new Error(`Failed to fetch puzzle after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
};

// @route   GET /api/game/puzzle
// @desc    Get a new puzzle from Banana API
// @access  Public (can be protected if needed)
router.get(
  '/puzzle',
  asyncHandler(async (req: express.Request, res: Response) => {
    const { base64 = 'yes' } = req.query;
    
    try {
      const { image, solution } = await fetchPuzzleWithRetry(base64 as string);
      
      res.json({
        success: true,
        data: {
          image,
          solution,
        },
      });
    } catch (error) {
      // Log the full error for debugging
      console.error('Puzzle fetch error:', error);
      
      // Return a more user-friendly error
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch puzzle from Banana API',
      });
    }
  })
);

// @route   GET /api/game/emoji
// @desc    Get a random emoji from EmojiHub API
// @access  Public
router.get(
  '/emoji',
  asyncHandler(async (_req: express.Request, res: Response) => {
    try {
      const response = await fetch(EMOJI_API_URL);
      
      if (!response.ok) {
        throw new Error(`Emoji API returned status ${response.status}`);
      }
      
      const data = await response.json() as EmojiApiResponse;
      
      // Extract emoji from htmlCode (first element)
      // htmlCode format: ["&#129420;"] - need to parse HTML entity
      let emoji = '🍌'; // Fallback to banana emoji
      if (data.htmlCode && data.htmlCode.length > 0) {
        const htmlCode = data.htmlCode[0];
        // Parse HTML entity like &#129420; to emoji
        const match = htmlCode.match(/&#(\d+);/);
        if (match) {
          const codePoint = parseInt(match[1], 10);
          try {
            emoji = String.fromCodePoint(codePoint);
          } catch (e) {
            // If codePoint is invalid, use fallback
            emoji = '🍌';
          }
        }
      }
      
      res.json({
        success: true,
        data: {
          emoji,
          name: data.name || 'emoji',
          category: data.category || 'unknown',
          unicode: data.unicode && data.unicode.length > 0 ? data.unicode[0] : '',
        },
      });
    } catch (error) {
      throw new Error(`Error fetching emoji: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  })
);

// All routes below require authentication
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

