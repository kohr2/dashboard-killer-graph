// Application layer exports
// Use cases, services, and DTOs for CRM Core with O-CREAM-v2 integration

// DTOs
export * from './dto/contact.dto';

// Services
export * from './services/contact.service';

// Use Cases
export * from './use-cases/contact/create-contact.use-case';
export * from './use-cases/contact/get-contact.use-case';

// Export an empty object to make this file a valid module
export {}; 