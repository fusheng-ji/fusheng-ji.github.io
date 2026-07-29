import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

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
const homepageAssetBytes = ["site.css", "site.js"].reduce((sum, key) => {
  const path = resolve(root, "public", manifest[key].slice(1));
  return sum + statSync(path).size;
}, 0);

if (homepageAssetBytes > 120 * 1024) {
  throw new Error(`Homepage CSS + JS is ${(homepageAssetBytes / 1024).toFixed(1)} KiB; expected < 120 KiB.`);
}

console.log(
  `Checkout ${(checkoutBytes / oneMiB).toFixed(2)} MiB; homepage CSS + JS ${(homepageAssetBytes / 1024).toFixed(1)} KiB.`,
);
