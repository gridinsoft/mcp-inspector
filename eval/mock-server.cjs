#!/usr/bin/env node
// Synthetic MCP only: no network, account access, or Inspector credit usage.
const fs = require('node:fs');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { stub } = require('./run.cjs');
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const server = new Server({ name: 'gridinsoft-inspector', version: '1.1.0-eval' }, {
  capabilities: { tools: {} }, instructions: input.catalog.instructions
});
let calls = 0;
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: input.catalog.tools }));
server.setRequestHandler(CallToolRequestSchema, async request => {
  const call = { name: request.params.name, arguments: request.params.arguments || {} };
  fs.appendFileSync(input.callsFile, JSON.stringify(call) + '\n');
  if (++calls > 3) throw Error('Synthetic evaluation tool-call limit reached. Finish with the available evidence.');
  if (!input.catalog.tools.some(tool => tool.name === call.name)) throw Error('Unknown evaluation tool');
  return stub(input.scenario, call);
});
server.connect(new StdioServerTransport()).catch(error => { console.error(error.message); process.exitCode = 1; });
