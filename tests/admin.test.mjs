import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

let request;
let response = { deletedTransactions: 3 };
globalThis.__adminTestApi = {
  async delete(path) { request = path; return { data: response }; },
};
const source = ts.transpileModule(readFileSync(new URL('../src/services/adminService.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText.replace('from "zod"', `from "${import.meta.resolve('zod')}"`)
  .replace('import { api } from "../api/client";', 'const api = globalThis.__adminTestApi;');
const { adminService, adminUserIdSchema } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('validates positive Java Long user IDs without rounding', () => {
  for (const id of ['', '0', '-1', '1.5', '1e3', 'abc', '../1', '9223372036854775808']) {
    assert.equal(adminUserIdSchema.safeParse(id).success, false, id);
  }
  assert.equal(adminUserIdSchema.parse(' 9223372036854775807 '), '9223372036854775807');
});

test('deletes only the specified user and validates the returned count', async () => {
  assert.deepEqual(await adminService.deleteAllTransactionsForUser(' 9223372036854775807 '), { deletedTransactions: 3 });
  assert.equal(request, '/admin/users/9223372036854775807/transactions');
  request = undefined;
  await assert.rejects(adminService.deleteAllTransactionsForUser('0'));
  assert.equal(request, undefined);
  response = { deletedTransactions: -1 };
  await assert.rejects(adminService.deleteAllTransactionsForUser('1'));
  response = { deletedTransactions: 0 };
  assert.deepEqual(await adminService.deleteAllTransactionsForUser('1'), { deletedTransactions: 0 });
});
