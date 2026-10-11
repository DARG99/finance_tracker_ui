import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText.replace('from "zod"', `from "${import.meta.resolve('zod')}"`);
let request;
let payday = null;
let failure;
const forecast = { asOf: '2026-12-20', through: '2027-01-31', fundingSources: [{ id: 1, scheduledExpenses: 650, subscriptionExpenses: 40, predictedBalance: -90 }] };
globalThis.__forecastApi = {
  async get(path, options) {
    request = { path, ...options };
    if (failure) throw failure;
    return { data: path === '/users/me/payday' ? { paydayDay: payday } : forecast };
  },
  async patch(path, data) {
    request = { path, data };
    if (failure) throw failure;
    payday = data.paydayDay;
    return { data: { paydayDay: payday } };
  },
};
const source = compile('../src/services/dashboardService.ts')
  .replace('import { api } from "../api/client";', 'const api = globalThis.__forecastApi;')
  .replace('from "../dashboard/dashboardData"', `from "${url(compile('../src/dashboard/dashboardData.ts'))}"`);
const { dashboardService, forecastSchema } = await import(url(source));

test('forecast uses the backend payday default without month or year parameters', async () => {
  const signal = new AbortController().signal;
  assert.deepEqual(await dashboardService.getForecast(signal), forecast);
  assert.deepEqual(request, { path: '/dashboard/forecast', signal });
});

test('payday setup supports unconfigured accounts and saves days 1 through 31', async () => {
  const signal = new AbortController().signal;
  assert.deepEqual(await dashboardService.getPayday(signal), { paydayDay: null });
  assert.deepEqual(request, { path: '/users/me/payday', signal });
  for (const day of [1, 25, 31]) {
    assert.deepEqual(await dashboardService.setPayday(day), { paydayDay: day });
    assert.deepEqual(request, { path: '/users/me/payday', data: { paydayDay: day } });
    assert.deepEqual(await dashboardService.getPayday(), { paydayDay: day });
  }
  for (const day of [null, undefined, 0, 32, 1.5, NaN]) {
    request = undefined;
    await assert.rejects(dashboardService.setPayday(day));
    assert.equal(request, undefined);
  }
});

test('forecast setup conflicts and payday save failures remain actionable', async () => {
  failure = { isAxiosError: true, response: { status: 409, data: { detail: 'Set your payday first.' } } };
  try {
    await assert.rejects(dashboardService.getForecast(), error => error === failure);
    await assert.rejects(dashboardService.setPayday(25), error => error === failure);
  } finally { failure = undefined; }
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
