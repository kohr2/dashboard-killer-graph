import { sortNamedArray, sortRecord } from '../sort-utils';

describe('sort-utils', () => {
  it('sortNamedArray orders items alphabetically by name (case-insensitive)', () => {
    const unsorted = [
      { name: 'Banana' },
      { name: 'apple' },
      { name: 'cherry' },
      { name: 'Apricot' },
    ];
    const sorted = sortNamedArray(unsorted);
    expect(sorted.map((i) => i.name)).toEqual(['apple', 'Apricot', 'Banana', 'cherry']);
    // Original array should remain unchanged
    expect(unsorted[0].name).toBe('Banana');
  });

  it('sortRecord returns object with keys in alphabetical order', () => {
    const record = {
      Zebra: { value: 1 },
      apple: { value: 2 },
      Monkey: { value: 3 },
    } as const;
    const sorted = sortRecord(record);
    expect(Object.keys(sorted)).toEqual(['apple', 'Monkey', 'Zebra']);
  });
}); 