import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EmailProcessingService } from '../../../../../src/crm-core/application/services/email-processing.service';
import { ContactRepository } from '../../../../../src/crm-core/domain/repositories/i-contact-repository';

// Mock les dépendances du constructeur et des méthodes
jest.mock('../../../../../src/crm-core/application/services/spacy-entity-extraction.service');
jest.mock('../../../../../src/crm-core/application/services/email-ingestion.service');
jest.mock('../../../../../src/extensions/financial/application/services/financial-entity-integration.service');

// On doit utiliser requireActual pour obtenir la VRAIE classe
const { EmailProcessingService: ActualEmailProcessingService } = jest.requireActual('../../../../../src/crm-core/application/services/email-processing.service');

describe('EmailProcessingService', () => {
  let service: EmailProcessingService;
  let mockContactRepository: jest.Mocked<ContactRepository>;
  let tmpDir: string;

  beforeEach(async () => {
    mockContactRepository = { findByEmail: jest.fn() } as any;
    
    // On instancie le VRAI service
    service = new ActualEmailProcessingService(mockContactRepository);
    
    // Crée un répertoire temporaire pour les fichiers de test
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'email-test-'));
  });

  afterEach(async () => {
    // Nettoie le répertoire temporaire
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('parseEmlFile (private method)', () => {
    it('should parse a simple .eml file correctly', async () => {
      // Arrange
      const emlContent = `From: Sender <sender@example.com>
To: Recipient <recipient@example.com>
Subject: Test Subject

This is the email body.`;
      const filePath = path.join(tmpDir, 'test.eml');
      await fs.writeFile(filePath, emlContent);
      
      // Act
      const parsedEmail = await (service as any).parseEmlFile(filePath);

      // Assert
      expect(parsedEmail.subject).toBe('Test Subject');
      expect(parsedEmail.from.email).toBe('sender@example.com');
      expect(parsedEmail.to[0].email).toBe('recipient@example.com');
      expect(parsedEmail.body.trim()).toBe('This is the email body.');
    });
  });
}); 