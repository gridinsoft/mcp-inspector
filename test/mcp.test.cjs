const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {Client}=require('@modelcontextprotocol/sdk/client/index.js');
const {InMemoryTransport}=require('@modelcontextprotocol/sdk/inMemory.js');
const {StdioClientTransport}=require('@modelcontextprotocol/sdk/client/stdio.js');
const {InspectorApi}=require('../dist/api.js');
const {createServer,callTool,VERSION}=require('../dist/server.js');
const path=require('node:path');

async function session(t,handler,{apiKey='test-key'}={}) {
 const calls=[];
 const api=new InspectorApi({apiKey,fetch:async (input,options)=>{
  const call={url:new URL(input),options}; calls.push(call);
  return handler(call);
 }});
 const server=createServer(api);
 const client=new Client({name:'tests',version:'1.0.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 t.after(async()=>{await client.close();await server.close();});
 await server.connect(b); await client.connect(a);
 return {api,client,calls};
}
const json=(value,status=200)=>Response.json(value,{status});
const toolResult={content:[{type:'text',text:'ok'}],structuredContent:{ok:true},isError:false};

test('initialization advertises matching version and capabilities',async t=>{
 const {client,calls}=await session(t,()=>json({}));
 assert.equal(client.getServerVersion().version,VERSION);
 assert.deepEqual(client.getServerCapabilities(),{tools:{},prompts:{},resources:{}});
 assert.equal(calls.length,0);
 assert.equal(require('../package.json').version,VERSION);
 assert.equal(require('../server.json').version,VERSION);
 assert.equal(require('../server.json').packages[0].version,VERSION);
});

test('tools discovery normalizes legacy PHP empty objects, preserves metadata/cursor',async t=>{
 const {client,calls}=await session(t,()=>json({tools:[{name:'get_balance',inputSchema:{type:'object',properties:[]},annotations:{readOnlyHint:true}}],nextCursor:'next'}));
 const result=await client.listTools({cursor:'token & ?'});
 assert.deepEqual(result.tools[0].inputSchema.properties,{});
 assert.equal(result.tools[0].annotations.readOnlyHint,true);
 assert.equal(result.nextCursor,'next');
 assert.equal(calls[0].url.searchParams.get('cursor'),'token & ?');
});

test('discovery failures remain visible for all list endpoints',async t=>{
 const {client}=await session(t,()=>json({error:'Temporarily unavailable'},503));
 for(const method of ['listTools','listPrompts','listResources']) await assert.rejects(client[method](),/HTTP 503/);
});

test('malformed tool schemas fail visibly instead of being advertised',async t=>{
 const {client}=await session(t,()=>json({tools:[{name:'broken',inputSchema:{type:'object',properties:['invalid']}}]}));
 await assert.rejects(client.listTools(),/invalid tools list/);
});

test('prompt arguments and resource URIs survive reserved characters',async t=>{
 const {client,calls}=await session(t,({url})=>url.pathname.endsWith('/prompts/get')
  ?json({description:'prompt',messages:[{role:'user',content:{type:'text',text:url.searchParams.get('arguments[site]')}}]})
  :json({contents:[{uri:url.searchParams.get('uri'),text:'reference'}]}));
 const value='https://example.com/a?x=1&y=two words#frag';
 const prompt=await client.getPrompt({name:'check-website-safety',arguments:{site:value}});
 assert.equal(prompt.messages[0].content.text,value);
 assert.equal(calls[0].url.searchParams.get('name'),'check-website-safety');
 const uri='gs://guide/threat-categories?x=1&y=2';
 assert.equal((await client.readResource({uri})).contents[0].uri,uri);
});

test('prompts and resources discovery pass cursors',async t=>{
 const {client,calls}=await session(t,({url})=>json(url.pathname.endsWith('/prompts')?{prompts:[],nextCursor:'p'}:{resources:[],nextCursor:'r'}));
 assert.equal((await client.listPrompts({cursor:'p&1'})).nextCursor,'p');
 assert.equal((await client.listResources({cursor:'r&2'})).nextCursor,'r');
 assert.equal(calls[0].url.searchParams.get('cursor'),'p&1');
 assert.equal(calls[1].url.searchParams.get('cursor'),'r&2');
});

test('all tools and aliases forward auth/arguments and retain structuredContent',async t=>{
 const {client,calls}=await session(t,()=>json(toolResult));
 for(const name of ['inspect_domain','check_domain_safety','get_domain_reputation','scan_url','get_balance']) {
  const args=name==='scan_url'?{url:'https://example.com/'}:name==='get_balance'?{}:{domain:'example.com'};
  const result=await client.callTool({name,arguments:args});
  assert.deepEqual(result.structuredContent,{ok:true});
  const sent=calls.at(-1); assert.deepEqual(JSON.parse(sent.options.body),{name,arguments:args});
  assert.equal(sent.options.headers.Authorization,'Bearer test-key');
  assert.equal(sent.options.method,'POST'); assert.equal(sent.options.redirect,'error');
 }
});

test('no API key produces a useful tool error without an HTTP request',async t=>{
 const {client,calls}=await session(t,()=>assert.fail('must not call HTTP'),{apiKey:'  '});
 const result=await client.callTool({name:'get_balance'});
 assert.equal(result.isError,true); assert.match(result.content[0].text,/GRIDINSOFT_API_KEY/); assert.equal(calls.length,0);
});

test('HTTP execution errors preserve typed MCP error content',async t=>{
 const result={content:[{type:'text',text:'Insufficient credits'}],isError:true,structuredContent:{required:10,available:0}};
 const {client}=await session(t,()=>json(result,402));
 assert.deepEqual(await client.callTool({name:'scan_url',arguments:{url:'https://example.com'}}),result);
});

test('HTTP JSON errors are readable and redact an echoed key',async t=>{
 const {client}=await session(t,()=>json({error:{message:'Invalid key test-key'}},401));
 const result=await client.callTool({name:'get_balance'});
 assert.equal(result.isError,true); assert.match(result.content[0].text,/HTTP 401.*\[redacted\]/);
 assert.doesNotMatch(result.content[0].text,/test-key/);
});

test('HTML errors and malformed success bodies become clean tool errors',async t=>{
 let n=0;
 const {client}=await session(t,()=>++n===1?new Response('<html>upstream dump</html>',{status:502}):json({result:'wrong'}));
 const html=await client.callTool({name:'get_balance'});
 assert.equal(html.isError,true); assert.match(html.content[0].text,/non-JSON.*HTTP 502/); assert.doesNotMatch(html.content[0].text,/html|dump/);
 const malformed=await client.callTool({name:'get_balance'}); assert.equal(malformed.isError,true); assert.match(malformed.content[0].text,/invalid tool result/);
});

test('HTTP timeout aborts once without repeating a paid request',async()=>{
 let calls=0;
 const api=new InspectorApi({apiKey:'test-key',timeoutMs:10,fetch:async(_,options)=>{
  calls++; return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
 }});
 const result=await callTool(api,'scan_url',{url:'https://example.com'});
 assert.equal(result.isError,true); assert.match(result.content[0].text,/timed out.*may still be running/); assert.equal(calls,1);
});

test('request cancellation aborts the upstream HTTP request',async()=>{
 const abort=new AbortController(); let upstream;
 const api=new InspectorApi({apiKey:'test-key',fetch:async(_,options)=>{
  upstream=options.signal;
  return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
 }});
 const request=api.call('/tools',undefined,abort.signal); abort.abort();
 await assert.rejects(request,/cancelled/); assert.equal(upstream.aborted,true);
});

test('timeout setting rejects invalid values',()=>{
 for(const timeoutMs of [0,-1,NaN,Infinity,1.5]) assert.throws(()=>new InspectorApi({apiKey:'',timeoutMs}),/positive integer/);
});

test('connection check authenticates without calling a tool and rejects malformed responses',async()=>{
 const calls=[];
 const api=new InspectorApi({apiKey:'test-key',fetch:async (url,options)=>{calls.push({url,options});return json({authenticated:true});}});
 await api.verifyConnection();
 assert.equal(calls.length,1);
 assert.equal(new URL(calls[0].url).pathname,'/mcp/v1/auth/check');
 assert.equal(calls[0].options.method,'GET');
 assert.equal(calls[0].options.body,undefined);
 assert.equal(calls[0].options.headers.Authorization,'Bearer test-key');
 const missing=new InspectorApi({apiKey:' ',fetch:()=>assert.fail('missing key must stay local')});
 await assert.rejects(missing.verifyConnection(),/GRIDINSOFT_API_KEY/);
 for(const response of [null,{}, {authenticated:false},{authenticated:'true'}]) {
  await assert.rejects(new InspectorApi({apiKey:'key',fetch:async()=>json(response)}).verifyConnection(),/invalid authentication check/);
 }
});

const fixture=path.join(__dirname,'mock-fetch.cjs');
const entry=path.join(__dirname,'../dist/index.js');
const env={PATH:process.env.PATH||'',GRIDINSOFT_API_KEY:'test-key'};
test('stdio startup rejects missing and invalid credentials before advertising a connection',()=>{
 for(const extra of [{GRIDINSOFT_API_KEY:''},{MCP_TEST_SCENARIO:'invalid-key'},{MCP_TEST_SCENARIO:'bad-auth-response'}]) {
  const result=spawnSync(process.execPath,['--require',fixture,entry],{env:{...env,...extra},encoding:'utf8',timeout:5000,input:''});
  assert.equal(result.status,1);
  assert.equal(result.stdout,'');
  assert.match(result.stderr,/GRIDINSOFT_API_KEY|HTTP 401|invalid authentication check/);
  assert.doesNotMatch(result.stderr,/test-key/);
 }
});

test('CLI connection diagnostic costs no credits and reports a useful exit status',()=>{
 const cli=extra=>spawnSync(process.execPath,['--require',fixture,entry,'--check'],{env:{...env,...extra},encoding:'utf8',timeout:5000});
 const success=cli({});
 assert.equal(success.status,0);
 assert.deepEqual(JSON.parse(success.stdout),{ok:true,version:VERSION,authenticated:true,credits_used:0});
 for(const extra of [{GRIDINSOFT_API_KEY:''},{MCP_TEST_SCENARIO:'invalid-key'}]) {
  const failure=cli(extra); assert.equal(failure.status,1); assert.equal(failure.stdout,'');
 }
});
test('real stdio child initializes, lists tools, and calls a tool without stdout contamination',async t=>{
 const client=new Client({name:'stdio-test',version:'1.0.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:['--require',fixture,entry],env,stderr:'pipe'});
 let stderr=''; transport.stderr?.on('data',chunk=>stderr+=chunk);
 t.after(()=>client.close());
 await client.connect(transport);
 assert.equal((await client.listTools()).tools[0].name,'get_balance');
 const result=await client.callTool({name:'get_balance',arguments:{}});
 assert.deepEqual(JSON.parse(result.content[0].text),{name:'get_balance',arguments:{}});
 assert.equal(stderr,'');
});

test('CLI reports success/error exit codes and rejects ambiguous arguments',()=>{
 const cli=(args,extra={})=>spawnSync(process.execPath,['--require',fixture,entry,...args],{env:{...env,...extra},encoding:'utf8',timeout:5000});
 const success=cli(['check','example.com']); assert.equal(success.status,0); assert.equal(JSON.parse(success.stdout).isError,false);
 const failure=cli(['scan','https://example.com'],{MCP_TEST_SCENARIO:'tool-error'}); assert.equal(failure.status,1); assert.equal(JSON.parse(failure.stdout).isError,true);
 const missing=cli(['check','example.com'],{GRIDINSOFT_API_KEY:''}); assert.equal(missing.status,1);
 for(const args of [['nonsense'],['check'],['check','example.com','scan'],['--unknown']]) { const result=cli(args); assert.equal(result.status,1);assert.match(result.stderr,/Invalid arguments/); }
 const version=cli(['--version']); assert.equal(version.stdout.trim(),VERSION);assert.equal(version.status,0);
 assert.match(cli(['--help']).stdout,/scan URL/);
});
