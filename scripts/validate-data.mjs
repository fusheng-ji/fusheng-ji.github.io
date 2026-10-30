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
import openSource from "../src/_data/openSource.js";

const root = resolve(import.meta.dirname, "..");
const { selection, contributionDetails, repositoryMedia, repositoryIntros } = openSource();
const contributionIds = new Set();
for (const item of selection) {
  const key = `${item.repository}#${item.number}`;
  if (contributionIds.has(key) || typeof item.description !== "string" || !item.description.trim()) {
    throw new Error(`Incomplete selected contribution ${item.repository}#${item.number}`);
  }
  const narrative = contributionDetails.records[key];
  if (!narrative || ["topic", "linkLabel", "mechanism", "validation"].some(field =>
    typeof narrative[field] !== "string" || !narrative[field].trim())) {
    throw new Error(`Missing technical narrative for ${key}`);
  }
  contributionIds.add(key);
}
const selectedRepositories = new Set(selection.map(item => item.repository));
const repositoryOrder = contributionDetails.repositoryOrder;
if (new Set(repositoryOrder).size !== repositoryOrder.length
  || repositoryOrder.length !== selectedRepositories.size
  || repositoryOrder.some(repository => !selectedRepositories.has(repository))) {
  throw new Error("Contribution order must cover selected repositories exactly once");
}
for (const sequence of contributionDetails.sequences) {
  if (sequence.numbers.length < 2 || new Set(sequence.numbers).size !== sequence.numbers.length
    || !sequence.numbers.every(number => contributionIds.has(`${sequence.repository}#${number}`))
    || new Set(sequence.numbers.map(number => contributionDetails.records[`${sequence.repository}#${number}`].topic)).size !== 1
    || !sequence.label?.trim()) {
    throw new Error(`Invalid contribution sequence for ${sequence.repository}`);
  }
}
for (const repository of new Set(selection.map(item => item.repository))) {
  const intro = repositoryIntros[repository];
  if (!intro?.text?.trim() || intro.source !== `https://github.com/${repository}`) {
    throw new Error(`Missing project introduction or upstream source for ${repository}`);
  }
}
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
for (const [repository, media] of Object.entries(repositoryMedia)) {
  if (!media.src.startsWith("/assets/open-source/")) throw new Error(`Non-local repository media in ${repository}`);
  assertLocalMedia(media, repository);
}
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
