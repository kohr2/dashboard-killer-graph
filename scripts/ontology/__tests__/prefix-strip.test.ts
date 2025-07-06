import { OwlSource } from '../sources/owl-source';

describe('OwlSource normalizeEntityName', () => {
  it('strips leading E-number prefix from class names', () => {
    const source = new OwlSource();
    // @ts-ignore access private for test purposes
    const clean = source.normalizeEntityName('E55_Type');
    expect(clean).toBe('Type');
    // non-matching names are unchanged
    const unchanged = source.normalizeEntityName('Person');
    expect(unchanged).toBe('Person');
  });
}); 