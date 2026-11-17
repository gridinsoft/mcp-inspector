// Preload only for subprocess tests. No external HTTP requests are performed.
globalThis.fetch=async (input,options)=>{
 const url=new URL(input);
 if(url.pathname.endsWith('/auth/check')) {
  if(process.env.MCP_TEST_SCENARIO==='invalid-key') return Response.json({error:'Unauthorized'},{status:401});
  if(process.env.MCP_TEST_SCENARIO==='bad-auth-response') return Response.json({authenticated:false});
  return Response.json({authenticated:true});
 }
 if(process.env.MCP_TEST_SCENARIO==='tool-error') return Response.json({content:[{type:'text',text:'Insufficient credits'}],isError:true},{status:402});
 if(url.pathname.endsWith('/tools')) return Response.json({tools:[{name:'get_balance',description:'Balance',inputSchema:{type:'object',properties:[]}}]});
 if(url.pathname.endsWith('/prompts')) return Response.json({prompts:[]});
 if(url.pathname.endsWith('/resources')) return Response.json({resources:[]});
 return Response.json({content:[{type:'text',text:JSON.stringify(JSON.parse(options.body))}],structuredContent:{ok:true},isError:false});
};
