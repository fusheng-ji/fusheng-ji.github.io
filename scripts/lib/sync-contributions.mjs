import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, URLSearchParams } from "node:url";
import {
  SNAPSHOT_VERSION, USERNAME, normalizePullRequest, summarizePullRequests, validateSnapshot,
} from "./contributions.mjs";

const API = "https://api.github.com";
const PUBLISHED_SNAPSHOT = "https://fusheng-ji.github.io/assets/data/open-source.json";
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function requestJson(url, { fetchImpl, token, sleep }) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "wenbo-ji-portfolio" };
  if (url.startsWith(`${API}/`)) {
    headers["X-GitHub-Api-Version"] = "2022-11-28";
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetchImpl(url, { headers, signal: globalThis.AbortSignal.timeout(15000) });
    if (response.ok) return response.status === 204 ? [] : response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retryAfter = Number(response.headers?.get("retry-after"));
      await sleep(Math.min(30000, retryAfter > 0 ? retryAfter * 1000 : 1000 * (attempt + 1)));
      continue;
    }
    throw new Error(`Contribution request failed: HTTP ${response.status}`);
  }
}

async function searchAllPullRequests(options) {
  const baseQuery = `is:pr is:public author:${USERNAME} -user:${USERNAME}`;
  let lastSearch = false;
  async function search(query, page = 1) {
    // Authenticated search is limited separately from ordinary REST requests.
    if (lastSearch) await options.sleep(options.token ? 2100 : 6500);
    lastSearch = true;
    const parameters = new URLSearchParams({ q: query, per_page: "100", page: String(page), sort: "created", order: "asc" });
    const result = await requestJson(`${API}/search/issues?${parameters}`, options);
    if (result.incomplete_results || !Number.isInteger(result.total_count) || !Array.isArray(result.items)) {
      throw new Error("GitHub returned incomplete contribution search results");
    }
    return result;
  }
  async function collect(start, end, first) {
    const range = ` created:${new Date(start).toISOString()}..${new Date(end).toISOString()}`;
    const query = first ? baseQuery : baseQuery + range;
    const initial = first ?? await search(query);
    if (initial.total_count > 1000) {
      if (end - start < 1000) throw new Error("Contribution search range exceeds GitHub's result limit");
      const midpoint = Math.floor((start + end) / 2000) * 1000;
      return [...await collect(start, midpoint), ...await collect(midpoint + 1000, end)];
    }
    const items = [...initial.items];
    for (let page = 2; page <= Math.ceil(initial.total_count / 100); page += 1) {
      const result = await search(query, page);
      if (result.total_count !== initial.total_count) throw new Error("Contribution search changed during pagination");
      items.push(...result.items);
    }
    if (items.length !== initial.total_count) throw new Error("Incomplete contribution pagination");
    return items;
  }
  const initial = await search(baseQuery);
  const items = await collect(0, options.now().getTime(), initial);
  if (items.length !== initial.total_count) throw new Error("Contribution count changed while collecting date ranges");
  const unique = new Map();
  for (const pr of items) {
    const repository = pr.repository_url?.split("/repos/")[1];
    if (!repository || !pr.pull_request) throw new Error("Search returned an invalid pull request");
    if (repository.split("/")[0].toLowerCase() === USERNAME) continue;
    const item = normalizePullRequest(pr, repository);
    const key = `${repository}#${pr.number}`;
    if (unique.has(key)) throw new Error("Duplicate contribution search result");
    unique.set(key, item);
  }
  return unique;
}

async function selectedPullRequests(selection, options) {
  const output = [];
  // Bound concurrency so the weekly job does not burst the GitHub API.
  for (let start = 0; start < selection.length; start += 3) {
    output.push(...await Promise.all(selection.slice(start, start + 3).map(async item => {
      const pr = await requestJson(`${API}/repos/${item.repository}/pulls/${item.number}`, options);
      if (pr.number !== item.number || pr.base?.repo?.full_name?.toLowerCase() !== item.repository.toLowerCase()) {
        throw new Error(`Unexpected upstream PR ${item.repository}#${item.number}`);
      }
      return normalizePullRequest(pr, item.repository);
    })));
  }
  return output;
}

