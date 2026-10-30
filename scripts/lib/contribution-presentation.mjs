// Presentation follows the already filtered, capped view. Editorial narratives
// cannot re-admit closed/draft PRs or leave evidence for a hidden contribution.
export function contributionPresentation(view, details) {
  const repositoryGroups = view.repositoryGroups.map(repository => {
    const topics = new Map();
    for (const pr of repository.pullRequests) {
      const narrative = details.records[`${repository.name}#${pr.number}`];
      if (!narrative) throw new Error(`Missing contribution narrative for ${repository.name}#${pr.number}`);
      if (!topics.has(narrative.topic)) topics.set(narrative.topic, { title: narrative.topic, pullRequests: [] });
      topics.get(narrative.topic).pullRequests.push({ ...pr, ...narrative });
    }
    for (const topic of topics.values()) {
      const sequence = details.sequences.find(item => item.repository === repository.name
        && item.numbers.length === topic.pullRequests.length
        && item.numbers.every((number, index) => topic.pullRequests[index].number === number));
      if (sequence) topic.sequenceLabel = sequence.label;
    }
    const pullRequests = [...topics.values()].flatMap(topic => topic.pullRequests);
    return { ...repository, pullRequests, topics: [...topics.values()] };
  });
  const repositories = new Map(repositoryGroups.map(repository => [repository.name, repository]));
  const ordered = details.repositoryOrder.filter(name => repositories.has(name));
  if (new Set(ordered).size !== repositoryGroups.length || ordered.length !== repositoryGroups.length) {
    throw new Error("Each displayed repository must occur exactly once in the contribution order");
  }
  return { ...view, repositoryGroups: ordered.map(name => repositories.get(name)) };
}
