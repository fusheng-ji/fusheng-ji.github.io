import { readdirSync, statSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignored = new Set([
  ".git",
  ".cache",
  ".playwright-cli",
  "_site",
  "node_modules",
  "output",
  "playwright-report",
  "test-results",
]);
const ignoredPrefixes = [
  "assets/photograph/originals/",
];
const oneMiB = 1024 * 1024;
let checkoutBytes = 0;
const oversized = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (directory === root && ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    const pathFromRoot = `${relative(root, path).replaceAll("\\", "/")}${entry.isDirectory() ? "/" : ""}`;
    if (ignoredPrefixes.some((prefix) => pathFromRoot.startsWith(prefix))) continue;
    if (entry.isDirectory()) walk(path);
    else {
      const size = statSync(path).size;
      checkoutBytes += size;
      if (size > oneMiB) oversized.push({ path: pathFromRoot, size });
    }
  }
}

walk(root);

if (oversized.length) {
  throw new Error(
    `Files over 1 MiB:\n${oversized
      .sort((a, b) => b.size - a.size)
      .map((item) => `${(item.size / oneMiB).toFixed(2)} MiB  ${item.path}`)
      .join("\n")}`,
  );
}

if (checkoutBytes > 35 * oneMiB) {
  throw new Error(`Checkout is ${(checkoutBytes / oneMiB).toFixed(2)} MiB; expected < 35 MiB.`);
}

const manifest = JSON.parse(
  readFileSync(resolve(root, "src/_data/asset-manifest.json"), "utf8"),
);
const publicRoot = resolve(root, "public");
const siteCssPath = resolve(publicRoot, manifest["site.css"].slice(1));
const siteJsPath = resolve(publicRoot, manifest["site.js"].slice(1));
const siteCssBytes = statSync(siteCssPath).size;

function staticModuleBytes(entryPath, visited = new Set()) {
  if (visited.has(entryPath)) return 0;
  visited.add(entryPath);
  const source = readFileSync(entryPath, "utf8");
  const staticImport = /\bimport(?:[^\("'`;]*?\bfrom)?["']([^"']+)["']/g;
  let total = statSync(entryPath).size;
  let match;

  while ((match = staticImport.exec(source))) {
    if (!match[1].startsWith(".")) continue;
    total += staticModuleBytes(resolve(dirname(entryPath), match[1]), visited);
  }

  return total;
}

const criticalJsBytes = staticModuleBytes(siteJsPath);
if (siteCssBytes > 50 * 1024) {
  throw new Error(`Homepage critical CSS is ${(siteCssBytes / 1024).toFixed(1)} KiB; expected <= 50 KiB.`);
}
if (criticalJsBytes > 12 * 1024) {
  throw new Error(`Homepage critical JS is ${(criticalJsBytes / 1024).toFixed(1)} KiB; expected <= 12 KiB.`);
}

for (const icon of ["github-logo.png", "website_logo.png", "yotube_logo.png"]) {
  const iconPath = resolve(publicRoot, "assets/misc", icon);
  if (statSync(iconPath).size > 10 * 1024) {
    throw new Error(`${icon} is ${(statSync(iconPath).size / 1024).toFixed(1)} KiB; expected <= 10 KiB.`);
  }
}

console.log(
  `Checkout ${(checkoutBytes / oneMiB).toFixed(2)} MiB; critical CSS ${(siteCssBytes / 1024).toFixed(1)} KiB; critical JS ${(criticalJsBytes / 1024).toFixed(1)} KiB.`,
);
