import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../agent/checkchaser-research-import-2000.json', import.meta.url);

export async function GET() {
  const source = JSON.parse(await readFile(sourceUrl, 'utf8'));
  const jobs = Array.isArray(source.jobs) ? source.jobs.slice(0, 2000) : [];
  return Response.json({
    schema_version: source.schema_version || 'checkchaser.research_batch.v1',
    generated_at: source.generated_at || null,
    summary: source.summary || `${jobs.length} verified roles available.`,
    jobs,
    history: Array.isArray(source.history) ? source.history : [],
    feed: {
      total: jobs.length,
      maximum: 2000,
      daily_target: 60,
      last_run: null,
    },
  }, {
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
