import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const children = new Set();
let shuttingDown = false;

function stop(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = exitCode;
}

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    stdio: options.stdio ?? "inherit",
  });
  children.add(child);
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown && code !== 0 && signal !== "SIGTERM") stop(code ?? 1);
  });
  return child;
}

const assetWatcher = start(
  process.execPath,
  ["scripts/build-assets.mjs", "--watch"],
  { stdio: ["inherit", "pipe", "inherit"] },
);

assetWatcher.stdout.setEncoding("utf8");
assetWatcher.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (chunk.includes("Asset watcher ready.")) {
    assetWatcher.stdout.removeAllListeners("data");
    assetWatcher.stdout.pipe(process.stdout);
    start(process.execPath, ["node_modules/@11ty/eleventy/cmd.cjs", "--serve"]);
  }
});

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
