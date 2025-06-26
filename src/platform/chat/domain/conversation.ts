import { Message } from './message';

export interface Conversation {
  id: string;
  // The subject of the conversation, can be a Deal, Contact, etc.
  // Format: "ResourceType:ResourceId" e.g., "Deal:deal-123"
  subject: string; 
  participants: string[]; // Array of user IDs
  messages: Message[];
  createdAt: Date;
} 