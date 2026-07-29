import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const siteRoot = resolve(root, "_site");
const errors = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const htmlFiles = walk(siteRoot).filter((path) => extname(path) === ".html");
const idsByFile = new Map();

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${relative(siteRoot, file)} has duplicate id #${id}`);
    seen.add(id);
  }
  idsByFile.set(file, seen);
}

function resolveSitePath(currentFile, rawPath) {
  const withoutQuery = rawPath.split("?")[0];
  const [pathname, hash = ""] = withoutQuery.split("#");
  let target;

  if (!pathname) target = currentFile;
  else if (pathname.startsWith("/")) target = resolve(siteRoot, `.${pathname}`);
  else target = resolve(dirname(currentFile), pathname);

  if (pathname.endsWith("/") || (existsSync(target) && statSync(target).isDirectory())) {
    target = join(target, "index.html");
  }
  return { target, hash };
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const references = [
    ...html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g),
    ...html.matchAll(/\ssrcset=["']([^"']+)["']/g),
  ].flatMap((match) =>
    match[0].includes("srcset")
      ? match[1].split(",").map((part) => part.trim().split(/\s+/)[0])
      : [match[1]],
  );

  for (const reference of references) {
    if (
      !reference ||
      /^(?:https?:|mailto:|data:|javascript:)/.test(reference) ||
      reference === "/blog/" ||
      reference.startsWith("/blog/?")
    ) {
      continue;
    }
    const { target, hash } = resolveSitePath(file, reference);
    if (!existsSync(target)) {
      errors.push(`${relative(siteRoot, file)} references missing ${reference}`);
      continue;
    }
    if (hash && extname(target) === ".html") {
      const ids = idsByFile.get(target) ?? new Set(
        [...readFileSync(target, "utf8").matchAll(/\sid=["']([^"']+)["']/g)].map(
          (match) => match[1],
        ),
      );
      if (!ids.has(decodeURIComponent(hash))) {
        errors.push(`${relative(siteRoot, file)} references missing #${hash} in ${relative(siteRoot, target)}`);
      }
    }
  }
}

if (errors.length) {
  throw new Error(`Link validation failed:\n${errors.join("\n")}`);
}

console.log(`Validated links and anchors across ${htmlFiles.length} HTML pages.`);
