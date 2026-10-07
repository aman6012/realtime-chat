import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/env.js';
import logger from '../config/logger.js';
import { validateUsername, validateEmail } from '../middleware/validation.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { username, email } = req.body;

    if (!validateUsername(username)) {
      return res.status(400).json({ error: 'Invalid username format (3-20 chars, alphanumeric)' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const user = new User({ username, email, online: true });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    logger.info('User registered', { username });
    res.status(201).json({ token, user: { id: user._id, username, email } });
  } catch (error) {
    logger.error('Registration error', { error });
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    await User.updateOne({ _id: user._id }, { online: true });

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    logger.info('User logged in', { username });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userId) {
      await User.updateOne({ _id: req.userId }, { online: false, lastSeen: new Date() });
      logger.info('User logged out', { userId: req.userId });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', { error });
    res.status(500).json({ error: 'Failed to logout' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Get user error', { error });
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
