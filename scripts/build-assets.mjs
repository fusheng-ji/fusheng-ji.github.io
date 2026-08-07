import { build, context } from "esbuild";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { extname, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, "public/assets/generated");
const manifestPath = resolve(root, "src/_data/asset-manifest.json");
const watching = process.argv.includes("--watch");

const entryPoints = [
  ["site.css", "src/styles/main.css"],
  ["desktop.css", "src/styles/desktop.css"],
  ["gallery.css", "src/styles/gallery.css"],
  ["site.js", "src/scripts/site.js"],
  ["page-404.css", "src/styles/pages/404.css"],
  ["page-404.js", "src/scripts/pages/404.js"],
  ["rendering.css", "src/styles/pages/rendering.css"],
  ["rendering.js", "src/scripts/pages/rendering.js"],
  ["challenge.css", "src/styles/pages/challenge.css"],
  ["challenge.js", "src/scripts/pages/challenge.js"],
  ["jelly-receipt.css", "src/styles/pages/jelly-receipt.css"],
  ["jelly-receipt.js", "src/scripts/pages/jelly-receipt.js"],
  ["water-pool.css", "src/styles/pages/water-pool.css"],
  ["water-pool.js", "src/scripts/pages/water-pool.js"],
]
  .map(([logicalName, source]) => ({ logicalName, source }))
  .filter(({ source }) => existsSync(resolve(root, source)));

const groups = [".css", ".js"]
  .map((extension) => ({
    extension,
    entries: entryPoints.filter(({ logicalName }) => extname(logicalName) === extension),
  }))
  .filter(({ entries }) => entries.length);

function entryName(logicalName) {
  return logicalName.slice(0, -extname(logicalName).length);
}

function writeManifest(manifest) {
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right)),
  );
  writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
}

function buildOptions(group, watchMode) {
  const isJavaScript = group.extension === ".js";
  return {
    entryPoints: Object.fromEntries(
      group.entries.map(({ logicalName, source }) => [
        entryName(logicalName),
        resolve(root, source),
      ]),
    ),
    outdir: outputDirectory,
    bundle: true,
    splitting: isJavaScript,
    minify: !watchMode,
    sourcemap: watchMode,
    target: ["es2020"],
    format: isJavaScript ? "esm" : undefined,
    entryNames: watchMode ? "[name]" : "[name].[hash]",
    chunkNames: watchMode ? "chunks/[name]-[hash]" : "chunks/[name].[hash]",
    external: ["/assets/*"],
    legalComments: "none",
    metafile: !watchMode,
  };
}

function manifestFromResults(results) {
  const sourceToLogicalName = new Map(
    entryPoints.map(({ logicalName, source }) => [resolve(root, source), logicalName]),
  );
  const manifest = {};

  for (const result of results) {
    for (const [outputPath, metadata] of Object.entries(result.metafile.outputs)) {
      if (!metadata.entryPoint) continue;
      const logicalName = sourceToLogicalName.get(resolve(root, metadata.entryPoint));
      if (!logicalName) continue;
      const publicPath = relative(outputDirectory, resolve(root, outputPath)).replaceAll("\\", "/");
      manifest[logicalName] = `/assets/generated/${publicPath}`;
    }
  }

  return manifest;
}

async function buildOnce() {
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });
  const results = await Promise.all(
    groups.map((group) => build(buildOptions(group, false))),
  );
  writeManifest(manifestFromResults(results));
}

async function watch() {
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });
  writeManifest(Object.fromEntries(
    entryPoints.map(({ logicalName }) => [logicalName, `/assets/generated/${logicalName}`]),
  ));

  const contexts = await Promise.all(
    groups.map((group) => context(buildOptions(group, true))),
  );
  await Promise.all(contexts.map((item) => item.watch()));
  console.log("Asset watcher ready.");
}

if (watching) await watch();
else await buildOnce();
