import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replace('from "zod"', `from "${import.meta.resolve('zod')}"`);
}
function moduleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}
const schemaUrl = moduleUrl(compile('../src/schemas/transactionSchema.ts'));
const { transactionPageSchema, transactionSchema, reimbursableExpensePageSchema } = await import(schemaUrl);
const springPage = { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true };
let request;
let responseData = springPage;
globalThis.__transactionTestApi = {
  async patch(path, data) { request = { path, method: "PATCH", data }; return { data: responseData }; },
  async post(path, data) { request = { path, method: "POST", data }; },
  async delete(path) { request = { path, method: "DELETE" }; },
  async get(path, options) { request = { path, ...options }; return { data: responseData }; },
};
const serviceSource = compile('../src/services/transactionService.ts')
  .replace('import { api } from "../api/client";', 'const api = globalThis.__transactionTestApi;')
  .replace('from "../schemas/transactionSchema"', `from "${schemaUrl}"`);
const { transactionService } = await import(moduleUrl(serviceSource));

async function loadReimbursementComponent(path) {
  const source = compile(path)
    .replace('from "./dates"', `from "${moduleUrl(compile('../src/transactions/dates.ts'))}"`)
    .replace('from "../services/transactionService"', `from "${moduleUrl(serviceSource)}"`)
    .replace('from "../api/errors"', `from "${moduleUrl(compile('../src/api/errors.ts').replace('from "axios"', `from "${import.meta.resolve('axios')}"`))}"`)
    .replace(/from "(react|react\/jsx-runtime|react-bootstrap)"/g, (_, name) => `from "${import.meta.resolve(name)}"`);
  return (await import(moduleUrl(source))).default;
}

test('expense picker is optional and can clear an existing link while expenses load', async () => {
  const ExpensePicker = await loadReimbursementComponent('../src/transactions/ExpensePicker.tsx');
  const html = renderToStaticMarkup(createElement(ExpensePicker, { value: 42, selectedLabel: 'Dinner', onChange() {} }));
  const select = html.match(/<select\b[^>]*>/)?.[0];
  assert.ok(select);
  assert.doesNotMatch(select, /required|disabled/);
  assert.match(html, /\(optional\)/);
  assert.match(html, /<option value="">No linked expense<\/option>/);
  assert.match(html, /<option value="42" selected="">Dinner<\/option>/);
});

test('unlinked reimbursement label has no original-expense link or missing-date warning', async () => {
  const ReimbursementLabel = await loadReimbursementComponent('../src/transactions/ReimbursementLabel.tsx');
  const transaction = { id: 50, type: 'INCOME', amount: 250, transactionNature: 'REIMBURSEMENT', reimbursementForTransactionId: null };
  const html = renderToStaticMarkup(createElement(ReimbursementLabel, { transaction, onShowOriginal() {} }));
  assert.match(html, /No linked expense/);
  assert.doesNotMatch(html, /<button|date unavailable|original transaction/);
  const linked = renderToStaticMarkup(createElement(ReimbursementLabel, {
    transaction: { ...transaction, reimbursementForTransactionId: 42, reimbursementForDescription: 'Dinner', reimbursementForTransactionDate: '2026-09-25' },
    onShowOriginal() {},
  }));
  assert.match(linked, /<button/);
  assert.match(linked, /Dinner/);
  assert.match(linked, /dateTime="2026-09-25"/);
});

test('creates standalone reimbursements with either an omitted or null expense link', async () => {
  const standalone = {
    type: 'INCOME', transactionNature: 'REIMBURSEMENT', amount: 250,
    destinationFundingSourceId: 4, transactionDate: '2026-10-02',
    description: 'Reimbursement for several expenses',
  };
  for (const data of [standalone, { ...standalone, reimbursementForTransactionId: null }]) {
    await transactionService.create(data);
    assert.deepEqual(request, { path: '/transactions', method: 'POST', data });
  }
  const response = { id: 50, ...standalone, reimbursementForTransactionId: null,
    reimbursementForDescription: null, reimbursementForTransactionDate: null };
  assert.deepEqual(transactionSchema.parse(response), response);
});

