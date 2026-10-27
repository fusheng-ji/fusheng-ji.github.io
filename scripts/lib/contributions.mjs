export const USERNAME = "fusheng-ji";
export const SNAPSHOT_VERSION = 2;

export function pullRequestStatus(pr) {
  if (pr.merged_at || pr.pull_request?.merged_at) return "merged";
  if (pr.state === "closed") return "closed";
  return pr.draft ? "draft" : "open";
}

export function normalizePullRequest(pr, repository) {
  if (pr.user?.login?.toLowerCase() !== USERNAME) {
    throw new Error(`Unexpected PR author in ${repository}#${pr.number}`);
  }
  return {
    repository,
    author: USERNAME,
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    status: pullRequestStatus(pr),
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at ?? pr.pull_request?.merged_at ?? null,
  };
}

export function summarizePullRequests(items) {
  const repositories = new Map();
  for (const item of items) {
    const counts = repositories.get(item.repository) ?? {
      name: item.repository, total: 0, merged: 0, open: 0, closed: 0,
    };
    counts.total += 1;
    counts[item.status === "draft" ? "open" : item.status] += 1;
    repositories.set(item.repository, counts);
  }
  const rows = [...repositories.values()].sort((a, b) => a.name.localeCompare(b.name));
  const summary = rows.reduce((total, row) => {
    for (const key of ["total", "merged", "open", "closed"]) total[key] += row[key];
    return total;
  }, { total: 0, merged: 0, open: 0, closed: 0, repositories: rows.length });
  return { summary, repositories: rows };
}

export function validateSnapshot(snapshot, selection) {
  if (snapshot?.version !== SNAPSHOT_VERSION || snapshot.username !== USERNAME
    || !Number.isFinite(Date.parse(snapshot.fetchedAt))) {
    throw new Error("Invalid contribution snapshot metadata");
  }
  const validCounts = counts => ["total", "merged", "open", "closed"].every(
    key => Number.isInteger(counts?.[key]) && counts[key] >= 0,
  ) && counts.total === counts.merged + counts.open + counts.closed;
  const selectedRepositories = new Set(selection.map(item => item.repository));
  if (!validCounts(snapshot.summary) || !Array.isArray(snapshot.repositories)
    || snapshot.summary.repositories !== snapshot.repositories.filter(row => row.total > 0).length) {
    throw new Error("Invalid contribution totals");
  }
  const seenRepositories = new Set();
  for (const row of snapshot.repositories) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(row.name) || row.name.split("/")[0].toLowerCase() === USERNAME
      || seenRepositories.has(row.name) || !validCounts(row)) {
      throw new Error("Invalid external repository statistics");
    }
    if (selectedRepositories.has(row.name) && (!Number.isInteger(row.stars) || row.stars < 0
      || typeof row.public !== "boolean" || typeof row.isContributor !== "boolean"
      || (!row.public && row.total !== 0))) {
      throw new Error(`Invalid selected repository metadata for ${row.name}`);
    }
    seenRepositories.add(row.name);
  }
  for (const key of ["total", "merged", "open", "closed"]) {
    if (snapshot.repositories.reduce((sum, row) => sum + row[key], 0) !== snapshot.summary[key]) {
      throw new Error("Repository totals do not match summary");
    }
  }
  const expected = new Set(selection.map(item => `${item.repository}#${item.number}`));
  if (expected.size !== selection.length) throw new Error("Duplicate selected contributions");
  if (!Array.isArray(snapshot.pullRequests) || snapshot.pullRequests.length !== expected.size) {
    throw new Error("Incomplete selected contribution snapshot");
  }
  for (const pr of snapshot.pullRequests) {
    const key = `${pr.repository}#${pr.number}`;
    if (!expected.delete(key) || !seenRepositories.has(pr.repository)
      || pr.author !== USERNAME || !Number.isInteger(pr.number) || pr.number <= 0
      || pr.url !== `https://github.com/${pr.repository}/pull/${pr.number}`
      || typeof pr.title !== "string" || !pr.title.trim()
      || !["merged", "open", "draft", "closed"].includes(pr.status)
      || !Number.isFinite(Date.parse(pr.createdAt)) || !Number.isFinite(Date.parse(pr.updatedAt))
      || (pr.status === "merged" ? !Number.isFinite(Date.parse(pr.mergedAt)) : pr.mergedAt !== null)) {
      throw new Error(`Invalid selected PR ${key}`);
    }
  }
  return snapshot;
}
