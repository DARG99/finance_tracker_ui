import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText.replace('from "zod"', `from "${import.meta.resolve('zod')}"`);
}
function moduleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}
const schemaUrl = moduleUrl(compile('../src/schemas/transactionSchema.ts'));
const { transactionPageSchema } = await import(schemaUrl);
const springPage = { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true };
let request;
globalThis.__transactionTestApi = {
  async delete(path) { request = { path, method: "DELETE" }; },
  async get(path, options) { request = { path, ...options }; return { data: springPage }; },
};
const serviceSource = compile('../src/services/transactionService.ts')
  .replace('import { api } from "../api/client";', 'const api = globalThis.__transactionTestApi;')
  .replace('from "../schemas/transactionSchema"', `from "${schemaUrl}"`);
const { transactionService } = await import(moduleUrl(serviceSource));

test('sends all transaction filters and preserves pagination and cancellation', async () => {
  const signal = new AbortController().signal;
  await transactionService.list(2, signal, {
    type: 'EXPENSE', categoryId: 7, search: ' coffee & tea ', from: '2026-09-01', to: '2026-09-24',
  });
  assert.equal(request.path, '/transactions');
  assert.equal(request.signal, signal);
  assert.deepEqual(request.params, {
    page: 2, size: 20, type: 'EXPENSE', categoryId: 7, search: 'coffee & tea', from: '2026-09-01', to: '2026-09-24',
  });
});

test('empty filters are omitted from serialized query parameters', async () => {
  await transactionService.list(0, undefined, { search: '  ', from: '', to: '' });
  assert.deepEqual(JSON.parse(JSON.stringify(request.params)), { page: 0, size: 20 });
});

test('normalizes Spring and legacy page numbers and rejects missing page numbers', () => {
  assert.equal(transactionPageSchema.parse(springPage).page, 0);
  const { number: _number, ...rest } = springPage;
  assert.equal(transactionPageSchema.parse({ ...rest, page: 3 }).page, 3);
  assert.equal(transactionPageSchema.safeParse(rest).success, false);
});

test('deletes only the selected transaction', async () => {
  await transactionService.remove(42);
  assert.deepEqual(request, { path: '/transactions/42', method: 'DELETE' });
});
