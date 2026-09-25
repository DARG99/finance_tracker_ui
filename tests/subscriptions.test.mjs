import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const inactiveSubscription = {
  id: 17, name: 'Music', amount: 9.99, frequency: 'MONTHLY',
  nextPaymentDate: '2026-10-01', active: false,
  fundingSourceId: 2, fundingSourceName: 'Bank', categoryId: 3, categoryName: 'Entertainment',
};
const requests = [];
let failure;
globalThis.__subscriptionTestApi = {
  async delete(path) {
    requests.push({ method: 'DELETE', path });
    if (failure) throw failure;
    return { status: 204 };
  },
  async patch(path, data) {
    requests.push({ method: 'PATCH', path, data });
    return { status: 200, data: inactiveSubscription };
  },
};
const source = ts.transpileModule(readFileSync(new URL('../src/services/subscriptionService.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText
  .replace('import { api } from "../api/client";', 'const api = globalThis.__subscriptionTestApi;')
  .replace('from "zod"', `from "${import.meta.resolve('zod')}"`);
const { subscriptionService } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('deactivation uses its dedicated endpoint and returns the updated subscription', async () => {
  requests.length = 0;
  const result = await subscriptionService.deactivate(17);
  assert.deepEqual(requests, [{ method: 'PATCH', path: '/subscriptions/17/deactivate', data: undefined }]);
  assert.deepEqual(result, inactiveSubscription);
});

test('deletion targets only the selected subscription and accepts an empty 204 response', async () => {
  requests.length = 0;
  assert.equal(await subscriptionService.remove(23), undefined);
  assert.deepEqual(requests, [{ method: 'DELETE', path: '/subscriptions/23' }]);
});

test('rejected deletions preserve conflict and not-found errors without automatic deactivation', async () => {
  for (const [status, detail] of [
    [409, 'This subscription has payment history and cannot be deleted. Deactivate it instead.'],
    [404, 'Subscription not found'],
  ]) {
    requests.length = 0;
    failure = { isAxiosError: true, response: { status, data: { detail } } };
    try {
      await assert.rejects(subscriptionService.remove(24), (error) => error === failure);
      assert.deepEqual(requests, [{ method: 'DELETE', path: '/subscriptions/24' }]);
    } finally {
      failure = undefined;
    }
  }
});
