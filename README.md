# co-gitsune

Analyze git commit history to find files that frequently change together.

## Installation

```bash
npm install -g co-gitsune
```

## CLI Usage

### `co-gitsune analyze`

Scans the git history of the current repository and saves co-change data to a JSON file.

```bash
co-gitsune analyze [options]
```

| Option | Description |
|--------|-------------|
| `--data <path>` | Path to the output data file (default: `co-gitsune.json`) |
| `--since <date>` | Only analyze commits after this date (e.g. `2024-01-01`) |
| `--max-commits <n>` | Limit analysis to the most recent N commits |
| `--update`, `-u` | Incrementally update existing data with new commits |
| `--reset` | Delete existing data file before analyzing |

**Examples:**

```bash
# Analyze entire history
co-gitsune analyze

# Analyze only recent commits
co-gitsune analyze --since 2024-01-01
co-gitsune analyze --max-commits 500

# Incrementally update existing data
co-gitsune analyze --update
```

### `co-gitsune display`

Display the results from a previously generated data file.

```bash
co-gitsune display [options]
```

| Option | Description |
|--------|-------------|
| `--data <path>` | Path to the data file (default: `co-gitsune.json`) |
| `--top <n>` | Show top N pairs (default: `20`) |
| `--filter <file>` | Only show pairs involving this file |
| `--markdown` | Output in Markdown table format |

**Examples:**

```bash
# Show top 20 pairs
co-gitsune display

# Show top 50 pairs in Markdown
co-gitsune display --top 50 --markdown

# Show pairs involving a specific file
co-gitsune display --filter src/auth.ts
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
import { CoChangeAnalyzer } from 'co-gitsune';
import { filterPairs, formatPairs } from 'co-gitsune/results';

const analyzer = new CoChangeAnalyzer('co-gitsune.json');
analyzer.updateWithGit();
analyzer.saveData();

const data = JSON.parse(fs.readFileSync('co-gitsune.json', 'utf-8'));
const pairs = filterPairs(data.counts, data.idToFile, { topN: 10 });
formatPairs(pairs, 'cli');
```

## License

MIT
