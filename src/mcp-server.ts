import 'reflect-metadata';
import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { container } from 'tsyringe';
import { ContactService } from '@crm/application/services/contact.service';
import { registerAllOntologies } from './register-ontologies';
import { User } from '@platform/security/domain/user';
import { ADMIN_ROLE } from '@platform/security/domain/role';
import { ContactResponseDto } from '@crm/application/dto/contact.dto';

// Initialize services and container
registerAllOntologies();
const contactService = container.resolve(ContactService);

// A mock user for service calls, as MCP doesn't have an auth context yet.
const mockUser: User = {
  id: 'mcp-server-user',
  username: 'mcp-server',
  roles: [ADMIN_ROLE],
};

// Create a new MCP server
const server = new McpServer({
  name: 'dashboard-killer-graph-server',
  version: '1.0.0',
});

// Define a 'ResourceTemplate' for Contacts.
// The 'list' handler is defined here, as it's part of the template's capability.
const contactResourceTemplate = new ResourceTemplate('contacts://{id}', {
  list: async () => {
    console.log('MCP Server: Received request for all contacts.');
    const contacts = await contactService.searchContacts(mockUser, {});
    return {
      resources: contacts.map((contact: ContactResponseDto) => ({
        name: contact.id,
        uri: `contacts://${contact.id}`,
        title: `${contact.firstName} ${contact.lastName}`,
      })),
    };
  },
});

// The 'get' handler is separate, as it resolves a specific instance of the template.
const getContactHandler = async (uri: URL, { id }: Record<string, any>) => {
  console.log(`MCP Server: Received request for contact with id: ${id}`);
  const contact = await contactService.getContactById(mockUser, id);

  if (!contact) {
    throw new Error(`Contact with ID ${id} not found.`);
  }

  return {
    contents: [{
      uri: uri.href,
      text: JSON.stringify(contact, null, 2)
    }]
  };
};

// Register the resource with its template, metadata, and the 'get' handler.
server.registerResource(
  'contacts',
  contactResourceTemplate,
  {
    title: 'Contacts',
    description: 'Access contact information from the CRM.',
  },
  getContactHandler,
);

// TODO: Add resources for other entities like Deals, Organizations, etc.

// Start the server with a transport
async function startServer() {
  console.log('Starting MCP server...');
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('✅ MCP server is running and connected to stdio transport.');
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

startServer(); 