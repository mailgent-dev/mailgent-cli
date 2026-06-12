import { Command } from "commander"
import { resolveConfig } from "../config"
import { request } from "../http"
import { table, json as jsonOut, success } from "../output"

export const slackCommand = new Command("slack").description("Slack operations")

slackCommand
  .command("status")
  .description("Show Slack connection status")
  .option("--json", "Output as JSON")
  .action(async (opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const data = await request<any>(config.baseUrl, config.apiKey, "GET", "/v0/slack/connection")
    if (opts.json) return jsonOut(data)
    table(["Field", "Value"], [
      ["Connected", data.connected ? "Yes" : "No"],
      ["Team", data.teamName || "—"],
      ["Team ID", data.teamId || "—"],
      ["Bot User", data.botUserId || "—"],
      ["Connected At", data.connectedAt || "—"],
    ])
  })

slackCommand
  .command("connect")
  .description("Connect a Slack workspace")
  .option("--json", "Output as JSON")
  .action(async (opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const data = await request<any>(config.baseUrl, config.apiKey, "POST", "/v0/slack/connect")
    if (opts.json) return jsonOut(data)
    console.log("Open this URL in your browser to install the Mailgent Slack app:\n")
    console.log(`  ${data.installUrl}\n`)
    console.log("Once installed, run `mailgent slack status` to verify the connection.")
  })

slackCommand
  .command("disconnect")
  .description("Disconnect the Slack workspace")
  .action(async (_opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    await request(config.baseUrl, config.apiKey, "DELETE", "/v0/slack/connection")
    success("Slack workspace disconnected")
  })

slackCommand
  .command("channels")
  .description("List Slack channels")
  .option("--json", "Output as JSON")
  .action(async (opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const data = await request<any>(config.baseUrl, config.apiKey, "GET", "/v0/slack/channels")
    if (opts.json) return jsonOut(data)
    if (!data.channels?.length) return console.log("No channels found.")
    table(
      ["ID", "Name", "Private", "Bot Member"],
      data.channels.map((c: any) => [
        c.id,
        c.name,
        c.isPrivate ? "Yes" : "No",
        c.isMember ? "Yes" : "No",
      ]),
    )
  })

slackCommand
  .command("send <channel> <text>")
  .description("Send a message to a Slack channel")
  .option("--thread <ts>", "Reply in a thread (parent message ts)")
  .option("--json", "Output as JSON")
  .action(async (channel, text, opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const body: Record<string, unknown> = { channel, text }
    if (opts.thread) body.threadTs = opts.thread
    const data = await request<any>(config.baseUrl, config.apiKey, "POST", "/v0/slack/messages", body)
    if (opts.json) return jsonOut(data)
    success(`Sent message to ${channel}${data.ts ? ` (ts ${data.ts})` : ""}`)
  })

slackCommand
  .command("messages")
  .description("List Slack messages seen by the bot")
  .option("--channel <id>", "Filter: channel ID (C…)")
  .option("--since <date>", "Filter: messages since (ISO date)")
  .option("--limit <n>", "Max messages", "50")
  .option("--json", "Output as JSON")
  .action(async (opts, cmd) => {
    const config = resolveConfig(cmd.optsWithGlobals())
    const params = new URLSearchParams()
    if (opts.channel) params.set("channel", opts.channel)
    if (opts.since) params.set("since", opts.since)
    if (opts.limit) params.set("limit", opts.limit)
    const qs = params.toString()
    const data = await request<any>(config.baseUrl, config.apiKey, "GET", `/v0/slack/messages${qs ? `?${qs}` : ""}`)
    if (opts.json) return jsonOut(data)
    if (!data.messages?.length) return console.log("No messages found.")
    table(
      ["Ts", "Channel", "User", "Text"],
      data.messages.map((m: any) => [
        m.ts,
        m.channel,
        m.user || "—",
        (m.text || "").length > 60 ? `${m.text.slice(0, 57)}...` : m.text || "—",
      ]),
    )
  })
