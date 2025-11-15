# Banana Brain Trainer Backend

A robust Express.js backend API for the Banana Brain Trainer game, built with TypeScript, MongoDB, and best practices.

## Features

- ✅ Express.js with TypeScript
- ✅ MongoDB with Mongoose ODM
- ✅ JWT Authentication
- ✅ Password hashing with bcrypt
- ✅ Input validation with express-validator
- ✅ Error handling middleware
- ✅ Security middleware (Helmet, CORS, Rate Limiting)
- ✅ RESTful API structure
- ✅ Environment variable configuration
- ✅ Request logging with Morgan

## Project Structure

```
banana-brain-trainer-backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # MongoDB connection
│   │   └── env.ts           # Environment variables
│   ├── models/
│   │   ├── User.ts          # User model
│   │   └── GameSession.ts   # Game session model
│   ├── middleware/
│   │   ├── auth.ts          # Authentication middleware
│   │   ├── errorHandler.ts  # Error handling
│   │   └── validation.ts    # Input validation
│   ├── routes/
│   │   ├── auth.ts          # Authentication routes
│   │   ├── game.ts          # Game session routes
│   │   ├── leaderboard.ts   # Leaderboard routes
│   │   └── index.ts         # Route aggregator
│   └── server.ts            # Main server file
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/banana-brain-trainer
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

### 3. MongoDB Setup

Make sure MongoDB is running on your system, or use MongoDB Atlas:

- **Local MongoDB**: `mongodb://localhost:27017/banana-brain-trainer`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/banana-brain-trainer`

### 4. Run the Server

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/me` - Get current user (Protected)

### Game Sessions

- `POST /api/game/session` - Create a new game session (Protected)
  ```json
  {
    "score": 1000,
    "level": 5,
    "timeSpent": 120,
    "gameType": "memory"
  }
  ```

- `GET /api/game/sessions` - Get user's game sessions (Protected)
  - Query params: `page`, `limit`

- `GET /api/game/stats` - Get user's game statistics (Protected)

### Leaderboard

- `GET /api/leaderboard` - Get leaderboard
  - Query params: `limit`, `gameType`

- `GET /api/leaderboard/user/:userId` - Get user's position on leaderboard
  - Query params: `gameType`

## Authentication

Protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Type check without building

## Security Features

- **Helmet**: Sets various HTTP headers for security
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents abuse with request rate limiting
- **Password Hashing**: Uses bcrypt for secure password storage
- **JWT**: Secure token-based authentication
- **Input Validation**: Validates all user inputs

## Best Practices Implemented

- ✅ TypeScript for type safety
- ✅ Environment variables for configuration
- ✅ Error handling middleware
- ✅ Async/await error handling
- ✅ RESTful API design
- ✅ Input validation
- ✅ Security middleware
- ✅ Code organization and separation of concerns
- ✅ Database indexing for performance
- ✅ Graceful error messages

"# banana-brain-trainer-backend" 
