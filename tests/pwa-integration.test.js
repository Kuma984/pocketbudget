import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const script = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'http://localhost:8000';

function worker({ available = [], network = async () => { throw new Error('offline'); } } = {}) {
  const handlers = {};
  const responses = new Map(available.map(path => [new URL(path, origin).href, path]));
  const cached = [];
  const self = { registration: { scope: origin + '/' }, location: { origin }, skipWaiting: () => {},
    addEventListener: (event, handler) => { handlers[event] = handler; } };
  const cache = {
    addAll: async assets => cached.push(...assets),
    add: async asset => { cached.push(asset); },
    put: async () => {},
    match: async (request, options) => {
      const url = new URL(request.url ?? request, origin);
      if (options?.ignoreSearch) url.search = '';
      return responses.get(url.href);
    },
  };
  vm.runInNewContext(script, { URL, self, fetch: network, caches: { open: async () => cache } });
  return {
    cached,
    install: () => { let pending; handlers.install({ waitUntil: p => { pending = p; } }); return pending; },
    request: (path, mode = 'navigate', method = 'GET') => {
      let response;
      handlers.fetch({ request: { url: new URL(path, origin).href, method, mode },
        respondWith: p => { response = p; } });
      return response;
    },
  };
}

test('first install includes the integrated PWA and C dependencies', async () => {
  const instance = worker();
  await instance.install();
  for (const asset of ['./index.html', './css/layout.css', './css/components.css', './css/member-c.css', './js/modules/c-context.js', './js/modules/c-tools.js', './js/modules/chat.js', './js/modules/chat-answers.js', './js/modules/c-draft.js']) {
    assert.ok(instance.cached.includes(asset), asset);
  }
  assert.equal(instance.cached.some(file => file.startsWith('./api/')), false);
});

test('offline route reload serves the app shell; requests to PHP are not intercepted', async () => {
  const instance = worker({ available: ['/index.html'] });
  assert.equal(await instance.request('/?demo=1#simulation'), '/index.html');
  assert.equal(await instance.request('/index.html'), '/index.html');
  assert.equal(instance.request('/api/snapshot.php'), undefined);
  assert.equal(instance.request('/api/chat.php', 'cors', 'POST'), undefined);
});

test('static CSS/JS prefer the network so an old cached stylesheet is not kept online', async () => {
  const fresh = { status: 200, clone() { return this; }, body: 'fresh' };
  const online = worker({ available: ['/css/member-c.css'], network: async () => fresh });
  assert.equal(await online.request('/css/member-c.css?v=19', 'no-cors'), fresh);
  const offline = worker({ available: ['/css/member-c.css'] });
  assert.equal(await offline.request('/css/member-c.css?v=19', 'no-cors'), '/css/member-c.css');
});
