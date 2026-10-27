import openSource from "../src/_data/openSource.js";
import { refreshContributions } from "./lib/sync-contributions.mjs";
import { writeFile } from "node:fs/promises";

const { cachePath, seedSnapshot, selection } = openSource({ configurationOnly: true });
const result = await refreshContributions({
  selection, seedSnapshot, cachePath, token: process.env.GITHUB_TOKEN ?? "",
});
if (!result.refreshed) {
  const message = `Contribution sync failed (${result.error}); retained snapshot from ${result.snapshot.fetchedAt}.`;
  if (process.env.GITHUB_ACTIONS) console.warn(`::warning::${message}`);
  else console.warn(message);
} else {
  if (process.argv.includes("--write-seed")) {
    await writeFile(new URL("../src/_data/open-source-snapshot.json", import.meta.url), `${JSON.stringify(result.snapshot, null, 2)}\n`);
    console.log("Updated the checked-in initial snapshot.");
  }
  console.log(`Updated ${result.snapshot.pullRequests.length} selected PRs; ${result.snapshot.summary.total} external PRs across ${result.snapshot.summary.repositories} repositories.`);
}
