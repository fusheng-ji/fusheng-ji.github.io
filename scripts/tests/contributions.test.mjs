import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { refreshContributions } from "../lib/sync-contributions.mjs";
import { SNAPSHOT_VERSION, USERNAME, summarizePullRequests, validateSnapshot } from "../lib/contributions.mjs";

const clone = value => JSON.parse(JSON.stringify(value));
const selection = [
  { repository: "example/alpha", number: 1 },
  { repository: "example/alpha", number: 2 },
  { repository: "example/beta", number: 3 },
];
const timestamp = "2026-10-06T06:17:00.000Z";
const seedPullRequests = selection.map((item, index) => ({
  ...item, author: USERNAME, title: `Technical contribution ${item.number}`,
  url: `https://github.com/${item.repository}/pull/${item.number}`,
  status: ["merged", "draft", "open"][index],
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
  mergedAt: index === 0 ? "2026-10-01T00:00:00Z" : null,
}));
const seedStatistics = summarizePullRequests(seedPullRequests);
const seedSnapshot = {
  version: SNAPSHOT_VERSION, username: USERNAME, fetchedAt: "2026-10-05T18:00:00.000Z",
  summary: seedStatistics.summary,
  repositories: seedStatistics.repositories.map(row => ({ ...row, stars: 100, public: true,
    isContributor: row.name === "example/alpha" })),
  pullRequests: seedPullRequests,
};

function fixture() {
  const prs = seedPullRequests.map(item => ({
    number: item.number, title: item.title, html_url: item.url,
    state: item.status === "merged" || item.status === "closed" ? "closed" : "open",
    draft: item.status === "draft", user: { login: USERNAME },
    created_at: item.createdAt, updated_at: item.updatedAt, merged_at: item.mergedAt,
    repository_url: `https://api.github.com/repos/${item.repository}`,
    pull_request: { merged_at: item.mergedAt }, base: { repo: { full_name: item.repository } },
  }));
  const details = new Map(prs.map(pr => [pr.html_url.replace("https://github.com/", "/repos/").replace("/pull/", "/pulls/"), pr]));
  const repositories = new Map(seedSnapshot.repositories.map(row => [row.name, {
    full_name: row.name, private: !row.public, stargazers_count: row.stars,
  }]));
  const contributors = new Map(seedSnapshot.repositories.map(row => [row.name,
    row.isContributor ? [{ login: USERNAME }] : []]));
  return { prs, details, repositories, contributors };
}

function apiFixture({ prs, details, repositories, contributors }, overrides = {}) {
  return async (url, options) => {
    const parsed = new URL(url);
    overrides.requests?.push(parsed);
    if (parsed.hostname === "fusheng-ji.github.io") {
      assert.equal(options.headers.Authorization, undefined, "Never send the token to the published site");
      return { ok: Boolean(overrides.published), status: overrides.published ? 200 : 404,
        json: async () => clone(overrides.published) };
    }
    assert.equal(options.headers.Authorization, "Bearer test-token");
    if (overrides.fail || overrides.failPath === parsed.pathname
      || (overrides.failContributorPage === Number(parsed.searchParams.get("page"))
        && parsed.pathname.endsWith("/contributors"))) return { ok: false, status: 403 };
    if (parsed.pathname === "/search/issues") {
      assert.match(parsed.searchParams.get("q"), /is:public/);
      const page = Number(parsed.searchParams.get("page"));
      const range = parsed.searchParams.get("q").match(/created:(.+)\.\.(.+)$/);
      const matches = range ? prs.filter(pr => Date.parse(pr.created_at) >= Date.parse(range[1])
        && Date.parse(pr.created_at) <= Date.parse(range[2])) : prs;
      return { ok: true, json: async () => ({ total_count: matches.length,
        incomplete_results: Boolean(overrides.incomplete), items: clone(matches.slice((page - 1) * 100, page * 100)) }) };
    }
    const contributorPath = parsed.pathname.match(/^\/repos\/(.+)\/contributors$/);
    if (contributorPath) {
      assert.equal(parsed.searchParams.get("per_page"), "100");
      const list = contributors.get(contributorPath[1]);
      if (!list) return { ok: false, status: 404 };
      if (overrides.empty204 && !list.length) return { ok: true, status: 204,
        json: async () => { throw new Error("204 must not be parsed as JSON"); } };
      const page = Number(parsed.searchParams.get("page"));
      return { ok: true, json: async () => clone(list.slice((page - 1) * 100, page * 100)) };
    }
    const metadata = parsed.pathname.startsWith("/repos/") ? repositories.get(parsed.pathname.slice(7)) : undefined;
    const body = details.get(parsed.pathname) ?? metadata;
    return { ok: Boolean(body), status: body ? 200 : 404, json: async () => clone(body) };
  };
}

