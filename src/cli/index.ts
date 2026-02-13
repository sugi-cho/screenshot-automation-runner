import { pathToFileURL } from "node:url";
import { parseCommonArgs } from "./args.js";
import { runValidateCommand } from "./commands/validate.js";
import { runListStepsCommand } from "./commands/list-steps.js";
import { runRunCommand } from "./commands/run.js";
import { ExitCode } from "../logging/error-codes.js";

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`screenshot-automation-runner

Usage:
  sar run -c <config> [--project-root <path>] [--dry-run] [--verbose]
  sar validate -c <config>
  sar list-steps -c <config>
`);
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const command = argv[0];
  const args = parseCommonArgs(argv.slice(1));

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return ExitCode.SUCCESS;
  }

  if (!args.config) {
    // eslint-disable-next-line no-console
    console.error("--config (-c) is required");
    return ExitCode.INVALID_CONFIG;
  }

  switch (command) {
    case "validate":
      return runValidateCommand(args.config);
    case "list-steps":
      return runListStepsCommand(args.config);
    case "run":
      return runRunCommand({
        configPath: args.config,
        projectRoot: args.projectRoot,
        dryRun: args.dryRun,
        verbose: args.verbose
      });
    default:
      // eslint-disable-next-line no-console
      console.error(`Unknown command: ${command}`);
      printHelp();
      return ExitCode.INVALID_CONFIG;
  }
}

const currentModuleUrl = import.meta.url;
const executedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
const isEntrypoint = currentModuleUrl === executedUrl;

if (isEntrypoint) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(String(error));
      process.exitCode = ExitCode.UNEXPECTED;
    });
}
