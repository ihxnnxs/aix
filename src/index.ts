#!/usr/bin/env bun
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { DoctorCommand } from "./cli/commands/doctor"
import { ListCommand } from "./cli/commands/list"
import { TransferCommand } from "./cli/commands/transfer"
import { VERSION } from "./version"
import { findProjectRoot } from "./utils/project"

const args = hideBin(process.argv)
const projectRoot = findProjectRoot(process.cwd())

// No args → launch TUI home screen
if (args.length === 0) {
  const { startTUI } = await import("./tui/app")
  const { createAllAdapters } = await import("./adapters/registry")
  await startTUI(createAllAdapters(projectRoot), projectRoot)
} else {
  const cli = yargs(args)
    .scriptName("aix")
    .usage("$0 <command>")
    .command(DoctorCommand)
    .command(ListCommand)
    .command(TransferCommand)
    .version(VERSION)
    .help()
    .demandCommand(1, "Run aix --help to see available commands")

  cli.parse()
}
