import 'reflect-metadata';
import 'dotenv/config';
import { container } from 'tsyringe';
import readline from 'readline';
import { ChatService } from '@src/platform/chat/application/services/chat.service';
import { User } from '@platform/security/domain/user';
import { ADMIN_ROLE, ANALYST_ROLE } from '@platform/security/domain/role';
import { registerAllOntologies } from '@src/register-ontologies';
import { Neo4jConnection } from '@src/platform/database/neo4j-connection';
import { ConversationTurn } from '@platform/chat/application/services/query-translator.service';
import { ExtensionRegistry } from '@src/platform/extension-framework/extension-registry';
import { OntologyService } from '@src/platform/ontology/ontology.service';
import { Logger } from '@src/shared/utils/logger';

// --- User Simulation ---
const adminUser: User = { id: 'admin-cli', username: 'CLI Admin', roles: [ADMIN_ROLE] };
const analystUser: User = { id: 'analyst-cli', username: 'CLI Analyst', roles: [ANALYST_ROLE] };

// You can switch between users to test different permission levels
const currentUser: User = adminUser; // Or analystUser

// --- Conversation History ---
const history: ConversationTurn[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('close', async () => {
    console.log('\nExiting chat. Closing connections...');
    const neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.close();
    console.log('✅ Connections closed. Goodbye!');
    process.exit(0);
});

function displayPrompt() {
    console.log(`\nLogged in as: ${currentUser.username} (${currentUser.roles.map(r => r.name).join(', ')})`);
    rl.question('Enter your query (e.g., "show all Contact") > ', async (query) => {
        if (query.toLowerCase() === 'exit') {
            rl.close();
            return;
        }

        try {
            const chatService = container.resolve(ChatService);
            const response = await chatService.handleQuery(currentUser, query);
            console.log("\n--- Chat Response ---");
            console.log(response);
            console.log("---------------------\n");
            
            // For simplicity, we'll let the service manage the history for now.
            // In a real client, you'd manage the state here.

        } catch (error: any) {
            if (error instanceof Error) {
                console.error(`\n[ERROR] ${error.message}\n`);
            } else {
                console.error(`\n[ERROR] An unknown error occurred.\n`);
            }
        }

        displayPrompt();
    });
}

async function start() {
    console.log('🚀 Initializing Chat Test CLI...');
    
    // Initialize Neo4j Connection
    const neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.connect();
    console.log('✅ Neo4j connection established.');

    registerAllOntologies();
    console.log('✅ Services initialized.');
    
    // Quick test to ensure service is available
    try {
        container.resolve(ChatService);
    } catch(e) {
        console.error("Failed to resolve ChatService. Check dependency injection setup.", e);
        process.exit(1);
    }

    displayPrompt();
}

start(); 