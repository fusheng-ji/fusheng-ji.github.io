export function contributionView(snapshot, selection, repositorySummaries) {
  for (const name of new Set(selection.map(item => item.repository))) {
    if (typeof repositorySummaries?.[name] !== "string" || !repositorySummaries[name].trim()) {
      throw new Error(`Missing technical summary for ${name}`);
    }
  }
  const metadata = new Map(snapshot.pullRequests.map(pr => [`${pr.repository}#${pr.number}`, pr]));
  const repositories = new Map(snapshot.repositories.map(repository => [repository.name, repository]));
  const groups = new Map();
  for (const item of selection) {
    const pr = metadata.get(`${item.repository}#${item.number}`);
    const repository = repositories.get(item.repository);
    if (!repository?.public || !pr || !["open", "merged"].includes(pr.status)) continue;
    if (!groups.has(item.repository)) {
      const stars = repository.stars;
      groups.set(item.repository, {
        name: item.repository,
        label: item.repository.split("/")[1],
        url: `https://github.com/${item.repository}`,
        stars,
        starsLabel: stars >= 1000 ? `${(stars / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(stars),
        isContributor: repository.isContributor,
        technicalSummary: repositorySummaries[item.repository],
        pullRequests: [],
      });
    }
    groups.get(item.repository).pullRequests.push({ ...item, ...pr });
  }
  const repositoryGroups = [...groups.values()].sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
  const summary = { merged: 0, open: 0, repositories: repositoryGroups.length, total: 0 };
  for (const group of repositoryGroups) {
    // Technical priority is editorial, independent of acceptance status. Never
    // fill unused slots with PRs outside the reviewed selection.
    group.pullRequests = group.pullRequests.slice(0, 5);
    for (const pr of group.pullRequests) {
      summary[pr.status] += 1;
      summary.total += 1;
    }
  }
  return { repositoryGroups, summary };
}
