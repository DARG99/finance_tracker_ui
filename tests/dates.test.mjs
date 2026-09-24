import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../src/transactions/dates.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText;
const { displayDate, parseDate } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('formats calendar dates and converts day-first input to API dates', () => {
  assert.equal(displayDate('2026-09-13'), '13/09/2026');
  assert.equal(displayDate('2026-01-02'), '02/01/2026');
  assert.equal(parseDate('13/09/2026'), '2026-09-13');
  assert.equal(parseDate('02/01/2026'), '2026-01-02');
  assert.equal(parseDate('29/02/2024'), '2024-02-29');
});
test('rejects invalid dates, non-leap days, and American input', () => {
  for (const value of ['', '9/13/2026', '09/13/2026', '31/04/2026', '29/02/2026', '00/01/2026', '01/01/0000']) {
    assert.equal(parseDate(value), null, value);
  }
});