test('nature-only patches omit financial fields and preserve omission versus explicit null', async () => {
  try {
    for (const data of [
      { transactionNature: 'REIMBURSEMENT' },
      { transactionNature: 'REIMBURSEMENT', reimbursementForTransactionId: null },
      { transactionNature: 'REIMBURSEMENT', reimbursementForTransactionId: 42 },
      { transactionNature: 'NORMAL' },
    ]) {
      responseData = { id: 50, type: 'INCOME', amount: 250, ...data };
      await transactionService.update(50, data);
      assert.deepEqual(JSON.parse(JSON.stringify(request)), { path: '/transactions/50', method: 'PATCH', data });
      assert.equal('amount' in request.data, false);
      assert.equal('destinationFundingSourceId' in request.data, false);
    }
  } finally {
    responseData = springPage;
  }
});

test('dashboard accepts a reimbursement-only month with negative net expenses', async () => {
  const { dashboardSchema } = await import(moduleUrl(compile('../src/dashboard/dashboardData.ts')));
  const overview = {
    allTimeIncome: 0, allTimeExpense: -250, cashFlow: 250, currentTrackedMoney: 250,
    fundingSources: [{ id: 4, name: 'Bank', balance: 250 }],
    monthlySpending: [{ month: 10, amount: -250 }], spendingByCategory: [],
  };
  assert.deepEqual(dashboardSchema.parse(overview), overview);
});

test('updates income reimbursement details and omits the expense link when converting back', async () => {
  const common = { amount: 25, transactionDate: '2026-10-02', description: 'Dinner refund', destinationFundingSourceId: 1 };
  const conversion = { ...common, transactionNature: 'REIMBURSEMENT', reimbursementForTransactionId: 42 };
  responseData = { id: 43, type: 'INCOME', ...conversion };
  try {
    const updated = await transactionService.update(43, conversion);
    assert.deepEqual(request, { path: '/transactions/43', method: 'PATCH', data: conversion });
    assert.equal(updated.reimbursementForTransactionId, 42);
    assert.equal(updated.transactionNature, 'REIMBURSEMENT');

    const normal = { ...common, transactionNature: 'NORMAL' };
    responseData = { id: 43, type: 'INCOME', ...normal, reimbursementForTransactionId: null };
    const restored = await transactionService.update(43, normal);
    assert.deepEqual(request, { path: '/transactions/43', method: 'PATCH', data: normal });
    assert.equal(restored.transactionNature, 'NORMAL');
    assert.equal(restored.reimbursementForTransactionId, null);
  } finally {
    responseData = springPage;
  }
});

test('sends all transaction filters and preserves pagination and cancellation', async () => {
  const signal = new AbortController().signal;
  await transactionService.list(2, signal, {
    type: 'EXPENSE', transactionNature: 'NORMAL', categoryId: 7, fundingSourceId: 3, search: ' coffee & tea ', from: '2026-09-01', to: '2026-09-24',
  });
  assert.equal(request.path, '/transactions');
  assert.equal(request.signal, signal);
  assert.deepEqual(request.params, {
    page: 2, size: 50, type: 'EXPENSE', transactionNature: 'NORMAL', categoryId: 7, fundingSourceId: 3, search: 'coffee & tea', from: '2026-09-01', to: '2026-09-24',
  });
});

test('empty filters are omitted from serialized query parameters', async () => {
  await transactionService.list(0, undefined, { search: '  ', from: '', to: '' });
  assert.deepEqual(JSON.parse(JSON.stringify(request.params)), { page: 0, size: 50 });
});

