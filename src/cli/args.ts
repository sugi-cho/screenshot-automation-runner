export type ParsedArgs = {
  config?: string;
  scenario?: string;
  projectRoot?: string;
  dryRun: boolean;
  verbose: boolean;
};

export function parseCommonArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    dryRun: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    const next = args[i + 1];

    switch (token) {
      case "-c":
      case "--config":
        parsed.config = next;
        i += 1;
        break;
      case "--scenario":
        parsed.scenario = next;
        i += 1;
        break;
      case "--project-root":
        parsed.projectRoot = next;
        i += 1;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--verbose":
        parsed.verbose = true;
        break;
      default:
        break;
    }
  }

  return parsed;
}
