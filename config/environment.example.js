// Example environment configuration
// Copy this file to environment.js and update with your values

module.exports = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  APP_NAME: process.env.APP_NAME || 'Deal Tracker',

  // Database Configuration
  NEO4J: {
    URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
    USERNAME: process.env.NEO4J_USERNAME || 'neo4j',
    PASSWORD: process.env.NEO4J_PASSWORD || 'password',
    DATABASE: process.env.NEO4J_DATABASE || 'neo4j'
  },

  // Test Database
  TEST_NEO4J: {
    URI: process.env.TEST_NEO4J_URI || 'bolt://localhost:7688',
    USERNAME: process.env.TEST_NEO4J_USERNAME || 'neo4j',
    PASSWORD: process.env.TEST_NEO4J_PASSWORD || 'password',
    DATABASE: process.env.TEST_NEO4J_DATABASE || 'test'
  },

  // Microsoft Graph API
  MICROSOFT_GRAPH: {
    CLIENT_ID: process.env.GRAPH_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GRAPH_CLIENT_SECRET || '',
    TENANT_ID: process.env.GRAPH_TENANT_ID || '',
    AUTHORITY: process.env.GRAPH_AUTHORITY || 'https://login.microsoftonline.com/'
  },

  // Salesforce Configuration
  SALESFORCE: {
    USERNAME: process.env.SALESFORCE_USERNAME || '',
    PASSWORD: process.env.SALESFORCE_PASSWORD || '',
    SECURITY_TOKEN: process.env.SALESFORCE_SECURITY_TOKEN || '',
    LOGIN_URL: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
    API_VERSION: process.env.SALESFORCE_API_VERSION || 'v58.0'
  },

  // OpenAI Configuration
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY || '',
    MODEL: process.env.OPENAI_MODEL || 'gpt-4',
    MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
    TEMPERATURE: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
  },

  // Redis Configuration
  REDIS: {
    URL: process.env.REDIS_URL || 'redis://localhost:6379',
    PASSWORD: process.env.REDIS_PASSWORD || '',
    DB: parseInt(process.env.REDIS_DB) || 0
  },

  // Security
  SECURITY: {
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_here',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },

  // CORS Configuration
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    CREDENTIALS: process.env.CORS_CREDENTIALS === 'true'
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Feature Flags
  FEATURES: {
    ENABLE_INSIGHTS_GENERATION: process.env.ENABLE_INSIGHTS_GENERATION !== 'false',
    ENABLE_EMAIL_PROCESSING: process.env.ENABLE_EMAIL_PROCESSING !== 'false',
    ENABLE_REAL_TIME_SYNC: process.env.ENABLE_REAL_TIME_SYNC === 'true'
  }
}; 