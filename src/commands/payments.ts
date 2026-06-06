import { Command } from "commander"
import { resolveConfig } from "../config"
import { request, requestUnchecked } from "../http"
import { table, json as jsonOut, success, error } from "../output"

// ─── mailgent pay <url> ─────────────────────────────────────────────────────

export const payCommand = new Command("pay")
  .description("Pay an x402-protected URL in USDC")
  .argument("<url>", "URL of the paid resource (must respond with HTTP 402)")
  .option("--dry-run", "Validate mandate + balance + caps without spending")
  .option("--json", "Output the raw JSON response")
  .action(async (url, opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const body: Record<string, unknown> = { url }
    if (opts.dryRun) body.dryRun = true

    const result = await requestUnchecked<any>(
      config.baseUrl,
      config.apiKey,
      "POST",
      "/v0/payments/pay",
      body,
    )

    if (opts.json) return jsonOut(result)

    if (!result || typeof result !== "object" || !("ok" in result)) {
      // Likely an auth-layer rejection (401/403) — the route returns
      // `{ error, message, status }` before the pay flow runs.
      const status = (result as { status?: number } | null)?.status
      const errCode = (result as { error?: string } | null)?.error
      const msg = (result as { message?: string } | null)?.message
      if (status === 403 || errCode === "forbidden") {
        error(`${msg ?? "Forbidden"}`)
        console.error("\n`mailgent pay` requires a BUYER project (payments:spend scope).")
        console.error("If this key lacks the scope, create a BUYER project at https://console.mailgent.dev")
        console.error("or rotate this key to add the scope. Project type is set at create time.")
      } else {
        error("Unexpected response from /v0/payments/pay")
        jsonOut(result)
      }
      process.exit(1)
    }

    if (!result.ok) {
      error(`${result.code} — ${result.message}`)
      if (result.hint) console.error(`  hint: ${result.hint}`)
      process.exit(1)
    }

    success(`Paid $${result.cost.amountUsdc} → ${result.txHash ?? "(dry run)"}`)
    console.log(`  payer:     ${result.payer}`)
    console.log(`  recipient: ${result.recipient}`)
    console.log(`  remaining: $${formatRaw(result.mandate.remainingTodayUsdcRaw)} today`)
    console.log("")
    console.log("Content:")
    if (result.content !== undefined) console.log(JSON.stringify(result.content, null, 2))
    else if (result.contentText) console.log(result.contentText)
  })

// ─── mailgent activity ──────────────────────────────────────────────────────

export const activityCommand = new Command("activity")
  .description("Bank-statement-style merged feed of payments sent and received")
  .option("--limit <n>", "Max rows (default 50, max 200)", "50")
  .option("--json", "Output as JSON")
  .action(async (opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const data = await request<any>(
      config.baseUrl,
      config.apiKey,
      "GET",
      `/v0/payments/activity?limit=${encodeURIComponent(opts.limit)}`,
    )

    if (opts.json) return jsonOut(data)
    if (!data.activity?.length) return console.log("No payment activity yet.")

    table(
      ["Date", "Dir", "Amount USDC", "Counterparty", "Status", "Tx"],
      data.activity.map((r: any) => [
        new Date(r.createdAt).toISOString().slice(0, 10),
        r.direction === "out" ? "→ out" : "← in",
        formatRaw(r.amountUsdcRaw),
        truncate(r.counterparty, 14),
        r.status,
        r.txHash ? truncate(r.txHash, 14) : "—",
      ]),
    )
  })

// ─── mailgent mandate <subcommand> ──────────────────────────────────────────

export const mandateCommand = new Command("mandate").description(
  "Manage spend mandates (per-call + daily caps on this identity's wallet)",
)

