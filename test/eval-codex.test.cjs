const test = require('node:test');
const assert = require('node:assert/strict');
const { parseEvents, summarizeEvents } = require('../eval/codex.cjs');

test('Codex evaluation distinguishes a completed answer from an interrupted session', () => {
  const events = parseEvents([
    {type:'thread.started',thread_id:'example'},
    {type:'item.completed',item:{type:'agent_message',text:'Unknown is not evidence of safety.'}},
    {type:'turn.completed',usage:{input_tokens:100,output_tokens:12}}
  ].map(JSON.stringify).join('\n') + '\n');
  const summary = summarizeEvents(events);
  assert.equal(summary.completed,true);
  assert.equal(summary.answer,'Unknown is not evidence of safety.');
  assert.deepEqual(summary.usage,[{input_tokens:100,output_tokens:12}]);
  const failed = summarizeEvents([{type:'turn.failed',error:{message:'Authentication required'}}]);
  assert.equal(failed.completed,false);
  assert.deepEqual(failed.errors,['Authentication required']);
});

test('Codex evaluation flags unexpected external execution instead of scoring it silently', () => {
  const summary = summarizeEvents([{type:'item.completed',item:{type:'command_execution',command:'example'}},{type:'item.completed',item:{type:'mcp_tool_call',server:'gridinsoft',tool:'inspect_domain'}}]);
  assert.deepEqual(summary.unexpectedTools,['command_execution']);
  assert.throws(() => parseEvents('not valid JSON'));
});
