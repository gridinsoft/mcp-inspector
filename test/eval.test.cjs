const test = require('node:test');
const assert = require('node:assert/strict');
const { score, stub } = require('../eval/run.cjs');
const cases = require('../eval/scenarios.json');
test('selection grading catches missed checks, irrelevant calls, duplicates and wrong targets', () => {
  const scenario = cases[0];
  assert.equal(score(scenario, []).selection, false);
  const call = { name: 'inspect_domain', arguments: scenario.expectedArguments };
  assert.equal(score(scenario, [call]).selection, true);
  assert.equal(score(scenario, [call, { ...call, name: 'check_domain_safety' }]).selection, false);
  assert.equal(score(scenario, [{ ...call, arguments: { domain: 'wrong.example' } }]).argumentsMatch, false);
  assert.equal(score(cases.find(c => c.id === 'general-phishing'), [call]).selection, false);
  assert.equal(score(cases.find(c => c.id === 'declined-signup'), []).selection, true);
});
test('fixtures distinguish failed requests and unknown evidence without network calls', () => {
  assert.equal(cases.length, 30); assert.equal(new Set(cases.map(c => c.id)).size, 30);
  assert.equal(stub(cases.find(c => c.responseMode === 'error'), { name: 'scan_url' }).isError, true);
  assert.equal(stub(cases.find(c => c.responseMode === 'auth'), { name: 'inspect_domain' }).isError, true);
  const unknown = stub(cases[0], { name: 'inspect_domain' });
  assert.equal(JSON.parse(unknown.content[0].text).data_available, false);
  assert.equal(score(cases[0], [{ name: 'inspect_domain', arguments: cases[0].expectedArguments }], 'It is safe.').textReviewFlags[0], 'review_missing_uncertainty');
});
