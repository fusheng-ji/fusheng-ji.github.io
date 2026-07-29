import Ajv2020 from "ajv/dist/2020.js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import publications from "../src/_data/publications.js";
import experiences from "../src/_data/experiences.js";
import documents from "../src/_data/documents.js";
import education from "../src/_data/education.js";
import awards from "../src/_data/awards.js";
import projects from "../src/_data/projects.js";
import researchAreas from "../src/_data/researchAreas.js";
import gallery from "../src/_data/gallery.js";
import site from "../src/_data/site.js";

const root = resolve(import.meta.dirname, "..");
const schema = JSON.parse(
  readFileSync(resolve(root, "src/_schemas/content.schema.json"), "utf8"),
);
const ajv = new Ajv2020({ allErrors: true });
ajv.addSchema(schema);

function validateCollection(name, reference, items) {
  const validate = ajv.getSchema(reference);
  for (const item of items) {
    if (!validate(item)) {
      throw new Error(
        `${name} "${item.id ?? item.title}" is invalid:\n${ajv.errorsText(validate.errors, { separator: "\n" })}`,
      );
    }
  }
}

validateCollection(
  "Publication",
  "https://fusheng-ji.github.io/schemas/content.schema.json#/$defs/publication",
  publications,
);
validateCollection(
  "Experience",
  "https://fusheng-ji.github.io/schemas/content.schema.json#/$defs/experience",
  experiences,
);

const areaIds = new Set(researchAreas.map((area) => area.id));
const resourceTypes = new Set(Object.keys(site.resourceTypes));
const allRecords = [...publications, ...experiences, ...documents, ...education, ...awards, ...projects];
const ids = new Set();

for (const record of allRecords) {
  if (ids.has(record.id)) throw new Error(`Duplicate content id: ${record.id}`);
  ids.add(record.id);
  if (record.area && !areaIds.has(record.area)) {
    throw new Error(`Unknown research area "${record.area}" in ${record.id}`);
  }
  for (const link of record.links ?? []) {
    if (!resourceTypes.has(link.type)) {
      throw new Error(`Unknown resource type "${link.type}" in ${record.id}`);
    }
  }
}

function assertLocalMedia(media, owner) {
  if (!media || !media.src || !media.width || !media.height || !media.alt) {
    throw new Error(`Incomplete media metadata in ${owner}`);
  }
  if (media.src.startsWith("/")) {
    const path = resolve(root, "public", media.src.slice(1));
    if (!existsSync(path)) throw new Error(`Missing local media ${media.src} in ${owner}`);
  }
  if (media.poster?.startsWith("/")) {
    const poster = resolve(root, "public", media.poster.slice(1));
    if (!existsSync(poster)) throw new Error(`Missing poster ${media.poster} in ${owner}`);
  }
}

for (const publication of publications) assertLocalMedia(publication.media, publication.id);
for (const experience of experiences) {
  for (const logo of experience.logos) assertLocalMedia(logo, experience.id);
}
for (const document of documents) {
  for (const media of document.media) assertLocalMedia(media, document.id);
}
for (const item of education) assertLocalMedia(item.logo, item.id);
for (const project of projects) assertLocalMedia(project.media, project.id);
for (const media of gallery.lens) assertLocalMedia(media, "gallery.lens");
for (const media of gallery.blender) assertLocalMedia(media, "gallery.blender");
for (const item of gallery.threejs) assertLocalMedia(item.media, "gallery.threejs");

console.log(
  `Validated ${allRecords.length} content records and all referenced local media.`,
);
