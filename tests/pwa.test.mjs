import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const listeners = {};
const offline = new Response('Offline screen');
vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
  self: { addEventListener: (type, handler) => { listeners[type] = handler; }, location: { origin: 'https://finance.test' } },
  URL, Response,
  fetch: async () => { throw new TypeError('Offline'); },
  caches: { match: async () => offline },
});

test('offline navigation has a fallback while API requests bypass the worker', async () => {
  let response;
  listeners.fetch({ request: { mode: 'navigate', url: 'https://finance.test/dashboard' }, respondWith: (value) => { response = value; } });
  assert.equal(await response, offline);
  for (const [mode, url] of [
    ['cors', 'https://finance.test/api/dashboard'],
    ['navigate', 'https://finance.test/api/dashboard'],
    ['navigate', 'https://other.test/dashboard'],
  ]) {
    listeners.fetch({ request: { mode, url }, respondWith: () => assert.fail('Must not intercept API or external requests') });
  }
});

test('manifest launches dashboard and all install icons have the declared PNG dimensions', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url)));
  assert.equal(manifest.start_url, '/dashboard');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const file = new URL(`../public${icon.src}`, import.meta.url);
    assert.ok(existsSync(file));
    const png = readFileSync(file);
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
});
