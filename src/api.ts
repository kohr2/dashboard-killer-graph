import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { container } from 'tsyringe';
import { ChatService } from './platform/chat/application/services/chat.service';
import { registerAllOntologies } from './register-ontologies';
import { User } from './platform/security/domain/user';
import { Role } from './platform/security/domain/role';
import { Neo4jConnection } from './platform/database/neo4j-connection';
import helmet from 'helmet';
import compression from 'compression';
import { chatRouter } from '@platform/chat/chat.router';

// Initialize services
registerAllOntologies();
const chatService = container.resolve(ChatService);
const neo4jConnection = container.resolve(Neo4jConnection);

// A mock user for the demo
const adminRole: Role = {
    name: 'Admin',
    permissions: [
        { action: 'create', resource: '*' },
        { action: 'read', resource: '*' },
        { action: 'update', resource: '*' },
        { action: 'delete', resource: '*' },
        { action: 'query', resource: '*' },
    ]
};

const demoUser: User = {
    id: 'web-user',
    username: 'WebApp User',
    roles: [adminRole],
};

const app = express();
const port = 3001; // Port for the API backend

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());

const apiRouter = express.Router();

// Mount the chat router
apiRouter.use('/chat', chatRouter);

// Chat endpoint
apiRouter.post('/chat', async (req, res) => {
    console.log(`Received query from UI: "${req.body.query}"`);
    try {
        const { query } = req.body;
        const response = await chatService.handleQuery(demoUser, query);
        console.log(`Sending response to UI: "${response}"`);
        res.json({ response });
    } catch (error) {
        console.error('Error handling chat query:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Example: Health check endpoint
apiRouter.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use('/api', apiRouter);

async function startServer() {
    try {
        await neo4jConnection.connect();
        console.log('✅ Successfully connected to Neo4j.');
        app.listen(port, () => {
            console.log(`🚀 Chat API server listening at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('❌ Failed to start the server:', error);
        process.exit(1);
    }
}

// This allows the app to be imported for testing without starting the server
if (require.main === module) {
    startServer();
}

export { app, apiRouter }; 