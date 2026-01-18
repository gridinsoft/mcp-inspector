# @gridinsoft/mcp-inspector

MCP (Model Context Protocol) server for domain and URL security analysis powered by [GridinSoft Inspector](https://inspector.gridinsoft.com).

## 🛡️ Trust & Safety for AI

This MCP server allows your AI agent (Claude, Cursor, etc.) to verify any website or link. It helps answer the critical question: "**Can I trust this site?**"

## ✨ Key Features

- **Domain Reputation** - Check if a site is well-known, safe, or suspicious.
- **Phishing Detection** - Identify fraudulent pages designed to steal credentials.
- **Malware Scanning** - Detect links hosting harmful files or scripts.
- **Real-time Engine** - Access GridinSoft's global threat database.

## 🎁 Free Plan

Every new account gets **100 API credits per month for free**. No credit card required.

## 🚀 Use Cases

The GridinSoft MCP is useful far beyond simple coding assistance:

- **Security Research**: Automate the analysis of suspicious domains mentioned in your research.
- **Email Verification**: Ask your AI to check all links in a suspicious email body.
- **DevSecOps**: Verify third-party dependencies or documentation links during development.
- **Safe Browsing**: Get a verdict before clicking on shortened or unknown URLs.

## 🛠️ Connection Guide

### 1. Get your API Key

1. Sign up at [inspector.gridinsoft.com](https://inspector.gridinsoft.com/login).
2. Grab your key from the [Profile page](https://inspector.gridinsoft.com/profile).

### 2. Connect to your AI

#### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gridinsoft": {
      "command": "npx",
      "args": ["-y", "@gridinsoft/mcp-inspector"],
      "env": {
        "GRIDINSOFT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Cursor or Windsurf IDE

1. Open **Settings** -> **Models** -> **MCP**.
2. Add a new command: `npx -y @gridinsoft/mcp-inspector`.
3. Set environment variable `GRIDINSOFT_API_KEY`.

## 🤖 Example Prompts

Try asking your AI these questions:

- _"Is the domain `example-crypto-site.com` safe to use?"_
- _"I received a link to `http://bit.ly/xxxx`. Scan it for phishing before I open it."_
- _"What is the reputation of `gridinsoft.com`?"_
- _"Should I trust this website? It looks like a login page but the URL is strange."_

## 🔧 Available Tools

### `inspect_domain`

Comprehensive domain security profile. Returns reputation (0-100), vendor verdicts, hosting/IP info, registrar history, and detailed security tags.

- **Web Version**: [inspector.gridinsoft.com/domain-checker](https://inspector.gridinsoft.com/domain-checker)
- **Input**: `{ "domain": "example.com" }`
- **Cost**: 3 credits

### `scan_url`

Deep forensic URL analysis. Extracts metadata, effective URL, full redirect chain, DNS/SSL details, and forensic data (screenshots, network traffic, cookies, console logs for paid plans).

- **Web Version**: [inspector.gridinsoft.com/url-scanner](https://inspector.gridinsoft.com/url-scanner)
- **Input**: `{ "url": "https://example.com/login" }`
- **Cost**: 10 credits

### `get_balance`

Check your remaining credits and current subscription status.

- **Cost**: Free

## 📊 Pricing

- **Free**: 100 credits/mo ($0)
- **Basic**: 1,500 credits/mo (~$44/mo)
- **Standard**: 5,000 credits/mo (~$124/mo)

_Sign in to your dashboard to view all available plans and detailed comparison._

## 🔗 Links

- [Official Website](https://inspector.gridinsoft.com)
- [Website Reputation Checker](https://gridinsoft.com/website-reputation-checker)
- [NPM Package](https://www.npmjs.com/package/@gridinsoft/mcp-inspector)

## License

MIT
