import { parseArgs } from 'node:util';
import { existsSync, unlinkSync } from 'node:fs';
import { cwd } from 'node:process';
import { CoChangeAnalyzer } from '../analyzer.js';

export function runAnalyze(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      data: { type: 'string' },
      reset: { type: 'boolean' },
      update: { type: 'boolean', short: 'u' },
      since: { type: 'string' },
      'max-commits': { type: 'string' },
    },
    strict: true,
  });

  const dataPath = values.data ?? 'co-gitsune.json';
  const maxCommits = values['max-commits'] ? parseInt(values['max-commits']) : undefined;

  if (values.reset && existsSync(dataPath)) {
    unlinkSync(dataPath);
  }

  const analyzer = new CoChangeAnalyzer(dataPath);

  if (values.update) {
    if (values.since || maxCommits !== undefined) {
      console.error('Error: --since and --max-commits cannot be used with --update');
      process.exit(1);
    }
    if (existsSync(dataPath)) {
      console.log(`Loading existing data from ${dataPath} for incremental update...`);
      analyzer.loadData();
    } else {
      console.log(`Warning: ${dataPath} not found. Starting fresh analysis...`);
    }
  } else {
    console.log(`Starting fresh analysis (will overwrite ${dataPath})...`);
  }

  const ignoreFile = '.cochangeignore';
  if (existsSync(ignoreFile)) {
    console.log(`Loading ignore patterns from ${ignoreFile}...`);
    analyzer.loadIgnorePatterns(ignoreFile);
  }

  console.log(`Analyzing repository at ${cwd()}...`);
  if (values.since) console.log(`Filtering commits since: ${values.since}`);
  if (maxCommits) console.log(`Limiting to max commits: ${maxCommits}`);

  analyzer.updateWithGit(values.since, maxCommits);
  analyzer.saveData();

  analyzer.report();
  console.log(`\nData saved to ${dataPath}`);
}
