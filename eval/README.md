# Inspector tool-selection evaluation

Thirty synthetic scenarios compare the npm 1.0.8 catalog with remote MCP 1.1.0: explicit and implicit website trust, page scans, balance questions, unrelated tasks, declined setup, expired authorization, unknown results, and malicious text in a tool result.

No real Inspector tool is executed. All tool results are fixtures, so Inspector credit cost is zero. The Chat Completions backend makes up to 120 model API requests (two variants, at most two responses per scenario), each capped at 700 output tokens. Model API billing still applies. No automatic retries are made.

```sh
npm ci
node eval/run.cjs --dry-run --output eval/results/plan.json

# Use your own supported model and an API key supplied by your local secret store.
export EVAL_MODEL='your-model-id'
# OPENAI_API_KEY or EVAL_API_KEY_FILE must be set locally; never send a key in chat.
node eval/run.cjs --output eval/results/comparison.json
```

`EVAL_BASE_URL` optionally selects another OpenAI-compatible HTTPS Chat Completions endpoint. `EVAL_VARIANT=baseline` or `candidate` runs one variant. These values are never guessed. With no model/key, the runner writes `not_run_missing_model_access`, leaves metrics null, and exits 2. Dry-run results are not model measurements.

Review the report's relevant-tool selection, negative controls, argument targets, duplicate calls, and every answer flagged for review. Tool calls are graded structurally; text regexes are only triage. Human review must confirm that Unknown was not presented as safe, no check was fabricated, and setup guidance never requests secrets in chat. A single run is a diagnostic, not a statistically reliable claim of improvement. Repeat both variants with the same model/version before comparing changes.

`catalog.json` is exported from the backend's `tests/fixtures/mcp-eval-catalog.php`. The report records its SHA-256. Refresh that fixture whenever model-visible server descriptions change.

Separately, `MCP_TEST_ORIGIN=http://127.0.0.1:18767 node test/remote-http.cjs` exercises the actual remote server and OAuth controllers through the official MCP SDK using the backend's loopback-only `tests/fixtures/mcp-oauth-http.php`. That protocol check is not a model-selection benchmark.

## Use an existing Codex sign-in locally

A local run can use saved Codex authentication (including ChatGPT sign-in),
without an OpenAI API key. This is a separate **Codex client benchmark**;
results must not be labeled as a Chat Completions API run.

```sh
codex login status
EVAL_BACKEND=codex EVAL_MODEL=gpt-6-astra npm run eval -- --output /tmp/inspector-codex-eval.json
```

On macOS the runner prefers the CLI bundled with `/Applications/Codex.app`
when present. This avoids an older Homebrew CLI rejecting a model supported
by the app. Set `EVAL_CODEX_BIN` to choose another installed CLI. The runner
records the CLI version, explicit model, reasoning effort, and catalogue hash.
It never reads, copies, or prints authentication files. Update/sign in through
Codex itself if access fails; do not paste credentials into chat.

Use `EVAL_VARIANT=candidate` or `baseline` to limit a run, `--case shop-explicit`
for one scenario, or `--dry-run` to prepare the plan without model requests.
Set `EVAL_CONCURRENCY` from 1 (default) to 3 for concurrent scenarios.
Both variants run 30 scenarios each: at most 60 model sessions, each limited
to 120 seconds. There are no automatic retries. Progress is saved after each
case; failures leave an `incomplete` report. Model use counts against the
connected account's Codex allowance.

The runner starts an isolated local stdio MCP fixture with the exact catalogue.
It returns synthetic Unknown, error, authentication, or balance responses and
never calls Inspector or spends Inspector credits. Only this local fixture
is pre-approved for the invocation. User configuration, project instructions,
shell tools, browsing, plugins, hooks, and multi-agent features are disabled;
the read-only sandbox remains enabled. No settings in the user's MCP client
are changed. Event logs and actual mock-server calls are retained beside the
report for audit. The benchmark has no competing tools. Both variants receive the same
explicit context that `.example` targets are anonymized ordinary public
websites and tool results are synthetic; this avoids counting a valid refusal
to investigate a documentation-only suffix as a tool-selection error. Read every answer
before interpreting the scores or comparing variants.

For a persistent local choice, create gitignored `eval/local.json` (no secrets):

```json
{"backend":"codex","model":"gpt-6-astra","concurrency":3}
```

Then `npm run eval` uses that configuration. Environment variables take precedence;
`EVAL_BACKEND=api` explicitly chooses the API backend. Optional `codexBin` selects
an installed executable. Unknown settings are rejected; API keys do not belong
in this file.

Codex's supported mechanisms: [non-interactive runs and saved authentication](https://learn.chatgpt.com/docs/non-interactive-mode),
[MCP instructions and per-server tool approval](https://learn.chatgpt.com/docs/extend/mcp).
