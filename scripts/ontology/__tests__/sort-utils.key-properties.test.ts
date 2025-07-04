import { sortEntityProperties } from '../sort-utils';

describe('sortEntityProperties – keyProperties integration', () => {
  it('adds missing keyProperties into properties map', () => {
    const entities: Record<string, any> = {
      Sample: {
        keyProperties: ['name'],
        properties: {
          label: { type: 'string' },
        },
      },
    };

    const sorted = sortEntityProperties(entities);
    expect(sorted.Sample.properties).toHaveProperty('name');
    expect(sorted.Sample.properties.name.type).toBe('string');
  });

  it('does not overwrite existing key property definitions', () => {
    const entities: Record<string, any> = {
      Another: {
        keyProperties: ['id'],
        properties: {
          id: { type: 'number' },
        },
      },
    };

    const sorted = sortEntityProperties(entities);
    expect(sorted.Another.properties.id.type).toBe('number');
  });
}); 