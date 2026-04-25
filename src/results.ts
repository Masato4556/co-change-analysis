export interface FilePair {
  count: number;
  file1: string;
  file2: string;
}

export function filterPairs(
  counts: Record<string | number, Record<string | number, number>>,
  idToFile: string[],
  options: { topN?: number; filterFile?: string } = {}
): FilePair[] {
  const { topN, filterFile } = options;

  let filterId: number | undefined;
  if (filterFile !== undefined) {
    const idx = idToFile.indexOf(filterFile);
    if (idx === -1) return [];
    filterId = idx;
  }

  const pairs: FilePair[] = [];
  for (const [id1Raw, connected] of Object.entries(counts)) {
    const id1 = parseInt(String(id1Raw));
    for (const [id2Raw, count] of Object.entries(connected)) {
      const id2 = parseInt(String(id2Raw));
      if (filterId !== undefined && id1 !== filterId && id2 !== filterId) continue;
      pairs.push({ count, file1: idToFile[id1], file2: idToFile[id2] });
    }
  }

  pairs.sort((a, b) => b.count - a.count);
  return topN !== undefined ? pairs.slice(0, topN) : pairs;
}

export function formatPairs(pairs: FilePair[], mode: 'cli' | 'markdown' = 'cli'): void {
  if (pairs.length === 0) {
    console.log('No pairs found.');
    return;
  }

  if (mode === 'markdown') {
    console.log('| Rank | Changes | File 1 | File 2 |');
    console.log('|------|---------|--------|--------|');
    pairs.forEach(({ count, file1, file2 }, i) => {
      console.log(`| ${i + 1} | ${count} | \`${file1}\` | \`${file2}\` |`);
    });
  } else {
    const maxF1 = Math.max(...pairs.map(p => p.file1.length));
    const header = `${'Rank'.padStart(4)} | ${'Count'.padStart(5)} | ${'File 1'.padEnd(maxF1)} | File 2`;
    console.log(header);
    console.log('-'.repeat(header.length));
    pairs.forEach(({ count, file1, file2 }, i) => {
      console.log(`${String(i + 1).padStart(4)} | ${String(count).padStart(5)} | ${file1.padEnd(maxF1)} | ${file2}`);
    });
  }
}
