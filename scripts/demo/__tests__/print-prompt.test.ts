import { buildPrompt } from '../print-prompt';
import { join } from 'path';

describe('print-prompt utility', () => {
  it('builds a prompt that contains ontology sections and email text', () => {
    const emailPath = join(__dirname, '../../test/fixtures/procurement/emails/001-contract-award-abc-corp.eml');
    const prompt = buildPrompt('procurement', emailPath);
    expect(prompt).toContain('**Ontology Entities:**');
    expect(prompt).toContain('**Ontology Relationships:**');
    expect(prompt).toContain('Text to Analyze:');
  });
}); 