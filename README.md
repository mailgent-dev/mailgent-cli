# loomal-cli

The official CLI for the [Loomal API](https://loomal.ai) — identity infrastructure for AI agents.

## Install

```bash
npm install -g loomal-cli
```

Requires Node.js 18 or later.

## Quick Start

```bash
# Set your API key
export LOOMAL_API_KEY=your_api_key

# Verify your identity
loomal whoami
```

## Authentication

Pass your API key in one of two ways:

```bash
# Environment variable (recommended)
export LOOMAL_API_KEY=your_api_key

# Or per-command flag
loomal whoami --api-key your_api_key
```

## Commands

### Identity

```bash
loomal whoami                          # Show identity info
```

### Mail

```bash
loomal mail send --to a@b.com --subject "Hi" --text "Hello"
loomal mail list [--limit 20] [--labels inbox]
loomal mail get <messageId>
loomal mail reply <messageId> --text "Reply"
loomal mail labels <messageId> --add important
loomal mail delete <messageId>
```

### Threads

```bash
loomal threads list [--limit 20]
loomal threads get <threadId>
loomal threads delete <threadId>
```

### Vault

```bash
loomal vault list
loomal vault get <name>
loomal vault store <name> --type API_KEY --data '{"key":"sk_..."}'
loomal vault delete <name>
loomal vault totp <name>               # Get TOTP code
```

### Logs

```bash
loomal logs list [--category mail] [--status error]
loomal logs stats
```

### DID

```bash
loomal did resolve <identityId>        # Resolve DID document
loomal did domain                      # Resolve domain DID
```

## Global Options

| Flag | Description |
| --- | --- |
| `--api-key <key>` | API key (or set `LOOMAL_API_KEY` env var) |
| `--base-url <url>` | API base URL (or set `LOOMAL_API_URL` env var) |
| `--json` | Output as JSON |
| `--help` | Show help |
| `--version` | Show version |

## JSON Output

Most commands support the `--json` flag for machine-readable output:

```bash
loomal whoami --json
loomal mail list --json
loomal vault list --json
```

## Links

- [Documentation](https://docs.loomal.ai)
- [Website](https://loomal.ai)
- [Node.js SDK](https://github.com/loomal-ai/nodejs-sdk)

## License

MIT
