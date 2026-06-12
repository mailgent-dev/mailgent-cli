import { Command } from "commander"
import { resolveConfig } from "../config"
import { request } from "../http"
import { table, json as jsonOut, success } from "../output"

export const socialCommand = new Command("social").description("Social media operations")

const truncate = (text: string, max = 50): string =>
  text.length > max ? `${text.slice(0, max - 3)}...` : text

socialCommand
  .command("connect")
  .description("Connect a social account (console only)")
  .action(() => {
    console.log("Connect accounts in the console: Settings → Integrations")
  })

socialCommand
  .command("accounts")
  .description("List connected social accounts")
  .option("--json", "Output as JSON")
  .action(async (opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const data = await request<any>(config.baseUrl, config.apiKey, "GET", "/v0/social/accounts")
    if (opts.json) return jsonOut(data)
    if (!data.accounts?.length) {
      console.log("No social accounts connected.")
      console.log("Connect accounts in the console: Settings → Integrations")
      return
    }
    table(
      ["Platform", "Handle", "Status"],
      data.accounts.map((a: any) => [
        a.platform,
        a.handle || a.username || "—",
        a.status || "—",
      ]),
    )
  })

socialCommand
  .command("post <text>")
  .description("Create a social post")
  .option("--platforms <list>", "Comma-separated platforms (e.g. x,linkedin)")
  .option("--media <urls>", "Comma-separated media URLs")
  .option("--schedule <datetime>", "Schedule for later (ISO 8601)")
  .option("--json", "Output as JSON")
  .action(async (text, opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const body: Record<string, unknown> = { text }
    if (opts.platforms) body.platforms = opts.platforms.split(",").map((p: string) => p.trim()).filter(Boolean)
    if (opts.media) body.mediaUrls = opts.media.split(",").map((u: string) => u.trim()).filter(Boolean)
    if (opts.schedule) body.scheduledAt = new Date(opts.schedule).toISOString()

    const data = await request<any>(config.baseUrl, config.apiKey, "POST", "/v0/social/posts", body)
    if (opts.json) return jsonOut(data)
    success(`${opts.schedule ? "Scheduled" : "Created"} post ${data.postId || data.id} (${data.status || "pending"})`)
  })

socialCommand
  .command("posts")
  .description("List social posts")
  .option("--limit <n>", "Max posts", "20")
  .option("--json", "Output as JSON")
  .action(async (opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const params = new URLSearchParams()
    if (opts.limit) params.set("limit", opts.limit)
    const qs = params.toString()
    const data = await request<any>(config.baseUrl, config.apiKey, "GET", `/v0/social/posts${qs ? `?${qs}` : ""}`)
    if (opts.json) return jsonOut(data)
    if (!data.posts?.length) return console.log("No posts found.")
    table(
      ["Created", "Caption", "Platforms", "Status"],
      data.posts.map((p: any) => [
        new Date(p.createdAt).toLocaleString(),
        truncate(p.caption || "—"),
        (p.platforms || []).join(", ") || "—",
        p.status || "—",
      ]),
    )
  })

socialCommand
  .command("status <postId>")
  .description("Get social post status")
  .option("--json", "Output as JSON")
  .action(async (postId, opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const data = await request<any>(config.baseUrl, config.apiKey, "GET", `/v0/social/posts/${postId}`)
    if (opts.json) return jsonOut(data)
    table(["Field", "Value"], [
      ["Post ID", data.postId || data.id],
      ["Caption", data.caption || "—"],
      ["Platforms", (data.platforms || []).join(", ") || "—"],
      ["Status", data.status || "—"],
      ["Scheduled", data.scheduledAt || "—"],
      ["Created", data.createdAt || "—"],
    ])
  })
