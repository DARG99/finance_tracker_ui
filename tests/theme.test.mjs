import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../src/theme/theme.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText;
const { readTheme, saveTheme, applyTheme, THEME_KEY } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let stored;
let systemDark = true;
globalThis.window = { matchMedia: () => ({ matches: systemDark }) };
globalThis.localStorage = {
  getItem(key) { assert.equal(key, THEME_KEY); return stored ?? null; },
  setItem(key, value) { assert.equal(key, THEME_KEY); stored = value; },
};
globalThis.document = { documentElement: { dataset: {}, style: {} } };

test('theme follows the system initially and restores an explicit choice on reopening', () => {
  assert.equal(readTheme(), 'dark');
  saveTheme('light');
  assert.equal(readTheme(), 'light');
  saveTheme('dark');
  systemDark = false;
  assert.equal(readTheme(), 'dark');
  stored = 'invalid';
  assert.equal(readTheme(), 'light');
});

test('both Bootstrap and native controls receive the selected theme', () => {
  for (const theme of ['dark', 'light']) {
    applyTheme(theme);
    assert.equal(document.documentElement.dataset.bsTheme, theme);
    assert.equal(document.documentElement.style.colorScheme, theme);
  }
});

test('blocked storage does not break theme selection', () => {
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readTheme(), 'light');
  assert.doesNotThrow(() => saveTheme('dark'));
  applyTheme('dark');
  assert.equal(document.documentElement.dataset.bsTheme, 'dark');
});
