import { config } from 'dotenv';
// Load environment variables first
config();

import 'tsconfig-paths/register';
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { container } from 'tsyringe';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { bootstrap } from './bootstrap';
import { User } from '@platform/security/domain/user';
import { Role } from '@platform/security/domain/role';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import helmet from 'helmet';
import compression from 'compression';
import { createChatRouter } from '@platform/chat/chat.router';
import { logger } from '@shared/utils/logger';

const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());

export function createApp(): express.Express {
  // Initialize services FIRST
  bootstrap();

  const chatService = container.resolve(ChatService);
  const apiRouter = express.Router();

  // Mount the chat router
  apiRouter.use('/chat', createChatRouter(chatService));

  // Example: Health check endpoint
  apiRouter.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  app.use('/api', apiRouter);
  return app;
}

async function startServer() {
  const serverApp = createApp();
  try {
    const neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.connect();
    logger.info('✅ Successfully connected to Neo4j.');
    const port = process.env.PORT || 3001;
    serverApp.listen(port, () => {
      logger.info(`🚀 Chat API server listening at http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
}

// This allows the app to be imported for testing without starting the server
if (require.main === module) {
  startServer();
}

export { app }; 