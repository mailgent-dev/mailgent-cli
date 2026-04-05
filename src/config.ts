export interface CliConfig {
  apiKey: string
  baseUrl: string
}

export function resolveConfig(opts: { apiKey?: string; baseUrl?: string }): CliConfig {
  const apiKey = opts.apiKey || process.env.LOOMAL_API_KEY
  if (!apiKey) {
    console.error("Error: API key required. Use --api-key or set LOOMAL_API_KEY env var.")
    process.exit(1)
  }

  return {
    apiKey,
    baseUrl: opts.baseUrl || process.env.LOOMAL_API_URL || "https://api.loomal.ai",
  }
}
