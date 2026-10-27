import assert from "node:assert/strict";
import { test } from "node:test";
import openSource from "../../src/_data/openSource.js";
import { contributionView } from "../lib/contribution-view.mjs";

const { selection, categories, repositorySummaries, seedSnapshot: initialSnapshot } = openSource({ configurationOnly: true });
const clone = value => JSON.parse(JSON.stringify(value));
// Keep transition fixtures independent of the periodically refreshed offline snapshot.
const seedSnapshot = clone(initialSnapshot);
for (const pr of seedSnapshot.pullRequests) {
  pr.status = pr.repository === "xdit-project/xDiT" && pr.number === 852 ? "merged" : "open";
  pr.mergedAt = pr.status === "merged" ? "2026-10-05T13:56:16Z" : null;
}
for (const repo of seedSnapshot.repositories) {
  repo.isContributor = ["vllm-project/vllm-omni", "xdit-project/xDiT"].includes(repo.name);
}
const view = (snapshot = seedSnapshot, curated = selection, summaries = repositorySummaries) => contributionView(snapshot, curated, categories, summaries);

test("approved technical selection determines groups, tags, and displayed totals", () => {
  const result = view();
  const prs = result.repositoryGroups.flatMap(group => group.pullRequests);
  assert.equal(prs.length, selection.length);
  assert.equal(result.summary.total, result.summary.open + result.summary.merged);
  assert.equal(result.summary.repositories, result.repositoryGroups.length);
  assert.equal(result.summary.total, prs.length);
  assert.ok(prs.every(pr => categories.some(category => category.id === pr.category.id)));
  assert.ok(prs.every(pr => pr.description && pr.mechanism));
  assert.ok(!prs.some(pr => pr.repository === "xdit-project/xDiT" && [867, 826, 881, 844, 843].includes(pr.number)));
  assert.ok(!prs.some(pr => pr.repository === "vllm-project/vllm-omni" && pr.number === 8474));
  assert.ok(result.repositoryGroups.every(group => group.pullRequests.length <= 5));
  assert.ok(result.repositoryGroups.every(group => group.technicalSummary === repositorySummaries[group.name]));
  assert.deepEqual(result.repositoryGroups.find(group => group.name === "xdit-project/xDiT").mergedPullRequests.map(pr => pr.number), [852]);
  assert.deepEqual(result.repositoryGroups.find(group => group.name === "sgl-project/sglang").mergedPullRequests, []);
  assert.deepEqual(result.repositoryGroups.find(group => group.name === "hao-ai-lab/FastVideo").categories.map(category => category.id),
    ["generative", "kernels"]);
  assert.deepEqual(result.repositoryGroups.find(group => group.name === "sgl-project/sglang").categories.map(category => category.id),
    ["distributed"]);
});

test("repository categories exclude hidden PRs and follow the final merged-first order", () => {
  const snapshot = clone(seedSnapshot);
  const fastVideo = () => view(snapshot).repositoryGroups.find(group => group.name === "hao-ai-lab/FastVideo");
  snapshot.pullRequests.find(pr => pr.repository === "hao-ai-lab/FastVideo" && pr.number === 1900).status = "merged";
  assert.deepEqual(fastVideo().categories.map(category => category.id), ["kernels", "generative"]);
  for (const status of ["draft", "closed"]) {
    snapshot.pullRequests.find(pr => pr.repository === "hao-ai-lab/FastVideo" && pr.number === 1903).status = status;
    assert.deepEqual(fastVideo().categories.map(category => category.id), ["kernels"]);
  }
});

test("draft, closed, private, and emptied groups do not appear in the static view", () => {
  const snapshot = clone(seedSnapshot);
  const removedRepository = "sgl-project/sglang";
  const hidden = new Set();
  for (const pr of snapshot.pullRequests) {
    if (pr.repository === removedRepository) {
      pr.status = pr.number === 42422 ? "draft" : "closed";
      hidden.add(pr.url);
    }
  }
  snapshot.repositories.find(repo => repo.name === "hao-ai-lab/FastVideo").public = false;
  const result = view(snapshot);
  assert.ok(!result.repositoryGroups.some(repo => [removedRepository, "hao-ai-lab/FastVideo"].includes(repo.name)));
  assert.ok(!result.repositoryGroups.flatMap(repo => repo.pullRequests).some(pr => hidden.has(pr.url)));
  assert.equal(result.summary.total, selection.length - 5);
});

test("a new merge changes display counts and moves ahead of higher-priority open PRs", () => {
  const snapshot = clone(seedSnapshot);
  const merged = snapshot.pullRequests.find(pr => pr.repository === "sgl-project/sglang" && pr.number === 42423);
  merged.status = "merged";
  merged.mergedAt = "2026-10-06T06:17:00Z";
  const before = view();
  const after = view(snapshot);
  assert.equal(after.repositoryGroups.find(repo => repo.name === merged.repository).pullRequests[0].number, 42423);
  assert.equal(after.summary.merged, before.summary.merged + 1);
  assert.equal(after.summary.open, before.summary.open - 1);
  assert.equal(after.summary.total, before.summary.total);
  assert.deepEqual(after.repositoryGroups.find(repo => repo.name === merged.repository).mergedPullRequests.map(pr => pr.number), [42423]);
  assert.equal(after.repositoryGroups.find(repo => repo.name === merged.repository).technicalSummary,
    before.repositoryGroups.find(repo => repo.name === merged.repository).technicalSummary);
});

