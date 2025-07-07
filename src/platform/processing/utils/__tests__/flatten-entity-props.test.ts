import { flattenEntityProperties } from '@platform/processing/utils/enrichment.utils';

/**
 * RED test – ensure flattenEntityProperties flattens nested contact maps.
 */

describe('flattenEntityProperties', () => {
  it('flattens nested contact details into string properties', () => {
    const props = {
      contactDetails: {
        mobile: '+1-555-777-8888',
        email: 'hello@example.com',
        website: 'https://example.com',
      },
      name: 'Test Corp',
    };

    const result = flattenEntityProperties(props);

    expect(result).toEqual({
      contactDetails: 'Phone: +1-555-777-8888 | Email: hello@example.com | Web: https://example.com',
      name: 'Test Corp',
    });
  });
}); 