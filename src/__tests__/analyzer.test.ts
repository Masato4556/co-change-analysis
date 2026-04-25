import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CoChangeAnalyzer } from '../analyzer.js';

describe('CoChangeAnalyzer', () => {
  let tempDir: string;
  let dataPath: string;
  let analyzer: CoChangeAnalyzer;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'co-change-'));
    dataPath = join(tempDir, 'co-gitsune.json');
    analyzer = new CoChangeAnalyzer(dataPath);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it('getId assigns sequential IDs', () => {
    const id1 = analyzer.getId('app/root.tsx');
    const id2 = analyzer.getId('package.json');
    const id3 = analyzer.getId('app/root.tsx');
    expect(id1).toBe(0);
    expect(id2).toBe(1);
    expect(id1).toBe(id3);
    expect(analyzer.idToFile[0]).toBe('app/root.tsx');
  });

  it('updateCounts increments pair counts correctly', () => {
    analyzer.updateCounts(['a.py', 'b.py', 'c.py']);
    const idA = analyzer.getId('a.py');
    const idB = analyzer.getId('b.py');
    const idC = analyzer.getId('c.py');
    expect(analyzer.counts[idA][idB]).toBe(1);
    expect(analyzer.counts[idA][idC]).toBe(1);
    expect(analyzer.counts[idB][idC]).toBe(1);

    analyzer.updateCounts(['a.py', 'b.py']);
    expect(analyzer.counts[idA][idB]).toBe(2);
  });

  it('saveData and loadData round-trip', () => {
    analyzer.getId('a.py');
    analyzer.updateCounts(['a.py', 'b.py']);
    analyzer.lastHash = 'abcdef';
    analyzer.saveData();

    const analyzer2 = new CoChangeAnalyzer(dataPath);
    analyzer2.loadData();
    expect(analyzer2.lastHash).toBe('abcdef');
    expect(analyzer2.fileToId['a.py']).toBe(0);
    expect(analyzer2.counts[0][1]).toBe(1);
  });

  it('handleRename transfers ID to new filename', () => {
    const idA = analyzer.getId('a.py');
    analyzer.getId('c.py');
    analyzer.handleRename('a.py', 'b.py');
    expect(analyzer.fileToId['b.py']).toBe(idA);
    expect('a.py' in analyzer.fileToId).toBe(false);
  });

  it('parseNameStatus handles rename and file changes', () => {
    const idA = analyzer.getId('a.py');
    const output = 'R100\ta.py\tb.py\nM\tc.py\n\nA\td.py\n';
    const files = analyzer.parseNameStatus(output);
    expect(analyzer.fileToId['b.py']).toBe(idA);
    expect(files).toContain('b.py');
    expect(files).toContain('c.py');
    expect(files).toContain('d.py');
    expect(files).not.toContain('a.py');
  });

  it('isIgnored respects patterns', () => {
    analyzer.ignorePatterns = ['package-lock.json', 'node_modules/*', 'build/'];
    expect(analyzer.isIgnored('package-lock.json')).toBe(true);
    expect(analyzer.isIgnored('node_modules/abc/def.py')).toBe(true);
    expect(analyzer.isIgnored('build/index.html')).toBe(true);
    expect(analyzer.isIgnored('app/root.tsx')).toBe(false);
    expect(analyzer.isIgnored('package.json')).toBe(false);
  });

  it('parseNameStatus excludes ignored files', () => {
    analyzer.ignorePatterns = ['package-lock.json'];
    const output = 'M\tpackage.json\nM\tpackage-lock.json\nM\tapp/root.tsx\n';
    const files = analyzer.parseNameStatus(output);
    expect(files).toContain('package.json');
    expect(files).toContain('app/root.tsx');
    expect(files).not.toContain('package-lock.json');
  });
});
