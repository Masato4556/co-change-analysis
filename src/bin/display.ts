import { parseArgs } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { filterPairs } from "../filter.js";
import { CliFormatter, MarkdownFormatter } from "../formatter.js";

export function runDisplay(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      data: { type: "string" },
      top: { type: "string" },
      filter: { type: "string" },
      markdown: { type: "boolean" },
    },
    strict: true,
  });

  const dataPath = values.data ?? "co-change-data.json";

  if (!existsSync(dataPath)) {
    console.error(`Error: ${dataPath} not found.`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  const counts = data.counts ?? {};
  const idToFile: string[] = data.idToFile ?? [];

  const pairs = filterPairs(counts, idToFile, {
    topN: parseInt(values.top ?? "20"),
    filterFile: values.filter,
  });

  const formatter = values.markdown ? new MarkdownFormatter() : new CliFormatter();

  console.log(`\nCo-change Analysis Results (Total pairs: ${pairs.length})`);
  if (values.filter) console.log(`Filtered by: ${values.filter}`);
  console.log("-".repeat(40));

  console.log(formatter.format(pairs));
}
