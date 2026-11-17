// Run explicitly against the local backend fixture. Never uses a real account.
const assert = require('node:assert/strict');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { UnauthorizedError, auth } = require('@modelcontextprotocol/sdk/client/auth.js');

const origin = process.env.MCP_TEST_ORIGIN;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')) throw Error('MCP_TEST_ORIGIN must be the loopback-only OAuth HTTP fixture');
const canonical = 'https://inspector.gridinsoft.com';
const endpoint = new URL(`${canonical}/mcp/server`);
let cookie = '';
const seen = [];
async function localFetch(input, init = {}) {
  const url = new URL(input instanceof Request ? input.url : String(input));
  assert.equal(url.origin, canonical, 'SDK must not contact any other origin');
  seen.push(`${init.method || 'GET'} ${url.pathname}`);
  return fetch(origin + url.pathname + url.search, init);
}
async function browser(path, init = {}) {
  const headers = new Headers(init.headers); if (cookie) headers.set('Cookie', cookie);
  const response = await fetch(origin + path, { ...init, headers, redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie'); if (setCookie) cookie = setCookie.split(';')[0];
  return response;
}
let info, tokens, verifier, authorizationURL;
const provider = {
  redirectUrl: 'http://127.0.0.1:18181/callback',
  clientMetadata: { client_name: 'Inspector SDK integration test', redirect_uris: ['http://127.0.0.1:18181/callback'], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] },
  state: () => 'test-state-not-a-secret',
  clientInformation: () => info, saveClientInformation: value => { info = value; },
  tokens: () => tokens, saveTokens: value => { tokens = value; },
  saveCodeVerifier: value => { verifier = value; }, codeVerifier: () => verifier,
  redirectToAuthorization: url => { authorizationURL = url; },
};
const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
const message = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } } };
const transport = new StreamableHTTPClientTransport(endpoint, { authProvider: provider, fetch: localFetch });
const client = new Client({ name: 'sdk-oauth-integration', version: '1' });
const passed = [];
async function main() {
  await browser('/__fixture/reset', { method: 'POST' });
  await assert.rejects(client.connect(transport), UnauthorizedError);
  assert(authorizationURL); assert(info.client_id); assert(verifier);
  assert.equal(authorizationURL.searchParams.get('resource'), endpoint.href);
  assert.equal(authorizationURL.searchParams.get('code_challenge_method'), 'S256');
  passed.push('sdk_discovery_dynamic_registration_pkce');

  let response = await browser(authorizationURL.pathname + authorizationURL.search);
  assert.equal(response.status, 303);
  const resume = response.headers.get('location');
  assert.match(resume, /^\/oauth\/authorize\?request=[a-f0-9]{48}$/);
  response = await browser(resume); assert.equal(response.headers.get('location'), '/login');
  response = await browser('/__fixture/login', { method: 'POST' });
  assert.equal((await response.json()).next, resume);
  response = await browser(resume);
  assert.equal(response.status, 200); assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const page = await response.text();
  assert.match(page, /3 credits per check/); assert.match(page, /10 credits per scan/);
  const csrf = page.match(/name="csrf" value="([a-f0-9]+)"/)[1];
  const request = new URL(resume, canonical).searchParams.get('request');
  async function decision(values, originHeader = canonical) {
    return browser('/oauth/authorize', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: originHeader }, body: new URLSearchParams({ request, csrf, decision: 'allow', ...values }) });
  }
  assert.equal((await decision({ csrf: 'invalid' })).status, 403);
  assert.equal((await decision({}, 'https://unrelated.example')).status, 403);
  await browser('/__fixture/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'user=402' });
  assert.equal((await decision({})).status, 403);
  await browser('/__fixture/login', { method: 'POST' });
  response = await decision({}); assert.equal(response.status, 303);
  const callback = new URL(response.headers.get('location'));
  assert.equal(callback.searchParams.get('state'), 'test-state-not-a-secret');
  assert.equal(callback.searchParams.get('iss'), canonical);
  passed.push('login_resume_consent_csrf_account_binding');

  await transport.finishAuth(callback.searchParams.get('code'));
  await client.close();
  await client.connect(new StreamableHTTPClientTransport(endpoint, { authProvider: provider, fetch: localFetch }));
  assert.equal(client.getServerVersion().version, '1.1.0');
  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools.map(t => t.name), ['inspect_domain', 'scan_url', 'get_balance']);
  const balance = await client.callTool({ name: 'get_balance', arguments: {} });
  assert.equal(JSON.parse(balance.content[0].text).credits, 100);
  assert.equal(balance.isError, false);
  const unknown = await client.callTool({ name: 'inspect_domain', arguments: { domain: 'example.com' } });
  assert.equal(JSON.parse(unknown.content[0].text).verdict, 'Unknown');
  const failure = await client.callTool({ name: 'inspect_domain', arguments: { domain: 'error.example' } });
  assert.equal(failure.isError, true);
  await assert.rejects(client.callTool({ name: 'get_balance', arguments: { unexpected: true } }));
  assert.equal((await client.listPrompts()).prompts.length, 2);
  const prompt = await client.getPrompt({ name: 'check-website-safety', arguments: { site: 'https://example.com/?a=1&b=two words' } });
  assert.match(prompt.messages[0].content.text, /browser/); assert.doesNotMatch(prompt.messages[0].content.text, /API_KEY/);
  const resource = await client.readResource({ uri: (await client.listResources()).resources[0].uri });
  assert.match(resource.contents[0].text, /Unknown/);
  passed.push('sdk_initialize_tools_prompts_resources_tool_errors');

  const bearer = { ...headers, Authorization: `Bearer ${tokens.access_token}` };
  response = await localFetch(endpoint, { method: 'POST', headers: { ...bearer, Origin: 'https://unrelated.example' }, body: JSON.stringify(message) }); assert.equal(response.status, 403);
  response = await localFetch(endpoint, { method: 'POST', headers: { ...bearer, 'MCP-Protocol-Version': 'invalid' }, body: JSON.stringify(message) }); assert.equal(response.status, 400);
  response = await localFetch(endpoint, { method: 'POST', headers: { ...bearer, Accept: 'application/json' }, body: JSON.stringify(message) }); assert.equal(response.status, 406);
  response = await localFetch(endpoint, { method: 'POST', headers: bearer, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) }); assert.equal(response.status, 202); assert.equal(await response.text(), '');
  assert.equal((await localFetch(endpoint)).status, 405);
  response = await browser('/mcp/server', { method: 'POST', headers, body: JSON.stringify(message) }); assert.equal(response.status, 401); // Website cookie cannot replace an OAuth token.
  assert.match(response.headers.get('www-authenticate'), /resource_metadata=/);
  passed.push('origin_version_accept_notification_cookie_guards');

  const originalRefresh = tokens.refresh_token;
  assert.equal(await auth(provider, { serverUrl: endpoint, fetchFn: localFetch }), 'AUTHORIZED');
  assert.notEqual(tokens.refresh_token, originalRefresh);
  passed.push('sdk_refresh_rotation');

  response = await browser('/mcp/connections'); const connections = await response.text();
  const grant = connections.match(/name="grant" value="([a-f0-9]+)"/)[1];
  const manageCsrf = connections.match(/name="csrf" value="([a-f0-9]+)"/)[1];
  response = await browser('/mcp/connections', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: canonical }, body: new URLSearchParams({ grant, csrf: manageCsrf }) }); assert.equal(response.status, 303);
  response = await localFetch(endpoint, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${tokens.access_token}` }, body: JSON.stringify(message) }); assert.equal(response.status, 401);
  response = await browser('/mcp/connections'); assert.match(await response.text(), /No active connections/);
  passed.push('browser_revocation_invalidates_access');
  await client.close();
  console.log(JSON.stringify({ passed, requests: seen.length, externalRequests: 0, inspectorCreditsSpent: 0 }, null, 2));
}
main().catch(async error => { await client.close().catch(() => {}); console.error(error.message); process.exitCode = 1; });
