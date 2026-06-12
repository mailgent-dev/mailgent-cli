import { Command } from "commander"
import { whoamiCommand } from "./commands/whoami"
import { mailCommand } from "./commands/mail"
import { threadsCommand } from "./commands/threads"
import { vaultCommand } from "./commands/vault"
import { logsCommand } from "./commands/logs"
import { didCommand } from "./commands/did"
import { calendarCommand } from "./commands/calendar"
import { platformCommand } from "./commands/platform"
import { slackCommand } from "./commands/slack"
import { socialCommand } from "./commands/social"
import {
  payCommand,
  activityCommand,
  mandateCommand,
} from "./commands/payments"
import { ApiError } from "./http"

const program = new Command()
  .name("mailgent")
  .description("CLI for the Mailgent API — identity infrastructure for AI agents")
  .version("0.6.2")
  .option("--api-key <key>", "API key (or set MAILGENT_API_KEY)")
  .option("--base-url <url>", "API base URL (or set MAILGENT_API_URL)")

program.addCommand(whoamiCommand)
program.addCommand(mailCommand)
program.addCommand(threadsCommand)
program.addCommand(vaultCommand)
program.addCommand(logsCommand)
program.addCommand(didCommand)
program.addCommand(calendarCommand)
program.addCommand(payCommand)
program.addCommand(activityCommand)
program.addCommand(mandateCommand)
program.addCommand(platformCommand)
program.addCommand(slackCommand)
program.addCommand(socialCommand)

// Commands that need the BUYER role (i.e. `payments:spend` scope on the API key).
// A key without the payments:spend scope will get a 403.
const BUYER_ONLY_COMMANDS = new Set(["pay", "mandate", "activity"])

program.parseAsync(process.argv).catch((err) => {
  const subcommand = process.argv[2]
  if (err instanceof ApiError) {
    console.error(`Error [${err.status}]: ${err.message}`)
    if (err.status === 403 && BUYER_ONLY_COMMANDS.has(subcommand)) {
      console.error(
        "\n`mailgent " + subcommand + "` requires a BUYER project (payments:spend scope).",
      )
      console.error(
        "If this key lacks the scope, create a BUYER project at https://console.mailgent.dev",
      )
      console.error(
        "or rotate this key to add the scope. Project type is set at create time.",
      )
    }
  } else {
    console.error(`Error: ${err.message}`)
  }
  process.exit(1)
})
