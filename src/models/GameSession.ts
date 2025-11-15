import mongoose, { Document, Schema } from 'mongoose';

export interface IGameSession extends Document {
  user: mongoose.Types.ObjectId;
  score: number;
  level: number;
  timeSpent: number; // in seconds
  gameType: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GameSessionSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be negative'],
    },
    level: {
      type: Number,
      required: [true, 'Level is required'],
      min: [1, 'Level must be at least 1'],
    },
    timeSpent: {
      type: Number,
      required: [true, 'Time spent is required'],
      min: [0, 'Time spent cannot be negative'],
    },
    gameType: {
      type: String,
      required: [true, 'Game type is required'],
      enum: ['memory', 'logic', 'focus', 'mixed'],
      default: 'mixed',
    },
    completed: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'gamesessions', // Explicit collection name
  }
);

// Index for efficient leaderboard queries
GameSessionSchema.index({ score: -1, createdAt: -1 });
GameSessionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IGameSession>('GameSession', GameSessionSchema);

