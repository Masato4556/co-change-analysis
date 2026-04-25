#!/usr/bin/env node
import { runAnalyze } from './analyze.js';
import { runDisplay } from './display.js';

const [subcommand, ...args] = process.argv.slice(2);

switch (subcommand) {
  case 'analyze':
    runAnalyze(args);
    break;
  case 'display':
    runDisplay(args);
    break;
  default:
    console.error('Usage: co-gitsune <command> [options]');
    console.error('');
    console.error('Commands:');
    console.error('  analyze   Analyze git commit history for co-change pairs');
    console.error('  display   Display results from a previous analysis');
    process.exit(1);
}
