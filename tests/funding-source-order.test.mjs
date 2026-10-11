import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../src/dashboard/fundingSourceOrder.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText;
const { loadFundingSourceOrder, orderFundingSources, saveFundingSourceOrder } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let stored;
globalThis.localStorage = { getItem: () => stored ?? null, setItem: (_key, value) => { stored = value; } };

test('saved order survives reloads and keeps new and deleted sources consistent', () => {
  stored = undefined;
  const sources = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.deepEqual(orderFundingSources(sources, loadFundingSourceOrder()), sources);
  assert.equal(saveFundingSourceOrder([3, 1, 2]), true);
  assert.deepEqual(orderFundingSources(sources, loadFundingSourceOrder()).map(s => s.id), [3, 1, 2]);
  assert.deepEqual(orderFundingSources([{ id: 1 }, { id: 3 }, { id: 4 }], loadFundingSourceOrder()).map(s => s.id), [3, 1, 4]);
  saveFundingSourceOrder([10, 9]);
  assert.deepEqual(orderFundingSources(sources, loadFundingSourceOrder()).map(s => s.id), [3, 1, 2]);
});

test('invalid stored data cannot hide or duplicate funding sources', () => {
  for (const value of ['invalid', '{}', 'null']) {
    stored = value;
    assert.deepEqual(loadFundingSourceOrder(), []);
  }
  stored = '[2,2,-1,"3",null,1.5,1]';
  assert.deepEqual(loadFundingSourceOrder(), [2, 1]);
  assert.deepEqual(orderFundingSources([{ id: 1 }, { id: 2 }], [2, 2, 99]), [{ id: 2 }, { id: 1 }]);
});

test('unavailable storage is handled without preventing the dashboard from rendering', () => {
  const storage = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } };
  try {
    assert.deepEqual(loadFundingSourceOrder(), []);
    assert.equal(saveFundingSourceOrder([2, 1]), false);
  } finally { globalThis.localStorage = storage; }
});