test('keeps selected sizes and filters across pages and accepts a short final page', async () => {
  try {
    const filters = { type: 'INCOME', search: 'refund' };
    for (const size of [20, 50, 100]) {
      for (const page of [0, 1]) {
        const content = [{ id: 50, type: 'INCOME', amount: 250 }];
        responseData = { content, number: page, size, totalElements: size + 1, totalPages: 2, first: page === 0, last: page === 1 };
        const result = await transactionService.list(page, undefined, filters, size);
        assert.deepEqual(JSON.parse(JSON.stringify(request.params)), { page, size, ...filters });
        assert.equal(result.page, page);
        assert.equal(result.size, size);
        assert.equal(result.last, page === 1);
        assert.deepEqual(result.content, content);
      }
    }
  } finally {
    responseData = springPage;
  }
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


test('creates a reimbursement with the original expense link and receiving funding source', async () => {
  const reimbursement = {
    type: 'INCOME', transactionNature: 'REIMBURSEMENT', amount: 25,
    destinationFundingSourceId: 1, reimbursementForTransactionId: 42,
    description: 'Dinner reimbursement', transactionDate: '2026-09-26',
  };
  await transactionService.create(reimbursement);
  assert.deepEqual(request, { path: '/transactions', method: 'POST', data: reimbursement });
});

test('retains reimbursement response fields and accepts older transaction responses', () => {
  const base = { id: 43, type: 'INCOME', amount: 25 };
  const reimbursement = { ...base, transactionNature: 'REIMBURSEMENT', reimbursementForTransactionId: 42, reimbursementForDescription: 'Dinner with friends' };
  assert.deepEqual(transactionSchema.parse(reimbursement), reimbursement);
  assert.deepEqual(transactionSchema.parse(base), base);
  assert.equal(transactionSchema.safeParse({ ...base, transactionNature: 'UNKNOWN' }).success, false);
  assert.equal(transactionSchema.safeParse({ ...reimbursement, reimbursementForTransactionId: -1 }).success, false);
  const page = transactionPageSchema.parse({ ...springPage, content: [reimbursement], totalElements: 1, totalPages: 1 });
  assert.equal(page.content[0].reimbursementForTransactionId, 42);
});

test('expense selection requests one page from the dedicated endpoint with search and cancellation', async () => {
  const signal = new AbortController().signal;
  const expense = {
    id: 42, description: 'Dinner', transactionDate: '2026-09-25', amount: 50,
    categoryName: 'Dining', sourceFundingSourceName: 'Bank',
    alreadyReimbursedAmount: 25, remainingReimbursableAmount: 25,
  };
  responseData = { ...springPage, content: [expense], number: 3, totalElements: 81, totalPages: 5, first: false, last: false };
  try {
    const page = await transactionService.getReimbursableExpenses(3, ' dinner & friends ', signal);
    assert.equal(request.path, '/transactions/reimbursable-expenses');
    assert.equal(request.signal, signal);
    assert.deepEqual(request.params, { page: 3, size: 20, search: 'dinner & friends' });
    assert.equal(page.page, 3);
    assert.deepEqual(page.content, [expense]);
  } finally {
    responseData = springPage;
  }
  await transactionService.getReimbursableExpenses(0, '  ');
  assert.deepEqual(JSON.parse(JSON.stringify(request.params)), { page: 0, size: 20 });
});

test('reimbursement filters are sent to the backend and can combine with income', async () => {
  await transactionService.list(0, undefined, { transactionNature: 'REIMBURSEMENT' });
  assert.deepEqual(JSON.parse(JSON.stringify(request.params)), { page: 0, size: 50, transactionNature: 'REIMBURSEMENT' });
  await transactionService.list(0, undefined, { type: 'INCOME', transactionNature: 'NORMAL' });
  assert.deepEqual(JSON.parse(JSON.stringify(request.params)), { page: 0, size: 50, type: 'INCOME', transactionNature: 'NORMAL' });
});

test('reimbursable expense pages support legacy pagination and validate remaining amounts', () => {
  const { number: _number, ...rest } = springPage;
  assert.equal(reimbursableExpensePageSchema.parse({ ...rest, page: 2 }).page, 2);
  assert.equal(reimbursableExpensePageSchema.safeParse({ content: [] }).success, false);
  const expense = { id: 42, description: null, transactionDate: '2026-09-25', amount: 50, alreadyReimbursedAmount: 25, remainingReimbursableAmount: -1 };
  assert.equal(reimbursableExpensePageSchema.safeParse({ ...springPage, content: [expense] }).success, false);
});


test('loads only the linked original transaction and preserves its description and date', async () => {
  const original = { id: 42, type: 'EXPENSE', amount: 50, description: 'Dinner with friends', transactionDate: '2026-09-25' };
  const signal = new AbortController().signal;
  responseData = original;
  try {
    assert.deepEqual(await transactionService.getById(42, signal), original);
    assert.equal(request.path, '/transactions/42');
    assert.equal(request.signal, signal);
  } finally {
    responseData = springPage;
  }
});
