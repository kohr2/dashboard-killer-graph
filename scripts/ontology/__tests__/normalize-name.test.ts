import { OwlSource } from '../sources/owl-source';

describe('normalizeEntityName', () => {
  it('strips CIDOC numeric prefixes', () => {
    const strip = (name: string | null) => new OwlSource().normalizeEntityName(name);
    expect(strip('E55_Type')).toBe('Type');
    expect(strip('E5_Event')).toBe('Event');
    expect(strip('E22_Man-Made_Object')).toBe('ManMadeObject');
    expect(strip('Person')).toBe('Person');
    expect(strip(null)).toBeNull();
  });
}); 