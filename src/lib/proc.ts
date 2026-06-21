/**
 * Spawn `argv`, drain stdout AND stderr concurrently (an unread piped stream can
 * fill its OS buffer and deadlock the child), and return stdout; throws on a
 * non-zero exit. Shared by the yt-dlp / pdftotext / headless-agent call sites.
 */
export async function runCapture(argv: string[]): Promise<string> {
  const proc = Bun.spawn(argv, { stdout: "pipe", stderr: "pipe" });
  const [stdout, , code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`${argv[0]} exited ${code}`);
  return stdout;
}