test("five-per-repository cap preserves merged entries then technical priority", () => {
  const snapshot = clone(seedSnapshot);
  const base = selection.find(pr => pr.repository === "hao-ai-lab/FastVideo");
  const metadata = snapshot.pullRequests.find(pr => pr.repository === base.repository);
  const extras = [2000, 2001, 2002].map((number, index) => ({
    ...base, number, category: ["serving", "kernels", "rendering"][index],
    description: "An explicitly reviewed technical contribution.",
  }));
  for (const extra of extras) snapshot.pullRequests.push({
    ...metadata, number: extra.number, url: `https://github.com/${base.repository}/pull/${extra.number}`,
    status: extra.number === 2000 ? "merged" : "open",
    mergedAt: extra.number === 2000 ? "2026-10-06T06:17:00Z" : null,
  });
  const result = view(snapshot, [...selection, ...extras]);
  const group = result.repositoryGroups.find(repo => repo.name === base.repository);
  assert.deepEqual(group.pullRequests.map(pr => pr.number), [2000, 1903, 1900, 1899, 2001]);
  assert.deepEqual(group.categories.map(category => category.id), ["serving", "generative", "kernels"]);
  assert.equal(result.summary.total, selection.length + 2);
  for (const pr of snapshot.pullRequests.filter(pr => pr.repository === base.repository)) {
    pr.status = "merged";
    pr.mergedAt = "2026-10-06T06:17:00Z";
  }
  const allMerged = view(snapshot, [...selection, ...extras]).repositoryGroups.find(repo => repo.name === base.repository);
  assert.deepEqual(allMerged.mergedPullRequests.map(pr => pr.number), [1903, 1900, 1899, 2000, 2001]);
});

test("the six reviewed merges are included in the offline snapshot and grouped evidence", () => {
  const result = view(initialSnapshot);
  const expected = [
    ["Dao-AILab/flash-attention", 2983], ["RL-Align/RL-Kernel", 576],
    ["xdit-project/xDiT", 902], ["xdit-project/xDiT", 851],
    ["vllm-project/vllm-omni", 8450], ["vllm-project/vllm-omni", 8483],
  ];
  for (const [repository, number] of expected) {
    const group = result.repositoryGroups.find(repo => repo.name === repository);
    const pr = group.mergedPullRequests.find(pr => pr.number === number);
    assert.ok(pr, `${repository}#${number} must appear as merged evidence`);
    assert.equal(pr.author, "fusheng-ji");
    assert.ok(pr.mechanism);
    assert.ok(group.categories.some(category => category.id === pr.category.id));
    assert.ok(group.pullRequests.length <= 5);
  }
});

test("unapproved PRs never fill empty slots and approved new repositories appear automatically", () => {
  const snapshot = clone(seedSnapshot);
  const base = snapshot.pullRequests[0];
  snapshot.repositories.push({ name: "example/new-project", stars: 50000, public: true, isContributor: false });
  snapshot.pullRequests.push({ ...base, repository: "example/new-project", number: 100,
    url: "https://github.com/example/new-project/pull/100" });
  assert.equal(view(snapshot).summary.total, selection.length);
  const curated = [...selection, { repository: "example/new-project", number: 100,
    description: "Implement a reviewed CUDA attention kernel.", category: "kernels", mechanism: "CUDA" }];
  assert.throws(() => view(snapshot, curated), /Missing technical summary for example\/new-project/);
  const result = view(snapshot, curated, { ...repositorySummaries, "example/new-project": "Submitted work on CUDA attention." });
  assert.equal(result.repositoryGroups[0].name, "example/new-project");
  assert.equal(result.summary.total, selection.length + 1);
});

test("missing or empty editorial summaries are rejected even when a repository is hidden", () => {
  const snapshot = clone(seedSnapshot);
  for (const pr of snapshot.pullRequests) pr.status = "closed";
  for (const summary of [undefined, "", "   ", 123]) {
    assert.throws(() => view(snapshot, selection, { ...repositorySummaries, "sgl-project/sglang": summary }),
      /Missing technical summary for sgl-project\/sglang/);
  }
});

test("repository ordering, verified roles, optional mechanism, and empty state are deterministic", () => {
  const snapshot = clone(seedSnapshot);
  for (const row of snapshot.repositories) row.stars = 1000;
  const result = view(snapshot);
  const names = result.repositoryGroups.map(repo => repo.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  assert.deepEqual(result.repositoryGroups.filter(repo => repo.isContributor).map(repo => repo.name),
    ["vllm-project/vllm-omni", "xdit-project/xDiT"]);
  const noMechanism = selection.map(({ mechanism: _mechanism, ...pr }) => pr);
  assert.ok(view(snapshot, noMechanism).repositoryGroups.flatMap(repo => repo.pullRequests).every(pr => pr.mechanism === undefined));
  for (const pr of snapshot.pullRequests) pr.status = "closed";
  assert.deepEqual(view(snapshot), { repositoryGroups: [], summary: { merged: 0, open: 0, repositories: 0, total: 0 } });
});
