import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import type { AnalysisData } from './types.js';

// Python の fnmatch.fnmatch と同様に * は / を含む全文字にマッチする
function fnmatch(filename: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexStr}$`).test(filename);
}

export class CoChangeAnalyzer {
  private dataPath: string;
  lastHash: string | null = null;
  fileToId: Record<string, number> = {};
  idToFile: string[] = [];
  counts: Record<number, Record<number, number>> = {};
  ignorePatterns: string[] = [];

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  loadIgnorePatterns(ignoreFile: string): void {
    if (!existsSync(ignoreFile)) return;
    for (const line of readFileSync(ignoreFile, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        this.ignorePatterns.push(trimmed);
      }
    }
  }

  isIgnored(filename: string): boolean {
    for (const pattern of this.ignorePatterns) {
      if (pattern.endsWith('/') && filename.startsWith(pattern)) return true;
      if (fnmatch(filename, pattern)) return true;
    }
    return false;
  }

  getId(filename: string): number {
    if (!(filename in this.fileToId)) {
      const id = this.idToFile.length;
      this.fileToId[filename] = id;
      this.idToFile.push(filename);
      return id;
    }
    return this.fileToId[filename];
  }

  updateCounts(files: string[]): void {
    const ids = [...new Set(files.map(f => this.getId(f)))].sort((a, b) => a - b);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const id1 = ids[i], id2 = ids[j];
        if (!(id1 in this.counts)) this.counts[id1] = {};
        this.counts[id1][id2] = (this.counts[id1][id2] ?? 0) + 1;
      }
    }
  }

  saveData(): void {
    const data: AnalysisData = {
      lastHash: this.lastHash,
      fileToId: this.fileToId,
      idToFile: this.idToFile,
      counts: this.counts as Record<string, Record<string, number>>,
    };
    writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
  }

  loadData(): void {
    if (!existsSync(this.dataPath)) return;
    const data: AnalysisData = JSON.parse(readFileSync(this.dataPath, 'utf-8'));
    this.lastHash = data.lastHash;
    this.fileToId = data.fileToId;
    this.idToFile = data.idToFile;
    this.counts = {};
    for (const [k1, v1] of Object.entries(data.counts)) {
      const id1 = parseInt(k1);
      this.counts[id1] = {};
      for (const [k2, v2] of Object.entries(v1)) {
        this.counts[id1][parseInt(k2)] = v2;
      }
    }
  }

  handleRename(oldFile: string, newFile: string): void {
    if (oldFile in this.fileToId) {
      const oldId = this.fileToId[oldFile];
      this.fileToId[newFile] = oldId;
      this.idToFile[oldId] = newFile;
      delete this.fileToId[oldFile];
    } else {
      this.getId(newFile);
    }
  }

  parseNameStatus(output: string): string[] {
    const changedFiles = new Set<string>();
    for (const line of output.trim().split('\n')) {
      if (!line) continue;
      const parts = line.split('\t');
      const status = parts[0];
      if (status.startsWith('R')) {
        if (parts.length >= 3) {
          const [, oldName, newName] = parts;
          if (!this.isIgnored(newName)) {
            this.handleRename(oldName, newName);
            changedFiles.add(newName);
          }
        }
      } else if (status === 'M' || status === 'A' || status === 'D') {
        if (parts.length >= 2 && !this.isIgnored(parts[1])) {
          changedFiles.add(parts[1]);
        }
      }
    }
    return [...changedFiles];
  }

  updateWithGit(since?: string, maxCommits?: number): void {
    let rangeSpec = 'HEAD';
    if (this.lastHash && !since && !maxCommits) {
      rangeSpec = `${this.lastHash}..HEAD`;
    }

    const args = ['log', '--pretty=format:COMMIT:%H', '--name-status', '-M'];
    if (since) args.push(`--since=${since}`);
    if (maxCommits) args.push('-n', String(maxCommits));
    args.push(rangeSpec);

    const result = spawnSync('git', args, { encoding: 'utf-8' });
    if (result.status !== 0) {
      throw new Error(`git log failed: ${result.stderr}`);
    }

    let newestHash: string | null = null;
    for (const block of result.stdout.split('COMMIT:')) {
      if (!block.trim()) continue;
      const lines = block.trim().split('\n');
      const commitHash = lines[0];
      if (newestHash === null) newestHash = commitHash;
      const files = this.parseNameStatus(lines.slice(1).join('\n'));
      if (files.length >= 2) this.updateCounts(files);
    }

    if (newestHash) this.lastHash = newestHash;
  }

}
