import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText.replace('from "zod"', `from "${import.meta.resolve('zod')}"`);
let request;
const forecast = { asOf: '2026-12-20', through: '2027-01-31', fundingSources: [{ id: 1, scheduledExpenses: 650, subscriptionExpenses: 40, predictedBalance: -90 }] };
globalThis.__forecastApi = { async get(path, options) { request = { path, ...options }; return { data: forecast }; } };
const source = compile('../src/services/dashboardService.ts')
  .replace('import { api } from "../api/client";', 'const api = globalThis.__forecastApi;')
  .replace('from "../dashboard/dashboardData"', `from "${url(compile('../src/dashboard/dashboardData.ts'))}"`);
const { dashboardService, forecastSchema } = await import(url(source));

test('forecast requests use the selected horizon and cancellation, independently of spending year', async () => {
  const signal = new AbortController().signal;
  for (const horizon of ['THIS_MONTH', 'NEXT_MONTH']) {
    assert.deepEqual(await dashboardService.getForecast(horizon, signal), forecast);
    assert.deepEqual(request, { path: '/dashboard/forecast', params: { horizon }, signal });
  }
});

test('forecast validation accepts negative balances but rejects incomplete or invalid predictions', () => {
  assert.equal(forecastSchema.safeParse(forecast).success, true);
  for (const invalid of [
    { ...forecast, through: '2026-12-01' },
    { ...forecast, through: '2027-02-30' },
    { ...forecast, fundingSources: [{ id: 1, predictedBalance: 20 }] },
    { ...forecast, fundingSources: [{ ...forecast.fundingSources[0], subscriptionExpenses: -10 }] },
  ]) assert.equal(forecastSchema.safeParse(invalid).success, false);
});
