import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import logger from './config/logger.js';
import { registerSocketHandlers } from './socketHandlers/index.js';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import userRoutes from './routes/users.js';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.socketIoCorsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error', { error });
    process.exit(1);
  }
};

// Socket.IO handlers
registerSocketHandlers(io);

// Start server
const start = async () => {
  await connectDB();
  server.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} (${config.nodeEnv})`);
  });
};

start().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

export default app;
