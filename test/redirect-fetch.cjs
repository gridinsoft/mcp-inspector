// Integration-test preload: route the fixed production API URL to the local PHP
// candidate and deliberately omit credentials. Never loaded by the package.
const actualFetch=globalThis.fetch;
globalThis.fetch=(input,options)=>{
 const url=new URL(input);
 if(url.origin!=='https://inspector.gridinsoft.com') throw Error('Unexpected API origin');
 const headers={...options.headers};
 delete headers.Authorization;
 return actualFetch(process.env.MCP_TEST_API_ORIGIN+url.pathname+url.search,{...options,headers});
};
