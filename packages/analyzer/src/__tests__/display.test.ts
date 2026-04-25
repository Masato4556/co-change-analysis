import { describe, it, expect } from 'vitest';
import { filterPairs } from '../display.js';

describe('filterPairs', () => {
  const idToFile = ['a.py', 'b.py', 'c.py', 'd.py'];
  const counts = {
    0: { 1: 10, 2: 5 },
    1: { 2: 8, 3: 2 },
    2: { 3: 4 },
  };

  it('returns all pairs sorted by count descending', () => {
    const pairs = filterPairs(counts, idToFile);
    expect(pairs).toHaveLength(5);
    expect(pairs[0].count).toBe(10);
    expect(pairs[0].file1).toBe('a.py');
    expect(pairs[0].file2).toBe('b.py');
  });

  it('filters by filename', () => {
    const pairs = filterPairs(counts, idToFile, { filterFile: 'b.py' });
    expect(pairs).toHaveLength(3);
    for (const { file1, file2 } of pairs) {
      expect(file1 === 'b.py' || file2 === 'b.py').toBe(true);
    }
  });

  it('limits to top N', () => {
    const pairs = filterPairs(counts, idToFile, { topN: 3 });
    expect(pairs).toHaveLength(3);
    expect(pairs[0].count).toBe(10);
    expect(pairs[1].count).toBe(8);
    expect(pairs[2].count).toBe(5);
  });

  it('returns empty array for unknown filterFile', () => {
    const pairs = filterPairs(counts, idToFile, { filterFile: 'unknown.py' });
    expect(pairs).toHaveLength(0);
  });
});
