import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText;
}
function moduleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}
let deletedPath;
let failure;
globalThis.__fundingTestApi = {
  async delete(path) {
    deletedPath = path;
    if (failure) throw failure;
    return { status: 204 };
  },
};
const { profileService } = await import(moduleUrl(compile('../src/services/profileService.ts')
  .replace('import { api } from "../api/client";', 'const api = globalThis.__fundingTestApi;')));
const { getApiErrorMessage } = await import(moduleUrl(compile('../src/api/errors.ts')
  .replace('from "axios"', `from "${import.meta.resolve('axios')}"`)));

test('deletes the selected funding source and propagates rejected deletions', async () => {
  await profileService.deleteFundingSource(17);
  assert.equal(deletedPath, '/funding-sources/17');
  failure = { isAxiosError: true, response: { status: 409, data: {
    detail: 'Funding source balance must be zero before deletion',
  } } };
  await assert.rejects(profileService.deleteFundingSource(18), (error) => error === failure);
  assert.equal(deletedPath, '/funding-sources/18');
  assert.equal(getApiErrorMessage(failure, 'Fallback'), failure.response.data.detail);
  failure = undefined;
});

test('displays Spring error formats and falls back for missing error details', () => {
  for (const field of ['detail', 'message', 'reason']) {
    assert.equal(getApiErrorMessage({ isAxiosError: true, response: { data: {
      [field]: 'Cannot delete a funding source that is used by transactions',
    } } }, 'Fallback'), 'Cannot delete a funding source that is used by transactions');
  }
  assert.equal(getApiErrorMessage({ isAxiosError: true, response: { data: {} } }, 'Fallback'), 'Fallback');
  assert.equal(getApiErrorMessage(new Error('Network error'), 'Fallback'), 'Fallback');
});


test('deletes the selected category and preserves backend conflict and not-found errors', async () => {
  await profileService.deleteCategory(23);
  assert.equal(deletedPath, '/categories/23');
  for (const [status, detail] of [
    [409, 'Cannot delete a category that is used by transactions'],
    [404, 'Category not found'],
  ]) {
    failure = { isAxiosError: true, response: { status, data: { detail } } };
    try {
      await assert.rejects(profileService.deleteCategory(24), (error) => error === failure);
      assert.equal(deletedPath, '/categories/24');
      assert.equal(getApiErrorMessage(failure, 'Fallback'), detail);
    } finally {
      failure = undefined;
    }
  }
});
