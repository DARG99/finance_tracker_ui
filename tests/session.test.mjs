import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import axios from 'axios';

function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText;
}
const url = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const sessionUrl = url(compile('../src/auth/session.ts'));
const { getSession, hasSession, setSession, subscribeToSession } = await import(sessionUrl);
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
let lockQueue = Promise.resolve();
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: {
  request: (_name, action) => {
    const result = lockQueue.then(action);
    lockQueue = result.catch(() => {});
    return result;
  },
} } });
const schemaUrl = url(compile('../src/schemas/authSchema.ts').replace('"zod"', JSON.stringify(import.meta.resolve('zod'))));
const renewalSource = compile('../src/auth/renewal.ts')
  .replace('"axios"', JSON.stringify(import.meta.resolve('axios')))
  .replace('import { API_URL } from "../config";', 'const API_URL = "https://example.test/api";')
  .replace('"../schemas/authSchema"', JSON.stringify(schemaUrl))
  .replace('"./session"', JSON.stringify(sessionUrl));
const renewalUrl = url(renewalSource);
const { authApi, saveSession, renewSession, logoutSession } = await import(renewalUrl);
const otherTab = await import(url(renewalSource + '\n// Separate tab module state'));
const clientUrl = url(compile('../src/api/client.ts')
  .replace('"axios"', JSON.stringify(import.meta.resolve('axios')))
  .replace('import { API_URL } from "../config";', 'const API_URL = "https://example.test/api";')
  .replace('"../auth/session"', JSON.stringify(sessionUrl))
  .replace('"../auth/renewal"', JSON.stringify(renewalUrl)));
const { api } = await import(clientUrl);
const credentials = (suffix = 'new') => ({ token: `access-${suffix}`, refreshToken: `refresh-${suffix}`, expiresIn: 900000, refreshExpiresIn: 2592000000 });
function seed(expired = true) {
  saveSession(credentials('old'));
  if (expired) setSession({ ...getSession(), expiresAt: Date.now() - 1000 });
}
const ok = (config, data, status = 200) => ({ config, data, status, statusText: 'OK', headers: {} });
function fail(config, status) {
  throw new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, ok(config, {}, status));
}

test('requires renewable credentials, uses millisecond deadlines, and restores missing access tokens', () => {
  setSession(null);
  storage.set('accessToken', 'legacy-access');
  assert.equal(hasSession(), false);
  const before = Date.now();
  saveSession(credentials());
  assert.ok(getSession().expiresAt >= before + 900000);
  assert.ok(getSession().refreshExpiresAt >= before + 2592000000);
  assert.equal(storage.has('accessToken'), false);
  setSession({ ...getSession(), token: '', expiresAt: 0 });
  assert.equal(hasSession(), true);
  setSession({ ...getSession(), refreshExpiresAt: Date.now() - 1 });
  assert.equal(hasSession(), false);
  assert.throws(() => saveSession({ token: 'legacy' }));
});

test('notifies route guards on login, logout, background return, and storage changes', () => {
  let notifications = 0;
  const unsubscribe = subscribeToSession(() => notifications++);
  saveSession(credentials());
  window.dispatchEvent(new Event('pageshow'));
  window.dispatchEvent(new Event('storage'));
  document.dispatchEvent(new Event('visibilitychange'));
  setSession(null);
  assert.equal(notifications, 5);
  unsubscribe();
  window.dispatchEvent(new Event('focus'));
  assert.equal(notifications, 5);
});

test('simultaneous calls and separate tabs rotate the credential exactly once', async () => {
  seed();
  let calls = 0;
  const adapter = async (config) => {
    calls++;
    assert.equal(config.url, '/auth/refresh');
    assert.equal(config.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(config.data), { refreshToken: 'refresh-old' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    return ok(config, credentials());
  };
  authApi.defaults.adapter = adapter;
  otherTab.authApi.defaults.adapter = adapter;
  assert.deepEqual(await Promise.all([renewSession(), renewSession(), otherTab.renewSession()]), ['access-new', 'access-new', 'access-new']);
  assert.equal(calls, 1);
  assert.equal(getSession().refreshToken, 'refresh-new');
});

test('network and server failures preserve credentials for retry; refresh 401 clears them', async () => {
  for (const status of [0, 500, 401]) {
    seed();
    authApi.defaults.adapter = async (config) => {
      if (status === 0) throw new axios.AxiosError('Network Error', 'ERR_NETWORK', config);
      return fail(config, status);
    };
    await assert.rejects(renewSession());
    assert.equal(Boolean(getSession()), status !== 401);
  }
  seed();
  authApi.defaults.adapter = async (config) => ok(config, credentials());
  assert.equal(await renewSession(), 'access-new');
});

test('late refresh responses cannot resurrect a cleared or replaced session', async () => {
  seed();
  authApi.defaults.adapter = async (config) => {
    saveSession(credentials('replacement'));
    return ok(config, credentials());
  };
  await assert.rejects(renewSession());
  assert.equal(getSession().token, 'access-replacement');
});

test('logout waits for rotation and revokes the current credential before clearing it', async () => {
  seed();
  const calls = [];
  authApi.defaults.adapter = async (config) => {
    calls.push([config.url, JSON.parse(config.data).refreshToken]);
    return ok(config, config.url === '/auth/refresh' ? credentials() : undefined);
  };
  await Promise.all([renewSession(), logoutSession()]);
  assert.deepEqual(calls, [['/auth/refresh', 'refresh-old'], ['/auth/logout', 'refresh-new']]);
  assert.equal(getSession(), null);
  seed();
  authApi.defaults.adapter = async (config) => fail(config, 500);
  await assert.rejects(logoutSession());
  assert.equal(getSession(), null);
});

test('API 401 refreshes and retries the original request only once', async () => {
  seed(false);
  let refreshes = 0;
  let calls = 0;
  authApi.defaults.adapter = async (config) => { refreshes++; return ok(config, credentials()); };
  api.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.url, '/transactions');
    assert.deepEqual(config.params, { page: 2 });
    if (calls === 1) return fail(config, 401);
    assert.equal(config.headers.Authorization, 'Bearer access-new');
    return ok(config, { content: [] });
  };
  await api.get('/transactions', { params: { page: 2 } });
  assert.equal(calls, 2);
  assert.equal(refreshes, 1);
  seed(false);
  calls = 0;
  api.defaults.adapter = async (config) => { calls++; return fail(config, 401); };
  await assert.rejects(api.get('/transactions'));
  assert.equal(calls, 2);
  assert.equal(getSession(), null);
});

test('expired or missing access tokens renew before API calls and delayed 401s reuse the newer token', async () => {
  seed();
  setSession({ ...getSession(), token: '' });
  let refreshes = 0;
  authApi.defaults.adapter = async (config) => { refreshes++; return ok(config, credentials()); };
  api.defaults.adapter = async (config) => {
    assert.equal(config.headers.Authorization, 'Bearer access-new');
    return ok(config, {});
  };
  await api.get('/dashboard');
  assert.equal(refreshes, 1);
  assert.equal(await renewSession('access-old'), 'access-new');
  assert.equal(refreshes, 1);
});

test('auth failures and forbidden responses do not refresh or clear the session', async () => {
  seed(false);
  authApi.defaults.adapter = async () => { throw new Error('Unexpected refresh'); };
  api.defaults.adapter = async (config) => fail(config, config.url.startsWith('/auth/') ? 401 : 403);
  await assert.rejects(api.post('/auth/signup', {}));
  await assert.rejects(api.get('/admin'));
  assert.equal(getSession().token, 'access-old');
});
