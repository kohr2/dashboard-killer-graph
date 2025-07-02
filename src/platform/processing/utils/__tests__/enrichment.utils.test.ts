import { flattenEnrichmentData } from '../enrichment.utils';

describe('flattenEnrichmentData', () => {
  it('should return empty object for null/undefined input', () => {
    expect(flattenEnrichmentData(null)).toEqual({});
    expect(flattenEnrichmentData(undefined)).toEqual({});
  });

  it('should return empty object for non-object input', () => {
    expect(flattenEnrichmentData('string')).toEqual({});
    expect(flattenEnrichmentData(123)).toEqual({});
    expect(flattenEnrichmentData(true)).toEqual({});
  });

  it('should flatten simple object properties', () => {
    const input = {
      name: 'John Doe',
      age: 30,
      active: true,
    };

    const expected = {
      name: 'John Doe',
      age: 30,
      active: true,
    };

    expect(flattenEnrichmentData(input)).toEqual(expected);
  });

  it('should handle nested objects by flattening them', () => {
    const input = {
      person: {
        name: 'John Doe',
        age: 30,
      },
      company: {
        name: 'Acme Corp',
        industry: 'Technology',
      },
    };

    const expected = {
      name: 'John Doe',
      age: 30,
      name: 'Acme Corp', // Note: This will overwrite the previous name
      industry: 'Technology',
    };

    expect(flattenEnrichmentData(input)).toEqual(expected);
  });

  it('should handle arrays by keeping them as-is', () => {
    const input = {
      tags: ['important', 'urgent'],
      scores: [85, 92, 78],
    };

    const expected = {
      tags: ['important', 'urgent'],
      scores: [85, 92, 78],
    };

    expect(flattenEnrichmentData(input)).toEqual(expected);
  });

  it('should handle null values', () => {
    const input = {
      name: 'John Doe',
      middleName: null,
      age: 30,
    };

    const expected = {
      name: 'John Doe',
      middleName: null,
      age: 30,
    };

    expect(flattenEnrichmentData(input)).toEqual(expected);
  });

  it('should skip undefined values', () => {
    const input = {
      name: 'John Doe',
      middleName: undefined,
      age: 30,
    };

    const expected = {
      name: 'John Doe',
      age: 30,
    };

    expect(flattenEnrichmentData(input)).toEqual(expected);
  });

  it('should skip function values', () => {
    const input = {
      name: 'John Doe',
      getFullName: () => 'John Doe',
      age: 30,
    };

    const expected = {
      name: 'John Doe',
      age: 30,
    };

    expect(flattenEnrichmentData(input)).toEqual(expected);
  });

  it('should handle deeply nested objects', () => {
    const input = {
      user: {
        profile: {
          personal: {
            name: 'John Doe',
            age: 30,
          },
          contact: {
            email: 'john@example.com',
            phone: '123-456-7890',
          },
        },
      },
    };

    const expected = {
      name: 'John Doe',
      age: 30,
      email: 'john@example.com',
      phone: '123-456-7890',
    };

    expect(flattenEnrichmentData(input)).toEqual(expected);
  });

  it('should handle mixed nested structures', () => {
    const input = {
      user: {
        name: 'John Doe',
        preferences: {
          theme: 'dark',
          notifications: ['email', 'sms'],
        },
      },
      metadata: {
        created: '2023-01-01',
        tags: ['active', 'verified'],
      },
    };

    const expected = {
      name: 'John Doe',
      theme: 'dark',
      notifications: ['email', 'sms'],
      created: '2023-01-01',
      tags: ['active', 'verified'],
    };

    expect(flattenEnrichmentData(input)).toEqual(expected);
  });
}); 