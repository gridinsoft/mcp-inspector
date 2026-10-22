const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
const {Client}=require('@modelcontextprotocol/sdk/client/index.js');
const {StdioClientTransport}=require('@modelcontextprotocol/sdk/client/stdio.js');

test('stdio executable -> real HTTP -> real candidate PHP routes and controller',async t=>{
 const backend=process.env.INSPECTOR_TEST_ROOT||path.resolve(__dirname,'../../inspector-mcp-fix-20261022');
 const port=await new Promise((resolve,reject)=>{
  const socket=net.createServer();socket.on('error',reject);socket.listen(0,'127.0.0.1',()=>{const value=socket.address().port;socket.close(()=>resolve(value));});
 });
 const origin=`http://127.0.0.1:${port}`;
 const php=spawn('php',['-S',`127.0.0.1:${port}`,path.join(__dirname,'php-router.php')],{env:{PATH:process.env.PATH,INSPECTOR_TEST_ROOT:backend},stdio:['ignore','ignore','pipe']});
 let logs='';php.stderr.on('data',data=>logs+=data);
 t.after(()=>php.kill());
 await new Promise((resolve,reject)=>{
  const ready=data=>{if(data.toString().includes('Development Server'))resolve();};
  php.stderr.on('data',ready);php.once('error',reject);php.once('exit',code=>reject(Error(`PHP exited ${code}: ${logs}`)));
 });
 const transport=new StdioClientTransport({command:process.execPath,args:['--require',path.join(__dirname,'redirect-fetch.cjs'),path.join(__dirname,'../dist/index.js')],env:{PATH:process.env.PATH,MCP_TEST_API_ORIGIN:origin,GRIDINSOFT_API_KEY:'integration-placeholder'},stderr:'pipe'});
 const client=new Client({name:'real-backend-test',version:'1.0.0'});t.after(()=>client.close());
 await client.connect(transport);
 const tools=await client.listTools();assert.equal(tools.tools.length,5);
 assert.deepEqual(tools.tools.find(t=>t.name==='get_balance').inputSchema.properties,{});
 const prompts=await client.listPrompts();assert.equal(prompts.prompts.length,2);
 for(const [name,key,value] of [
  ['check-website-safety','site','https://example.com/?a=1&b=two words#fragment'],
  ['verify-domain-trust','domain','example.com'],
  ['website-safety-analysis','site','https://example.com/alias'],
  ['domain-trust-report','domain','example.org']
 ]) {
  const result=await client.getPrompt({name,arguments:{[key]:value}});
  assert.ok(result.messages[0].content.text.includes(JSON.stringify(value).replaceAll('/','\\/')));
  assert.doesNotMatch(result.messages[0].content.text,/\{\{(?:site|domain)\}\}/);
 }
 await assert.rejects(client.getPrompt({name:'verify-domain-trust'}),/HTTP 400/);
 await assert.rejects(client.getPrompt({name:'unknown',arguments:{domain:'example.com'}}),/HTTP 404/);
 const resources=await client.listResources();assert.equal(resources.resources.length,1);
 const resource=await client.readResource({uri:resources.resources[0].uri});
 assert.match(resource.contents[0].text,/Content category/);
 await assert.rejects(client.readResource({uri:'gs://unknown'}),/HTTP 404/);
 const unauthorized=await client.callTool({name:'get_balance',arguments:{}});
 assert.equal(unauthorized.isError,true);assert.match(unauthorized.content[0].text,/HTTP 401.*Unauthorized/);
 const wrongMethod=await fetch(`${origin}/mcp/v1/tools/call`);
 assert.equal(wrongMethod.status,405);assert.equal(wrongMethod.headers.get('allow'),'POST');
 assert.equal((await wrongMethod.json()).error,'Method not allowed');
 assert.doesNotMatch(logs,/Fatal error|Warning:/);
});
