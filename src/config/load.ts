import fs from "node:fs/promises";
import path from "node:path";
import { RunnerError, ExitCode } from "../logging/error-codes.js";
import { type RunnerConfig } from "./schema.js";

type YamlLine = {
  indent: number;
  text: string;
};

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+$/u.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/u.test(trimmed)) return Number.parseFloat(trimmed);

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function preprocessYamlLines(input: string): YamlLine[] {
  const rawLines = input.split(/\r?\n/u);
  const out: YamlLine[] = [];

  for (const rawLine of rawLines) {
    const withoutComment = rawLine.replace(/\s+#.*$/u, "");
    if (withoutComment.trim().length === 0) {
      continue;
    }
    const indent = withoutComment.match(/^ */u)?.[0].length ?? 0;
    out.push({
      indent,
      text: withoutComment.trim()
    });
  }
  return out;
}

function parseYamlBlock(lines: YamlLine[], start: number, indent: number): [unknown, number] {
  if (start >= lines.length) {
    return [{}, start];
  }

  const first = lines[start];
  if (first.indent !== indent) {
    return [{}, start];
  }

  if (first.text.startsWith("- ")) {
    const arr: unknown[] = [];
    let i = start;
    while (i < lines.length) {
      const line = lines[i];
      if (line.indent < indent || !line.text.startsWith("- ")) {
        break;
      }
      if (line.indent > indent) {
        throw new Error(`Invalid indentation at line index ${i}`);
      }

      const item = line.text.slice(2).trim();
      if (item.length === 0) {
        const [nested, next] = parseYamlBlock(lines, i + 1, indent + 2);
        arr.push(nested);
        i = next;
        continue;
      }

      const keyMatch = item.match(/^([^:]+):\s*(.*)$/u);
      if (keyMatch) {
        const obj: Record<string, unknown> = {};
        const key = keyMatch[1].trim();
        const rest = keyMatch[2];
        if (rest.length > 0) {
          obj[key] = parseScalar(rest);
          i += 1;
        } else {
          const [nested, next] = parseYamlBlock(lines, i + 1, indent + 4);
          obj[key] = nested;
          i = next;
        }

        while (i < lines.length && lines[i].indent === indent + 2 && !lines[i].text.startsWith("- ")) {
          const extra = lines[i].text.match(/^([^:]+):\s*(.*)$/u);
          if (!extra) {
            throw new Error(`Invalid YAML entry at line index ${i}`);
          }
          const extraKey = extra[1].trim();
          const extraRest = extra[2];
          if (extraRest.length > 0) {
            obj[extraKey] = parseScalar(extraRest);
            i += 1;
          } else {
            const [nested, next] = parseYamlBlock(lines, i + 1, indent + 4);
            obj[extraKey] = nested;
            i = next;
          }
        }

        arr.push(obj);
        continue;
      }

      arr.push(parseScalar(item));
      i += 1;
    }

    return [arr, i];
  }

  const obj: Record<string, unknown> = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent || line.indent > indent || line.text.startsWith("- ")) {
      break;
    }
    const match = line.text.match(/^([^:]+):\s*(.*)$/u);
    if (!match) {
      throw new Error(`Invalid YAML entry at line index ${i}`);
    }
    const key = match[1].trim();
    const rest = match[2];
    if (rest.length > 0) {
      obj[key] = parseScalar(rest);
      i += 1;
    } else {
      const [nested, next] = parseYamlBlock(lines, i + 1, indent + 2);
      obj[key] = nested;
      i = next;
    }
  }
  return [obj, i];
}

function parseYaml(input: string): unknown {
  const lines = preprocessYamlLines(input);
  if (lines.length === 0) {
    return {};
  }
  const [parsed] = parseYamlBlock(lines, 0, lines[0].indent);
  return parsed;
}

function resolveCwd(baseDir: string, maybePath: string | undefined): string | undefined {
  if (!maybePath) return undefined;
  if (path.isAbsolute(maybePath)) return maybePath;
  return path.resolve(baseDir, maybePath);
}

function resolveOutputDir(baseDir: string, config: RunnerConfig): RunnerConfig {
  const next = structuredClone(config);
  next.output.dir = resolveCwd(baseDir, config.output.dir) ?? config.output.dir;

  if (next.launch.type === "command") {
    next.launch.cwd = resolveCwd(baseDir, next.launch.cwd);
  } else {
    next.launch.cwd = resolveCwd(baseDir, next.launch.cwd);
    next.launch.executable = resolveCwd(baseDir, next.launch.executable) ?? next.launch.executable;
  }

  if (next.scenario.outputDir) {
    next.scenario.outputDir = resolveCwd(baseDir, next.scenario.outputDir);
  }

  return next;
}

export async function loadConfig(configPath: string): Promise<RunnerConfig> {
  let raw: string;
  try {
    raw = await fs.readFile(configPath, "utf8");
  } catch (error) {
    throw new RunnerError(ExitCode.INVALID_CONFIG, `Config file read failed: ${String(error)}`);
  }

  const ext = path.extname(configPath).toLowerCase();
  let parsed: unknown;
  try {
    if (ext === ".json") {
      parsed = JSON.parse(raw);
    } else if (ext === ".yaml" || ext === ".yml") {
      parsed = parseYaml(raw);
    } else {
      throw new Error(`Unsupported config extension: ${ext}`);
    }
  } catch (error) {
    throw new RunnerError(ExitCode.INVALID_CONFIG, `Config parse failed: ${String(error)}`);
  }

  return resolveOutputDir(path.dirname(path.resolve(configPath)), parsed as RunnerConfig);
}
