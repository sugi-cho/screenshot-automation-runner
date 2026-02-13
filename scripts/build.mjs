import fs from "node:fs/promises";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const COPY_DIRS = ["schemas", ".sar", ".github", "docs"];
const TRANSPILE_DIRS = ["src", "test"];

async function rmIfExists(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function listFilesRecursively(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(fullPath)));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

async function transpileTsFile(filePath) {
  const relative = path.relative(ROOT, filePath);
  const outRelative = relative.replace(/\.ts$/u, ".js");
  const outPath = path.join(DIST_DIR, outRelative);
  const source = await fs.readFile(filePath, "utf8");
  const transformed = stripTypeScriptTypes(source, {
    mode: "transform",
    sourceMap: false
  });

  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, transformed, "utf8");
}

async function copyFileToDist(filePath) {
  const relative = path.relative(ROOT, filePath);
  const outPath = path.join(DIST_DIR, relative);
  await ensureDir(path.dirname(outPath));
  await fs.copyFile(filePath, outPath);
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await rmIfExists(DIST_DIR);
  await ensureDir(DIST_DIR);

  for (const dir of TRANSPILE_DIRS) {
    const absDir = path.join(ROOT, dir);
    if (!(await exists(absDir))) {
      continue;
    }

    const files = await listFilesRecursively(absDir);
    for (const filePath of files) {
      if (filePath.endsWith(".ts")) {
        await transpileTsFile(filePath);
      } else {
        await copyFileToDist(filePath);
      }
    }
  }

  for (const dir of COPY_DIRS) {
    const absDir = path.join(ROOT, dir);
    if (!(await exists(absDir))) {
      continue;
    }

    const files = await listFilesRecursively(absDir);
    for (const filePath of files) {
      await copyFileToDist(filePath);
    }
  }

  const binPath = path.join(ROOT, "bin");
  if (await exists(binPath)) {
    const files = await listFilesRecursively(binPath);
    for (const filePath of files) {
      await copyFileToDist(filePath);
    }
  }

  // eslint-disable-next-line no-console
  console.log("Build completed.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