mandateCommand
  .command("create")
  .description("Create a mandate. First call installs an on-chain session key (~10–30s).")
  .option("--max-per-call <usdc>", "Max USDC per single pay() call", "0.10")
  .option("--daily-cap <usdc>", "Max cumulative USDC per UTC day", "1.00")
  .option("--valid-until <iso>", "Expiry ISO 8601 (defaults to +7d)")
  .option("--json", "Output as JSON")
  .action(async (opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const body: Record<string, unknown> = {
      maxPerCallUsdc: opts.maxPerCall,
      dailyCapUsdc: opts.dailyCap,
    }
    if (opts.validUntil) body.validUntil = opts.validUntil

    const data = await request<any>(
      config.baseUrl,
      config.apiKey,
      "POST",
      "/v0/payments/mandates",
      body,
    )

    if (opts.json) return jsonOut(data)

    if (data.installError) {
      error(`Install failed: ${data.installError}`)
      error("Mandate is unusable. Retry `mailgent mandate create`.")
      process.exit(1)
    }

    success(`Mandate ${data.mandateId} created`)
    console.log(`  max per call: $${data.maxPerCallUsdc}`)
    console.log(`  daily cap:    $${data.dailyCapUsdc}`)
    console.log(`  valid until:  ${data.validUntil}`)
    console.log(`  session key:  ${data.sessionKeyAddress}`)
    if (data.installTxHash) console.log(`  install tx:   ${data.installTxHash}`)
  })

mandateCommand
  .command("list")
  .description("List mandates for this identity (active, expired, revoked, errored).")
  .option("--json", "Output as JSON")
  .action(async (opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const data = await request<any>(
      config.baseUrl,
      config.apiKey,
      "GET",
      "/v0/payments/mandates",
    )

    if (opts.json) return jsonOut(data)
    if (!data.mandates?.length) return console.log("No mandates. Create one with `mailgent mandate create`.")

    table(
      ["Mandate ID", "Max/call", "Daily cap", "Today", "State", "Valid until"],
      data.mandates.map((m: any) => [
        m.mandateId,
        `$${m.maxPerCallUsdc}`,
        `$${m.dailyCapUsdc}`,
        `$${m.spentTodayUsdc}/$${m.dailyCapUsdc}`,
        mandateState(m),
        new Date(m.validUntil).toISOString().slice(0, 10),
      ]),
    )
  })

mandateCommand
  .command("get <mandateId>")
  .description("Fetch one mandate with live spend counters.")
  .option("--json", "Output as JSON")
  .action(async (mandateId, opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const data = await request<any>(
      config.baseUrl,
      config.apiKey,
      "GET",
      `/v0/payments/mandates/${encodeURIComponent(mandateId)}`,
    )

    if (opts.json) return jsonOut(data)

    table(["Field", "Value"], [
      ["Mandate ID", data.mandateId],
      ["State", mandateState(data)],
      ["Max per call", `$${data.maxPerCallUsdc}`],
      ["Daily cap", `$${data.dailyCapUsdc}`],
      ["Spent today", `$${data.spentTodayUsdc}`],
      ["Remaining today", `$${data.remainingTodayUsdc}`],
      ["Total spent", `$${data.totalSpentUsdc}`],
      ["Call count", String(data.callCount)],
      ["Session key", data.sessionKeyAddress],
      ["Valid until", data.validUntil],
      ["Created", data.createdAt],
      ["Revoked at", data.revokedAt ?? "—"],
      ["Install error", data.installError ?? "—"],
    ])
  })

mandateCommand
  .command("revoke <mandateId>")
  .description("Revoke a mandate. Settled payments are unaffected; the on-chain session key is not uninstalled.")
  .action(async (mandateId, _opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    await request(
      config.baseUrl,
      config.apiKey,
      "DELETE",
      `/v0/payments/mandates/${encodeURIComponent(mandateId)}`,
    )
    success(`Revoked mandate ${mandateId}`)
  })

// ─── helpers ───────────────────────────────────────────────────────────────

function formatRaw(usdcRaw: string | bigint): string {
  // Raw USDC = 6 decimals. e.g. "50000" → "0.05".
  try {
    const n = typeof usdcRaw === "bigint" ? usdcRaw : BigInt(usdcRaw)
    const whole = n / 1_000_000n
    const frac = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "")
    return frac ? `${whole}.${frac}` : `${whole}`
  } catch {
    return String(usdcRaw)
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}

function mandateState(m: any): string {
  if (m.revokedAt) return "revoked"
  if (m.installError) return "install-error"
  if (!m.onchainInstalled) return "installing"
  if (new Date(m.validUntil).getTime() < Date.now()) return "expired"
  return "active"
}
