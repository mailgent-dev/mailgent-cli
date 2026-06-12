# @mailgent-dev/cli

The official CLI for the [Mailgent API](https://mailgent.dev) — identity infrastructure for AI agents.

[![npm](https://img.shields.io/npm/v/@mailgent-dev/cli)](https://www.npmjs.com/package/@mailgent-dev/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Install

```bash
npm install -g @mailgent-dev/cli
```

Requires Node.js 18 or later.

## Quick Start

```bash
# Set your API key
export MAILGENT_API_KEY=your_api_key

# Verify your identity
mailgent whoami
```

## Authentication

Pass your API key in one of two ways:

```bash
# Environment variable (recommended)
export MAILGENT_API_KEY=your_api_key

# Or per-command flag
mailgent whoami --api-key your_api_key
```

## Commands

### Identity

```bash
mailgent whoami                          # Show identity info
```

### Mail

```bash
mailgent mail send --to a@b.com --subject "Hi" --text "Hello"
mailgent mail list [--limit 20] [--labels inbox]
mailgent mail get <messageId>
mailgent mail reply <messageId> --text "Reply"
mailgent mail labels <messageId> --add important
mailgent mail delete <messageId>
```

### Threads

```bash
mailgent threads list [--limit 20]
mailgent threads get <threadId>
mailgent threads delete <threadId>
```

### Vault

```bash
mailgent vault list
mailgent vault get <name>
mailgent vault delete <name>
mailgent vault totp <name>               # Get TOTP code

# Generic store — for any credential type
mailgent vault store <name> --type API_KEY --data '{"key":"sk_..."}'

# Typed helpers (encrypted at rest)
mailgent vault store-api-key stripe --secret sk_live_...
mailgent vault store-api-key twitter --client-id abc123 --secret def456
mailgent vault store-card personal-visa \
  --cardholder "Jane Doe" \
  --number "4242 4242 4242 4242" \
  --exp-month 12 --exp-year 2029 --cvc 123 \
  --zip 94103 --brand Visa
mailgent vault store-address home \
  --recipient "Autonomous Agent" \
  --line1 "1 Demo Way" \
  --city "San Francisco" --state CA --postcode 94103 --country US \
  --phone "+1-555-0100"
```

Credential types: `LOGIN`, `API_KEY`, `OAUTH`, `TOTP`, `SSH_KEY`, `DATABASE`, `SMTP`, `AWS`, `CERTIFICATE`, `CARD`, `SHIPPING_ADDRESS`, `CUSTOM`. The vault is password-manager-style secret storage (AES-256-GCM at rest), not a payment processor.

### Logs

```bash
mailgent logs list [--category mail] [--status error]
mailgent logs stats
```

### DID

```bash
mailgent did resolve <identityId>        # Resolve DID document
mailgent did domain                      # Resolve domain DID
```

### Payments

```bash
mailgent pay <url>                       # Pay an x402-protected URL in USDC
mailgent activity                        # Merged feed of payments sent and received
mailgent mandate create                  # Create a spend mandate (per-call + daily caps)
mailgent mandate list
mailgent mandate get <mandateId>
mailgent mandate revoke <mandateId>
```

### Slack

```bash
mailgent slack status                    # Show connection status
mailgent slack connect                   # Get the install URL to connect a workspace
mailgent slack disconnect
mailgent slack channels                  # List channels
mailgent slack send <channel> <text> [--thread <ts>]
mailgent slack messages [--channel C…] [--since ISO] [--limit 50]
```

### Social

```bash
mailgent social accounts                 # List connected accounts
mailgent social post <text> [--platforms x,linkedin] [--media url,url] [--schedule ISO]
mailgent social posts [--limit 20]
mailgent social status <postId>
```

Connecting social accounts is console-only: Settings → Integrations at [console.mailgent.dev](https://console.mailgent.dev).

## Global Options

| Flag | Description |
| --- | --- |
| `--api-key <key>` | API key (or set `MAILGENT_API_KEY` env var) |
| `--base-url <url>` | API base URL (or set `MAILGENT_API_URL` env var) |
| `--json` | Output as JSON |
| `--help` | Show help |
| `--version` | Show version |

## JSON Output

Most commands support the `--json` flag for machine-readable output:

```bash
mailgent whoami --json
mailgent mail list --json
mailgent vault list --json
```

## Links

- [Documentation](https://docs.mailgent.dev)
- [Website](https://mailgent.dev)

## License

MIT
</content>
</invoke>
