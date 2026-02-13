import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function killProcessTree(pid: number): Promise<void> {
  if (!Number.isFinite(pid) || pid <= 0) return;

  if (process.platform === "win32") {
    await execFileAsync("taskkill", ["/T", "/F", "/PID", String(pid)]);
    return;
  }

  process.kill(-pid, "SIGTERM");
}
