import { OwlSource } from '../sources/owl-source';

describe('normalizeEntityName', () => {
  it('strips CIDOC numeric prefixes', () => {
    // @ts-expect-error accessing private for test purpose
    const strip = (name: string | null) => new OwlSource().normalizeEntityName(name);
    expect(strip('E55_Type')).toBe('Type');
    expect(strip('E5_Event')).toBe('Event');
    expect(strip('Person')).toBe('Person');
    expect(strip(null)).toBeNull();
  });
}); 