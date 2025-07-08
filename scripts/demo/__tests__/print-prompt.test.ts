import { buildPrompt } from '../print-prompt';
import { join } from 'path';

describe('print-prompt utility', () => {
  it('builds a prompt that contains ontology sections and email text', () => {
    const emailPath = join(__dirname, '../../../test/fixtures/financial/emails/001-investment-update-blackrock.eml');
    const prompt = buildPrompt('financial', emailPath);
    expect(prompt).toContain('**Ontology Entities:**');
    expect(prompt).toContain('**Ontology Relationships:**');
    expect(prompt).toContain('Text to Analyze:');
  });
}); 