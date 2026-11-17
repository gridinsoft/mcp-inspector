# Inspector tool-selection evaluation

Thirty synthetic scenarios compare the npm 1.0.8 catalog with remote MCP 1.1.0: explicit and implicit website trust, page scans, balance questions, unrelated tasks, declined setup, expired authorization, unknown results, and malicious text in a tool result.

No Inspector tool is executed. All tool results are fixtures, so Inspector credit cost is zero. A real run makes up to 120 model API requests (two variants, at most two responses per scenario), each capped at 700 output tokens. Model API billing still applies. No automatic retries are made.

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
