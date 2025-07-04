import { config } from 'dotenv';
// Load environment variables first
config();

import 'tsconfig-paths/register';
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { bootstrap } from './bootstrap';
import { logger } from '@common/utils/logger';

import { ChatService } from '@platform/chat/application/services/chat.service';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { createChatRouter } from '@platform/chat/chat.router';

import { ReasoningController } from '@platform/reasoning/reasoning.controller';
import { User } from '@platform/security/domain/user';
import { Role } from '@platform/security/domain/role';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';

// We still keep tsyringe for remaining legacy classes (e.g., ReasoningController)
import { container } from 'tsyringe';

const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());

export function createApp(): express.Express {
  // Initialize services FIRST
  bootstrap();

  // Instantiate ChatService directly (no DI container)
  const ontologyService = OntologyService.getInstance();
  const neo4jConnection = new Neo4jConnection();
  const accessControlService = new AccessControlService();
  const queryTranslator = new QueryTranslator(ontologyService);
  const chatService = new ChatService(
    neo4jConnection,
    ontologyService,
    accessControlService,
    queryTranslator,
  );

  // ReasoningController still resolved through the container until refactored
  const reasoningController = container.resolve(ReasoningController);
  const apiRouter = express.Router();

  // Mount the chat router
  apiRouter.use('/chat', createChatRouter(chatService));

  // Reasoning endpoints
  apiRouter.post('/reasoning/execute-all', async (req, res) => {
    try {
      const result = await reasoningController.executeAllReasoning();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: `Error executing reasoning: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  apiRouter.get('/reasoning/algorithms', async (req, res) => {
    try {
      const result = await reasoningController.getReasoningAlgorithms();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: `Error getting algorithms: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  apiRouter.post('/reasoning/execute/:ontology', async (req, res) => {
    try {
      const result = await reasoningController.executeOntologyReasoning(req.params.ontology);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: `Error executing ontology reasoning: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

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
    const neo4jConnection = new Neo4jConnection();
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