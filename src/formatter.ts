import { FilePair } from "./types.js";

export interface Formatter {
  format(pairs: FilePair[]): string;
}

export class CliFormatter implements Formatter {
  format(pairs: FilePair[]): string {
    if (pairs.length === 0) return 'No pairs found.';
    const maxF1 = Math.max(...pairs.map(p => p.file1.length));
    const header = `${'Rank'.padStart(4)} | ${'Count'.padStart(5)} | ${'File 1'.padEnd(maxF1)} | File 2`;
    const lines = [header, '-'.repeat(header.length)];
    pairs.forEach(({ count, file1, file2 }, i) => {
      lines.push(`${String(i + 1).padStart(4)} | ${String(count).padStart(5)} | ${file1.padEnd(maxF1)} | ${file2}`);
    });
    return lines.join('\n');
  }
}

export class MarkdownFormatter implements Formatter {
  format(pairs: FilePair[]): string {
    if (pairs.length === 0) return 'No pairs found.';
    const lines = ['| Rank | Changes | File 1 | File 2 |', '|------|---------|--------|--------|'];
    pairs.forEach(({ count, file1, file2 }, i) => {
      lines.push(`| ${i + 1} | ${count} | \`${file1}\` | \`${file2}\` |`);
    });
    return lines.join('\n');
  }
}