async function withCache(callback) {
  const directory = await mkdtemp(join(tmpdir(), "contributions-test-"));
  try {
    await callback(join(directory, "snapshot.json"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function refresh(cachePath, fetchImpl) {
  return refreshContributions({ selection, seedSnapshot, cachePath, fetchImpl,
    token: "test-token", now: () => new Date(timestamp), sleep: async () => {} });
}

test("paginated public external statistics use authoritative selected PR statuses", async () => {
  await withCache(async cachePath => {
    const data = fixture();
    const open = data.prs.find(pr => pr.state === "open" && !pr.draft);
    const updated = clone(open);
    updated.state = "closed";
    updated.merged_at = timestamp;
    updated.title = "An updated upstream title";
    data.details.set(updated.html_url.replace("https://github.com/", "/repos/").replace("/pull/", "/pulls/"), updated);
    data.prs.push({ ...clone(open), number: 1, repository_url: `https://api.github.com/repos/${USERNAME}/personal-project` });
    for (let number = 2000; number < 2120; number += 1) {
      data.prs.push({ ...clone(open), number, html_url: `https://github.com/example/upstream/pull/${number}`,
        repository_url: "https://api.github.com/repos/example/upstream" });
    }
    const requests = [];
    const result = await refresh(cachePath, apiFixture(data, { requests }));
    assert.equal(result.refreshed, true, result.error);
    assert.equal(result.snapshot.summary.total, selection.length + 120);
    assert.equal(result.snapshot.summary.repositories, 3);
    assert.equal(result.snapshot.summary.merged, 2);
    assert.equal(result.snapshot.summary.total, result.snapshot.summary.open + result.snapshot.summary.closed + result.snapshot.summary.merged);
    assert.equal(result.snapshot.pullRequests.length, selection.length, "Uncurated PRs never become selected automatically");
    assert.equal(requests.filter(url => url.pathname === "/search/issues").length, 2);
    const changed = result.snapshot.pullRequests.find(pr => pr.url === updated.html_url);
    assert.equal(changed.title, updated.title);
    assert.equal(changed.status, "merged");
    assert.equal(changed.author, USERNAME);
    assert.equal(result.snapshot.fetchedAt, timestamp);
    assert.deepEqual(JSON.parse(await readFile(cachePath, "utf8")), result.snapshot);
  });
});

test("closed-unmerged and draft states remain distinct", async () => {
  await withCache(async cachePath => {
    const data = fixture();
    const first = data.prs[0];
    first.merged_at = null;
    first.pull_request.merged_at = null;
    const result = await refresh(cachePath, apiFixture(data));
    assert.equal(result.refreshed, true, result.error);
    assert.equal(result.snapshot.pullRequests[0].status, "closed");
    assert.ok(result.snapshot.pullRequests.some(pr => pr.status === "draft"));
    assert.equal(result.snapshot.summary.closed, 1);
  });
});

test("date partitioning collects more than GitHub's 1,000-result search cap", async () => {
  await withCache(async cachePath => {
    const data = fixture();
    const base = data.prs.find(pr => pr.state === "open");
    for (let number = 2000; number < 3001; number += 1) {
      data.prs.push({ ...clone(base), number, html_url: `https://github.com/example/upstream/pull/${number}`,
        created_at: number < 2500 ? "1971-01-01T00:00:00Z" : "2024-01-01T00:00:00Z",
        repository_url: "https://api.github.com/repos/example/upstream" });
    }
    const result = await refresh(cachePath, apiFixture(data));
    assert.equal(result.refreshed, true, result.error);
    assert.equal(result.snapshot.summary.total, selection.length + 1001);
    assert.equal(result.snapshot.pullRequests.length, selection.length);
  });
});

test("repository metadata and fully paginated contributors verify roles case-insensitively", async () => {
  await withCache(async cachePath => {
    const data = fixture();
    data.repositories.get("example/alpha").stargazers_count = 57231;
    data.contributors.set("example/alpha", Array.from({ length: 200 }, (_, index) => ({
      login: index === 150 ? "FUSHENG-JI" : `contributor-${index}`,
    })));
    const requests = [];
    const result = await refresh(cachePath, apiFixture(data, { requests, empty204: true }));
    assert.equal(result.refreshed, true, result.error);
    const alpha = result.snapshot.repositories.find(row => row.name === "example/alpha");
    assert.equal(alpha.stars, 57231);
    assert.equal(alpha.public, true);
    assert.equal(alpha.isContributor, true);
    assert.equal(result.snapshot.repositories.find(row => row.name === "example/beta").isContributor, false);
    assert.deepEqual(requests.filter(url => url.pathname === "/repos/example/alpha/contributors")
      .map(url => Number(url.searchParams.get("page"))), [1, 2, 3]);
  });
});

test("a private selected repository retains metadata but contributes nothing to public totals", async () => {
  await withCache(async cachePath => {
    const data = fixture();
    data.repositories.get("example/alpha").private = true;
    const result = await refresh(cachePath, apiFixture(data));
    assert.equal(result.refreshed, true, result.error);
    assert.deepEqual(result.snapshot.summary, { total: 1, merged: 0, open: 1, closed: 0, repositories: 1 });
    const alpha = result.snapshot.repositories.find(row => row.name === "example/alpha");
    assert.equal(alpha.public, false);
    assert.equal(alpha.total, 0);
    assert.equal(result.snapshot.pullRequests.length, selection.length);
    validateSnapshot(result.snapshot, selection);
  });
});

test("API failure recovers the most recent compatible published snapshot without advancing its date", async () => {
  await withCache(async cachePath => {
    const published = { ...clone(seedSnapshot), fetchedAt: "2026-10-06T01:00:00.000Z" };
    const result = await refresh(cachePath, apiFixture(fixture(), { fail: true, published }));
    assert.equal(result.refreshed, false);
    assert.deepEqual(result.snapshot, published);
    assert.deepEqual(JSON.parse(await readFile(cachePath, "utf8")), published);
  });
});

test("first deployment ignores incompatible published schemas and retains the initial snapshot", async () => {
  await withCache(async cachePath => {
    const published = { ...clone(seedSnapshot), version: SNAPSHOT_VERSION - 1, fetchedAt: timestamp };
    const result = await refresh(cachePath, apiFixture(fixture(), { fail: true, published }));
    assert.equal(result.refreshed, false);
    assert.deepEqual(result.snapshot, seedSnapshot);
  });
});

test("incomplete search and partial PR, repository, or contributor metadata preserve a valid local snapshot", async () => {
  await withCache(async cachePath => {
    const cached = { ...clone(seedSnapshot), fetchedAt: "2026-10-06T02:00:00.000Z" };
    await writeFile(cachePath, JSON.stringify(cached));
    for (const overrides of [
      { incomplete: true },
      { failPath: "/repos/example/alpha/pulls/1" },
      { failPath: "/repos/example/beta" },
      { failPath: "/repos/example/beta/contributors" },
      { failContributorPage: 2 },
    ]) {
      const data = fixture();
      data.contributors.set("example/alpha", Array.from({ length: 100 }, (_, index) => ({
        login: index === 0 ? USERNAME : `person-${index}`,
      })));
      const result = await refresh(cachePath, apiFixture(data, overrides));
      assert.equal(result.refreshed, false);
      assert.deepEqual(result.snapshot, cached);
      assert.equal(result.snapshot.fetchedAt, cached.fetchedAt);
    }
  });
});

test("rejects unexpected authors or upstream repositories instead of misattributing work", async () => {
  await withCache(async cachePath => {
    for (const mutate of [
      first => { first.user.login = "someone-else"; },
      first => { first.base.repo.full_name = "different/upstream"; },
    ]) {
      const data = fixture();
      const first = clone([...data.details.values()][0]);
      mutate(first);
      data.details.set([...data.details.keys()][0], first);
      const result = await refresh(cachePath, apiFixture(data));
      assert.equal(result.refreshed, false);
      assert.match(result.error, /Unexpected PR author|Unexpected upstream PR/);
    }
  });
});

test("invalid repository metadata or contributors responses retain a valid snapshot", async () => {
  await withCache(async cachePath => {
    for (const mutate of [
      data => { data.repositories.get("example/alpha").full_name = "someone/else"; },
      data => { data.repositories.get("example/alpha").stargazers_count = -1; },
      data => { data.repositories.get("example/alpha").private = undefined; },
      data => { data.contributors.set("example/alpha", [null]); },
    ]) {
      const data = fixture();
      mutate(data);
      const result = await refresh(cachePath, apiFixture(data));
      assert.equal(result.refreshed, false);
      assert.deepEqual(result.snapshot, seedSnapshot);
    }
  });
});

test("manually changed curation can create a new snapshot but cannot reuse incompatible fallback data", async () => {
  await withCache(async cachePath => {
    const revisedSelection = selection.slice(1);
    const options = { selection: revisedSelection, seedSnapshot, cachePath, token: "test-token",
      now: () => new Date(timestamp), sleep: async () => {} };
    await assert.rejects(
      refreshContributions({ ...options, fetchImpl: apiFixture(fixture(), { fail: true }) }),
      /No valid snapshot for the current selected PRs/,
    );
    const result = await refreshContributions({ ...options, fetchImpl: apiFixture(fixture()) });
    assert.equal(result.refreshed, true, result.error);
    assert.equal(result.snapshot.pullRequests.length, revisedSelection.length);
    assert.equal(result.snapshot.summary.total, selection.length);
  });
});

test("snapshot validation rejects incompatible curation, author, links, dates, and statistics", () => {
  for (const mutate of [
    data => data.pullRequests.pop(),
    data => { data.version = 1; },
    data => { data.pullRequests[0].author = "someone-else"; },
    data => { data.pullRequests[0].url = "javascript:alert(1)"; },
    data => { data.pullRequests[0].mergedAt = null; },
    data => { data.pullRequests[1].mergedAt = timestamp; },
    data => { data.summary.total += 1; },
    data => { data.summary.repositories += 1; },
    data => { data.repositories[0].name = `${USERNAME}/self`; },
    data => { data.repositories[0].stars = -1; },
    data => { delete data.repositories[0].public; },
    data => { delete data.repositories[0].isContributor; },
    data => { data.repositories[0].public = false; },
  ]) {
    const bad = clone(seedSnapshot);
    mutate(bad);
    assert.throws(() => validateSnapshot(bad, selection));
  }
  assert.throws(() => validateSnapshot(seedSnapshot, [...selection, selection[0]]));
});