async function selectedRepositoryMetadata(selection, options) {
  const names = [...new Set(selection.map(item => item.repository))];
  const metadata = new Map();
  for (let start = 0; start < names.length; start += 3) {
    const rows = await Promise.all(names.slice(start, start + 3).map(async name => {
      const repository = await requestJson(`${API}/repos/${name}`, options);
      if (repository.full_name?.toLowerCase() !== name.toLowerCase()
        || typeof repository.private !== "boolean" || !Number.isInteger(repository.stargazers_count)
        || repository.stargazers_count < 0) {
        throw new Error(`Unexpected upstream repository ${name}`);
      }
      let isContributor = false;
      for (let page = 1; ; page += 1) {
        const contributors = await requestJson(`${API}/repos/${name}/contributors?per_page=100&page=${page}`, options);
        if (!Array.isArray(contributors) || contributors.length > 100
          || contributors.some(person => !person || typeof person !== "object")) {
          throw new Error(`Invalid contributors response for ${name}`);
        }
        isContributor ||= contributors.some(person => person.login?.toLowerCase() === USERNAME);
        // Do not stop after finding the user: all pages must succeed before this
        // sync can assert a verified role and replace the existing snapshot.
        if (contributors.length < 100) break;
      }
      return { name, stars: repository.stargazers_count, public: !repository.private, isContributor };
    }));
    for (const row of rows) metadata.set(row.name, row);
  }
  return metadata;
}

export async function refreshContributions({
  selection, seedSnapshot, cachePath, fetchImpl = fetch, token = "", now = () => new Date(), sleep = delay,
  publishedUrl = PUBLISHED_SNAPSHOT,
}) {
  const options = { fetchImpl, token, now, sleep };
  let fallback;
  for (const read of [
    () => seedSnapshot,
    () => readFile(cachePath, "utf8").then(JSON.parse),
    () => requestJson(publishedUrl, options),
  ]) {
    try {
      const candidate = validateSnapshot(await read(), selection);
      if (!fallback || Date.parse(candidate.fetchedAt) > Date.parse(fallback.fetchedAt)) fallback = candidate;
    } catch {
      // A first deployment may have no published snapshot or local cache.
    }
  }
  let snapshot = fallback;
  let error;
  try {
    const all = await searchAllPullRequests(options);
    const pullRequests = await selectedPullRequests(selection, options);
    const repositoryMetadata = await selectedRepositoryMetadata(selection, options);
    // Direct PR endpoints take precedence over the potentially delayed search index.
    for (const pr of pullRequests) {
      const key = `${pr.repository}#${pr.number}`;
      if (repositoryMetadata.get(pr.repository).public) all.set(key, pr);
      else all.delete(key);
    }
    // A repository that has become private retains its selected metadata for
    // offline compatibility, while contributing no PRs to public totals.
    for (const [key, pr] of all) {
      if (repositoryMetadata.get(pr.repository)?.public === false) all.delete(key);
    }
    const statistics = summarizePullRequests([...all.values()]);
    const repositories = new Map(statistics.repositories.map(row => [row.name, row]));
    for (const [name, metadata] of repositoryMetadata) {
      repositories.set(name, {
        ...(repositories.get(name) ?? { name, total: 0, merged: 0, open: 0, closed: 0 }),
        ...metadata,
      });
    }
    snapshot = validateSnapshot({
      version: SNAPSHOT_VERSION,
      username: USERNAME,
      fetchedAt: now().toISOString(),
      summary: statistics.summary,
      repositories: [...repositories.values()].sort((a, b) => a.name.localeCompare(b.name)),
      pullRequests,
    }, selection);
  } catch (failure) {
    error = failure.message;
  }
  if (!snapshot) throw new Error(`No valid snapshot for the current selected PRs: ${error}`);
  const filename = cachePath instanceof URL ? fileURLToPath(cachePath) : cachePath;
  await mkdir(dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp`;
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporary, filename);
  return { snapshot, refreshed: !error, error };
}
