import 'reflect-metadata';
import { Router, Request, Response } from 'express';
import { container } from 'tsyringe';
import { ChatService } from './application/services/chat.service';
import { User } from '@platform/security/domain/user';
import { logger } from '@shared/utils/logger';

const chatRouter = Router();
const chatService = container.resolve(ChatService);

// Middleware to simulate a user for now
// In a real app, this would come from an authentication middleware
chatRouter.use((req, res, next) => {
  const user: User = {
    id: 'dev-user',
    username: 'dev-user',
    roles: [{ name: 'admin', permissions: [{ resource: '*', action: '*' }] }],
  };
  (req as any).user = user;
  next();
});

// Main chat endpoint
chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const user = (req as any).user as User;
    const response = await chatService.handleQuery(user, query);
    res.json({ response });
  } catch (error) {
    const err = error as Error;
    logger.error('Error handling chat query:', err.message);
    res.status(500).json({ error: 'An internal error occurred', details: err.message });
  }
});

export { chatRouter }; 