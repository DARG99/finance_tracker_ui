import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/auth/session.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText;
const { hasSession, setToken, subscribeToSession } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
globalThis.window = new EventTarget();
window.setInterval = setInterval;
window.clearInterval = clearInterval;
globalThis.document = new EventTarget();
document.visibilityState = 'visible';
const jwt = (claims) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

test('restores saved tokens but rejects missing, expired, and malformed JWT sessions', () => {
  setToken(null);
  assert.equal(hasSession(), false);
  setToken(jwt({ exp: Date.now() / 1000 + 3600 }));
  assert.equal(hasSession(), true);
  setToken(jwt({ exp: Date.now() / 1000 - 1 }));
  assert.equal(hasSession(), false);
  setToken('header.invalid.signature');
  assert.equal(hasSession(), false);
  setToken(jwt({ exp: 'tomorrow' }));
  assert.equal(hasSession(), false);
  setToken('opaque-server-validated-token');
  assert.equal(hasSession(), true);
  setToken(null);
  assert.equal(hasSession(), false);
});

test('notifies route guards on login, logout, background return, and storage changes', () => {
  let notifications = 0;
  const unsubscribe = subscribeToSession(() => notifications++);
  setToken('saved-token');
  window.dispatchEvent(new Event('pageshow'));
  window.dispatchEvent(new Event('storage'));
  document.dispatchEvent(new Event('visibilitychange'));
  setToken(null);
  assert.equal(notifications, 5);
  unsubscribe();
  window.dispatchEvent(new Event('focus'));
  assert.equal(notifications, 5);
});
