export function contributionView(snapshot, selection, categories, repositorySummaries) {
  for (const name of new Set(selection.map(item => item.repository))) {
    if (typeof repositorySummaries?.[name] !== "string" || !repositorySummaries[name].trim()) {
      throw new Error(`Missing technical summary for ${name}`);
    }
  }
  const metadata = new Map(snapshot.pullRequests.map(pr => [`${pr.repository}#${pr.number}`, pr]));
  const repositories = new Map(snapshot.repositories.map(repository => [repository.name, repository]));
  const categoryIndex = new Map(categories.map(category => [category.id, category]));
  const groups = new Map();
  for (const item of selection) {
    const pr = metadata.get(`${item.repository}#${item.number}`);
    const repository = repositories.get(item.repository);
    if (!repository?.public || !pr || !["open", "merged"].includes(pr.status)) continue;
    const category = categoryIndex.get(item.category);
    if (!category) throw new Error(`Unknown contribution category: ${item.category}`);
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
    groups.get(item.repository).pullRequests.push({ ...item, ...pr, category });
  }
  const repositoryGroups = [...groups.values()].sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
  const summary = { merged: 0, open: 0, repositories: repositoryGroups.length, total: 0 };
  for (const group of repositoryGroups) {
    // Stable sorting preserves manual priority within each status, and never
    // fills unused slots with PRs outside the approved technical selection.
    group.pullRequests = group.pullRequests
      .sort((a, b) => Number(b.status === "merged") - Number(a.status === "merged"))
      .slice(0, 5);
    group.categories = [...new Map(group.pullRequests.map(pr => [pr.category.id, pr.category])).values()];
    group.mergedPullRequests = group.pullRequests.filter(pr => pr.status === "merged");
    for (const pr of group.pullRequests) {
      summary[pr.status] += 1;
      summary.total += 1;
    }
  }
  return { repositoryGroups, summary };
}
