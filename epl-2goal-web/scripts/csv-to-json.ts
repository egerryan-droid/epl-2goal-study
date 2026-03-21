import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const DATA_DIR = path.resolve(__dirname, '../../data/powerbi');
const OUT_DIR = path.resolve(__dirname, '../src/data');

fs.mkdirSync(OUT_DIR, { recursive: true });

function readCsv(filename: string): Record<string, string>[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
  return parse(raw, { columns: true, skip_empty_lines: true });
}

function coerce(value: string): string | number | boolean | null {
  if (value === '' || value === 'None' || value === 'null') return null;
  if (value === 'True') return true;
  if (value === 'False') return false;
  const num = Number(value);
  if (!Number.isNaN(num) && value.trim() !== '') return num;
  return value;
}

function convertRows(rows: Record<string, string>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      out[key] = coerce(val);
    }
    return out;
  });
}

function writeJson(filename: string, data: unknown): void {
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Wrote ${outPath}`);
}

// Straight conversions
const simpleMappings: [string, string][] = [
  ['fact_plus2_events.csv', 'fact_plus2_events.json'],
  ['dim_season.csv', 'dim_season.json'],
  ['dim_team.csv', 'dim_team.json'],
  ['dim_match.csv', 'dim_match.json'],
  ['dim_minute_bucket.csv', 'dim_minute_bucket.json'],
  ['summary_overall.csv', 'summary_overall.json'],
  ['summary_by_bucket.csv', 'summary_by_bucket.json'],
  ['summary_by_season.csv', 'summary_by_season.json'],
  ['summary_by_team.csv', 'summary_by_team.json'],
  ['summary_regression.csv', 'summary_regression.json'],
  ['summary_bucket_stats.csv', 'summary_bucket_stats.json'],
];

for (const [csvFile, jsonFile] of simpleMappings) {
  const rows = readCsv(csvFile);
  const data = convertRows(rows);
  writeJson(jsonFile, data);
}

// Goals grouped by match_key
const goalRows = convertRows(readCsv('fact_goal_timeline.csv'));
const goalsByMatch: Record<string, unknown[]> = {};
for (const row of goalRows) {
  const key = String(row.match_key);
  if (!goalsByMatch[key]) goalsByMatch[key] = [];
  goalsByMatch[key].push(row);
}
writeJson('goals_by_match.json', goalsByMatch);

console.log('Done.');
