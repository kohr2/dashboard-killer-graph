import { translateQueryBasic, TranslatedQuery } from '../../../servers/query-translator-basic';

describe('translateQueryBasic', () => {
  describe('Input validation', () => {
    it('should throw error for null or undefined query', () => {
      expect(() => translateQueryBasic(null as any)).toThrow('Query must be a non-empty string');
      expect(() => translateQueryBasic(undefined as any)).toThrow('Query must be a non-empty string');
    });

    it('should throw error for empty string', () => {
      expect(() => translateQueryBasic('')).toThrow('Query must be a non-empty string');
    });

    it('should throw error for non-string input', () => {
      expect(() => translateQueryBasic(123 as any)).toThrow('Query must be a non-empty string');
    });
  });

  describe('Entity type detection', () => {
    it('should detect Deal entities from "deal" keyword', () => {
      const result = translateQueryBasic('show me all deals');
      expect(result.resourceTypes).toContain('Deal');
    });

    it('should detect Deal entities from "transaction" keyword', () => {
      const result = translateQueryBasic('list all transactions');
      expect(result.resourceTypes).toContain('Deal');
    });

    it('should detect Contact and Person entities from "contact" keyword', () => {
      const result = translateQueryBasic('find contacts');
      expect(result.resourceTypes).toContain('Contact');
      expect(result.resourceTypes).toContain('Person');
    });

    it('should detect Contact and Person entities from "person" keyword', () => {
      const result = translateQueryBasic('show me all people');
      expect(result.resourceTypes).toContain('Contact');
      expect(result.resourceTypes).toContain('Person');
    });

    it('should detect Organization entities from "organization" keyword', () => {
      const result = translateQueryBasic('list organizations');
      expect(result.resourceTypes).toContain('Organization');
    });

    it('should detect Organization entities from "company" keyword', () => {
      const result = translateQueryBasic('find companies');
      expect(result.resourceTypes).toContain('Organization');
    });

    it('should detect Organization entities from "firm" keyword', () => {
      const result = translateQueryBasic('show firms');
      expect(result.resourceTypes).toContain('Organization');
    });

    it('should detect Communication entities from "communication" keyword', () => {
      const result = translateQueryBasic('list communications');
      expect(result.resourceTypes).toContain('Communication');
    });

    it('should detect Communication entities from "email" keyword', () => {
      const result = translateQueryBasic('show emails');
      expect(result.resourceTypes).toContain('Communication');
    });

    it('should detect Communication entities from "message" keyword', () => {
      const result = translateQueryBasic('find messages');
      expect(result.resourceTypes).toContain('Communication');
    });

    it('should detect Investor and Fund entities from "investor" keyword', () => {
      const result = translateQueryBasic('list investors');
      expect(result.resourceTypes).toContain('Investor');
      expect(result.resourceTypes).toContain('Fund');
    });

    it('should detect Investor and Fund entities from "fund" keyword', () => {
      const result = translateQueryBasic('show funds');
      expect(result.resourceTypes).toContain('Investor');
      expect(result.resourceTypes).toContain('Fund');
    });

    it('should detect multiple entity types in one query', () => {
      const result = translateQueryBasic('show deals and contacts');
      expect(result.resourceTypes).toContain('Deal');
      expect(result.resourceTypes).toContain('Contact');
      expect(result.resourceTypes).toContain('Person');
    });

    it('should default to Deal when no entity type detected', () => {
      const result = translateQueryBasic('show me something');
      expect(result.resourceTypes).toEqual(['Deal']);
    });

    it('should be case insensitive', () => {
      const result = translateQueryBasic('SHOW ME ALL DEALS');
      expect(result.resourceTypes).toContain('Deal');
    });
  });

  describe('Command detection', () => {
    it('should default to "show" command', () => {
      const result = translateQueryBasic('list all deals');
      expect(result.command).toBe('show');
    });

    it('should detect "show_related" command from "related" keyword', () => {
      const result = translateQueryBasic('show deals related to something');
      expect(result.command).toBe('show_related');
    });

    it('should detect "show_related" command from "with" keyword', () => {
      const result = translateQueryBasic('show deals with Blackstone');
      expect(result.command).toBe('show_related');
    });

    it('should detect "show_related" command from French "lié" keyword', () => {
      const result = translateQueryBasic('montrer les deals liés à quelque chose');
      expect(result.command).toBe('show_related');
    });

    it('should set relatedTo to Organization for show_related commands', () => {
      const result = translateQueryBasic('show deals with Blackstone');
      expect(result.command).toBe('show_related');
      expect(result.relatedTo).toEqual(['Organization']);
    });

    it('should not set relatedTo for show commands', () => {
      const result = translateQueryBasic('show all deals');
      expect(result.command).toBe('show');
      expect(result.relatedTo).toBeUndefined();
    });
  });

  describe('Filter extraction', () => {
    it('should extract proper nouns as name filters', () => {
      const result = translateQueryBasic('show deals with Blackstone');
      expect(result.filters).toBeDefined();
      expect(result.filters!.name).toBe('Blackstone');
    });

    it('should extract multiple proper nouns', () => {
      const result = translateQueryBasic('show deals with Goldman Sachs');
      expect(result.filters).toBeDefined();
      expect(result.filters!.name).toBe('Goldman Sachs');
    });

    it('should handle mixed case proper nouns', () => {
      const result = translateQueryBasic('show deals with BlackStone Group');
      expect(result.filters).toBeDefined();
      expect(result.filters!.name).toBe('BlackStone Group');
    });

    it('should not set filters when no proper nouns found', () => {
      const result = translateQueryBasic('show all deals');
      expect(result.filters).toBeUndefined();
    });

    it('should ignore common words that start with capital letters', () => {
      const result = translateQueryBasic('Show me all deals');
      expect(result.filters).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle "Show recent deals with Blackstone" correctly', () => {
      const result = translateQueryBasic('Show recent deals with Blackstone');
      
      expect(result.command).toBe('show_related');
      expect(result.resourceTypes).toContain('Deal');
      expect(result.filters).toBeDefined();
      expect(result.filters!.name).toBe('Blackstone');
      expect(result.relatedTo).toEqual(['Organization']);
    });

    it('should handle "get all organizations data" correctly', () => {
      const result = translateQueryBasic('get all organizations data');
      
      expect(result.command).toBe('show');
      expect(result.resourceTypes).toContain('Organization');
      expect(result.filters).toBeUndefined();
      expect(result.relatedTo).toBeUndefined();
    });

    it('should handle "Find contacts in technology sector" correctly', () => {
      const result = translateQueryBasic('Find contacts in technology sector');
      
      expect(result.command).toBe('show');
      expect(result.resourceTypes).toContain('Contact');
      expect(result.resourceTypes).toContain('Person');
      expect(result.filters).toBeUndefined();
    });

    it('should handle French queries', () => {
      const result = translateQueryBasic('montrer les deals liés à Blackstone');
      
      expect(result.command).toBe('show_related');
      expect(result.resourceTypes).toContain('Deal');
      expect(result.filters).toBeDefined();
      expect(result.filters!.name).toBe('Blackstone');
      expect(result.relatedTo).toEqual(['Organization']);
    });
  });

  describe('Edge cases', () => {
    it('should handle queries with special characters', () => {
      const result = translateQueryBasic('show deals with "Blackstone & Co."');
      expect(result.resourceTypes).toContain('Deal');
      expect(result.command).toBe('show_related');
    });

    it('should handle very long queries', () => {
      const longQuery = 'show me all the deals that are related to organizations and companies and firms in the technology sector';
      const result = translateQueryBasic(longQuery);
      
      expect(result.resourceTypes).toContain('Deal');
      expect(result.resourceTypes).toContain('Organization');
      expect(result.command).toBe('show_related');
    });

    it('should handle queries with numbers', () => {
      const result = translateQueryBasic('show deals from 2023');
      expect(result.resourceTypes).toContain('Deal');
    });
  });
}); 