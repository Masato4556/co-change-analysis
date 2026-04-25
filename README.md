# co-change

Analyze git commit history to find files that frequently change together.

## Installation

```bash
npm install -g co-change
```

## CLI Usage

### `co-change-analyze`

Scans the git history of the current repository and saves co-change data to a JSON file.

```bash
co-change-analyze [options]
```

| Option | Description |
|--------|-------------|
| `--data <path>` | Path to the output data file (default: `co-change.json`) |
| `--since <date>` | Only analyze commits after this date (e.g. `2024-01-01`) |
| `--max-commits <n>` | Limit analysis to the most recent N commits |
| `--update`, `-u` | Incrementally update existing data with new commits |
| `--reset` | Delete existing data file before analyzing |

**Examples:**

```bash
# Analyze entire history
co-change-analyze

# Analyze only recent commits
co-change-analyze --since 2024-01-01
co-change-analyze --max-commits 500

# Incrementally update existing data
co-change-analyze --update
```

### `co-change-display`

Display the results from a previously generated data file.

```bash
co-change-display [options]
```

| Option | Description |
|--------|-------------|
| `--data <path>` | Path to the data file (default: `co-change.json`) |
| `--top <n>` | Show top N pairs (default: `20`) |
| `--filter <file>` | Only show pairs involving this file |
| `--markdown` | Output in Markdown table format |

**Examples:**

```bash
# Show top 20 pairs
co-change-display

# Show top 50 pairs in Markdown
co-change-display --top 50 --markdown

# Show pairs involving a specific file
co-change-display --filter src/auth.ts
```

## .cochangeignore

Place a `.cochangeignore` file in your repository root to exclude files from analysis. It uses the same syntax as `.gitignore`.

```
# .cochangeignore
*.lock
dist/
*.snap
```

## Library Usage

```typescript
import { CoChangeAnalyzer } from 'co-change';
import { filterPairs, formatPairs } from 'co-change/results';

const analyzer = new CoChangeAnalyzer('co-change.json');
analyzer.updateWithGit();
analyzer.saveData();

const data = JSON.parse(fs.readFileSync('co-change.json', 'utf-8'));
const pairs = filterPairs(data.counts, data.idToFile, { topN: 10 });
formatPairs(pairs, 'cli');
```

## License

MIT
