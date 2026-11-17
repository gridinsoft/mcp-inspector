# Development and testing

Use Node.js 22 or newer.

```sh
npm ci
npm test
npm run build
npm pack --dry-run
```

The tests cover MCP initialization, discovery, prompts, resources, tool aliases, authentication, errors, cancellation, timeouts, stdio framing, and CLI exit codes.

Maintainers with an Inspector backend checkout and its Composer dependencies can also run:

```sh
INSPECTOR_TEST_ROOT=/path/to/inspector node --test test/php-integration.cjs
```

This integration test uses a local fixture and synthetic authentication. It does not load production settings or perform paid scans.

See [the evaluation guide](eval/README.md) for the 30-scenario tool-selection benchmark and OAuth/HTTP protocol check. Synthetic benchmarks measure behavior in their stated test environment; dry runs do not provide model measurements.
