export interface CliConfig {
  apiKey: string
  baseUrl: string
}

export function resolveConfig(opts: { apiKey?: string; baseUrl?: string }): CliConfig {
  const apiKey = opts.apiKey || process.env.MAILGENT_API_KEY
  if (!apiKey) {
    console.error("Error: API key required. Use --api-key or set MAILGENT_API_KEY env var.")
    process.exit(1)
  }

  return {
    apiKey,
    baseUrl: opts.baseUrl || process.env.MAILGENT_API_URL || "https://api.mailgent.dev",
  }
}
