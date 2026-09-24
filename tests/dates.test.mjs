import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../src/transactions/dates.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText;
const { displayDate, parseDate, monthTransactionsUrl, dateFiltersFromSearch } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
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

test('monthly links select the complete month including leap years and year boundaries', () => {
  for (const [year, month, from, to] of [
    [2024, 2, '2024-02-01', '2024-02-29'],
    [2026, 2, '2026-02-01', '2026-02-28'],
    [2026, 4, '2026-04-01', '2026-04-30'],
    [2026, 12, '2026-12-01', '2026-12-31'],
    [1, 2, '0001-02-01', '0001-02-28'],
    [9999, 12, '9999-12-01', '9999-12-31'],
  ]) {
    const url = new URL(monthTransactionsUrl(year, month), 'https://example.test');
    assert.equal(url.pathname, '/transactions');
    assert.deepEqual(Object.fromEntries(url.searchParams), { from, to });
    assert.deepEqual(dateFiltersFromSearch(url.search), { from, to });
  }
});

test('chart navigation reads only date filters and discards invalid ranges', () => {
  assert.deepEqual(dateFiltersFromSearch('?from=2026-09-01&to=2026-09-30&type=EXPENSE&categoryId=7&search=coffee'), {
    from: '2026-09-01', to: '2026-09-30',
  });
  assert.deepEqual(dateFiltersFromSearch('?from=2026-02-30&to=invalid'), { from: undefined, to: undefined });
  assert.deepEqual(dateFiltersFromSearch('?from=2026-09-30&to=2026-09-01'), {});
});
