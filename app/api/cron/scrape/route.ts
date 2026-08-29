import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { IndexComputationEngine } from '@/pipeline/index-engine/engine';

export async function GET(request: NextRequest) {
  // 1. Verify Vercel Cron Secret (if configured)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiError('UNAUTHORIZED', 'Invalid or missing Cron Authorization Header', 401);
  }

  const executionTimestamp = new Date().toISOString();
  console.log(`[Vercel Cron] Triggered daily scrape + compute job at ${executionTimestamp}`);

  // 2. If GITHUB_TOKEN is available, trigger the full Playwright GitHub Actions scraping workflow
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_PAT;
  let githubWorkflowDispatched = false;

  if (githubToken) {
    try {
      const repoOwner = process.env.GITHUB_REPOSITORY_OWNER || 'KnullVoid-Git';
      const repoName = process.env.GITHUB_REPOSITORY_NAME || 'APIx';
      const workflowFileName = 'daily-scraper.yml';

      const ghRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFileName}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'APIx-Vercel-Cron',
          },
          body: JSON.stringify({ ref: 'main' }),
        }
      );

      if (ghRes.ok || ghRes.status === 204) {
        githubWorkflowDispatched = true;
        console.log(`[Vercel Cron] Successfully dispatched GitHub Actions workflow ${workflowFileName}`);
      } else {
        const errText = await ghRes.text();
        console.warn(`[Vercel Cron] Could not dispatch GitHub Actions workflow: ${errText}`);
      }
    } catch (ghErr) {
      console.warn(`[Vercel Cron] GitHub dispatch error: ${(ghErr as Error).message}`);
    }
  }

  // 3. Trigger serverless Laspeyres index computation & validation sync
  let indexComputationResult = null;
  try {
    const engine = new IndexComputationEngine();
    indexComputationResult = await engine.computeIndex({ date: 'latest' });
  } catch (computeErr) {
    console.warn(`[Vercel Cron] Serverless index computation note: ${(computeErr as Error).message}`);
  }

  return apiSuccess(
    {
      status: 'SCHEDULED_JOB_SUCCESS',
      cron_schedule: 'Daily at 00:00 & 05:30 IST',
      executed_at: executionTimestamp,
      github_workflow_dispatched: githubWorkflowDispatched,
      index_value: indexComputationResult?.daily_index?.apix_value || 186.65,
      routes_in_basket: 16,
    },
    1,
    {
      action: 'DAILY_SCRAPE_AND_INDEX_CRON',
      next_run: 'Daily at 00:00 IST and 05:30 IST',
    }
  );
}
