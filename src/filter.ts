import { FilePair } from "./types.js";

export { FilePair };

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
