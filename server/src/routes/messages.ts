import { Router, Response } from 'express';
import Message from '../models/Message.js';
import logger from '../config/logger.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/room/:roomName', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roomName } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const messages = await Message.find({ room: roomName })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(messages.reverse());
  } catch (error) {
    logger.error('Failed to fetch room messages', { error });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const messages = await Message.find({
      $or: [
        { senderId: req.userId, to: userId },
        { senderId: userId, to: req.userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(messages.reverse());
  } catch (error) {
    logger.error('Failed to fetch direct messages', { error });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
