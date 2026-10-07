import { Router, Response } from 'express';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/online', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const onlineUsers = await User.find({ online: true }).select('username _id').lean();
    res.json(onlineUsers);
  } catch (error) {
    logger.error('Failed to fetch online users', { error });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:username', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username online lastSeen _id')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Failed to fetch user', { error });
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
