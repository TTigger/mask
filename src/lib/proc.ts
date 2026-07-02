import { spawn } from "node:child_process";

/**
 * Spawn `argv`, drain stdout AND stderr concurrently (an unread piped stream can
 * fill its OS buffer and deadlock the child), and return stdout; throws on a
 * non-zero exit. Shared by the yt-dlp / pdftotext / git / headless-agent call
 * sites. node:child_process so the npm-published bundle runs on plain Node; Bun
 * executes node:child_process natively, so dev is unaffected.
 */
export function runCapture(argv: string[]): Promise<string> {
  const [cmd, ...args] = argv;
  return new Promise((resolvePromise, reject) => {
    // stdin "ignore" (standard default) so a prompt-happy tool can't wait on
    // input. The explicit stdio tuple makes TS type the streams nullable —
    // they are always present for "pipe", hence the assertions.
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    child.stdout!.setEncoding("utf8");
    child.stdout!.on("data", (chunk: string) => (stdout += chunk));
    child.stderr!.resume(); // drain — an unread pipe fills the OS buffer and deadlocks the child
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout);
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}
