import { spawn } from "node:child_process";
import type { ProcessRunner } from "@/server/ports/process-runner";

export class NodeProcessRunner implements ProcessRunner {
  run(
    executable: string,
    args: string[],
    options?: {
      cwd?: string;
      timeoutMs?: number;
      env?: Record<string, string | undefined>;
    },
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        shell: false,
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });

      const timer = options?.timeoutMs
        ? setTimeout(() => child.kill(), options.timeoutMs)
        : undefined;
      child.once("error", reject);
      child.once("close", (code) => {
        if (timer) clearTimeout(timer);
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(stderr || `${executable} exited with ${code}`));
      });
    });
  }
}

