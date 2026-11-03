const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { createApp } = require('./graphserver');

test('GraphQL works and state-changing requests require the correct session CSRF token', async t => {
  const app = createApp({ sessionSecret: randomBytes(32).toString('hex'), production: false });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const query = '{cities(state:"California"){city state}}';
  const graph = await fetch(base + '/graphql?query=' + encodeURIComponent(query));
  assert.equal(graph.status, 200);
  assert.equal(graph.headers.get('x-powered-by'), null);
  assert.equal(graph.headers.get('x-content-type-options'), 'nosniff');
  const result = await graph.json();
  assert.ok(result.data.cities.length > 0);
  assert.ok(result.data.cities.every(city => city.state === 'California'));
  assert.equal((await fetch(base + '/posts/create', { method: 'POST' })).status, 403);
  const tokenResponse = await fetch(base + '/csrf-token');
  const cookie = tokenResponse.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  assert.match(tokenResponse.headers.get('set-cookie'), /HttpOnly/);
  assert.match(tokenResponse.headers.get('set-cookie'), /SameSite=Strict/);
  const { csrfToken } = await tokenResponse.json();
  assert.equal((await fetch(base + '/posts/create', { method: 'POST', headers: { cookie, 'x-csrf-token': 'wrong' } })).status, 403);
  assert.equal((await fetch(base + '/posts/create', { method: 'POST', headers: { cookie, 'x-csrf-token': csrfToken } })).status, 200);
  assert.equal((await fetch(base + '/graphql', { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ query }) })).status, 200);
});

test('the app refuses to start without a strong external session secret', () => {
  assert.throws(() => createApp({ sessionSecret: 'short' }), /SESSION_SECRET/);
});
