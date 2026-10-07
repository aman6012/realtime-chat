import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import logger from '../config/logger.js';

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, config.jwtSecret, (err: any, decoded: any) => {
      if (err) {
        logger.warn('Token verification failed', { error: err.message });
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      req.userId = decoded.userId;
      req.username = decoded.username;
      next();
    });
  } catch (error) {
    logger.error('Authentication middleware error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
};
