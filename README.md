# Wenbo Ji — personal research portfolio

Source for [fusheng-ji.github.io](https://fusheng-ji.github.io/), a static
research portfolio built with Eleventy and deployed on GitHub Pages. This
repository contains Wenbo Ji's personal profile, research record, and site
maintenance tooling; it is not the reusable starter distribution.

> [!IMPORTANT]
> Looking for the reusable version? Use
> [fusheng-ji/academic-homepage-template](https://github.com/fusheng-ji/academic-homepage-template).

## Local development

Use Node.js 22.22.0 (see `.nvmrc`) and npm 10 or newer.

```sh
npm ci
npm run dev
npm run build
npm run check
npm run test:e2e
```

`npm run build` writes the deployable site to `_site/`. Generated assets use
content-hashed filenames and are referenced through
`src/_data/asset-manifest.json`. Edit source files under `src/` and `public/`;
do not edit generated output in `_site/`.

## Maintenance notes

### Open-source contributions

The homepage displays 20 reviewed technical PRs in eight independent repositories
as one vertical list, without category headings. The explicit repository order
preserves the current sequence, with at most five PRs per repository. Both Open and Merged work appears
inside native, initially closed `Selected PRs` disclosures. Each PR has an accessible
status icon and short PR link, without tags or a repeated Open/Merged caption; drafts
and closed-unmerged PRs are excluded.
Repository logos, project introductions, stars, and contribution summaries
remain visible when evidence is collapsed. Expanded evidence follows technical
topics: a compact mechanism-and-result paragraph, then a short PR link. Keep
hardware/model conditions and material numerical or support limits with the result.
Only the reviewed TP4-to-EP4 extension has an explicit sequence label;
independent patches stay parallel. Narratives are joined to the filtered view,
so a hidden PR removes its explanation and an incomplete chain loses its label.
The section is static HTML with no browser API calls, filters, or pagination.

Edit `selection` and repository summaries in
`src/_data/openSource.js`. Edit repository order, topic text, short link labels,
mechanisms, validation scope, and sequence declarations in
`src/_data/openSourceDetails.js`. Its organization follows the public profile README;
the selected PR set and verified benchmark scopes remain independently curated.
The retired tag taxonomy and job-term mappings are archived in
`docs/open-source-curation.json`, alongside source labels, head revisions,
benchmark scope, and tradeoffs. They are not loaded by the rendering or sync
pipeline. Claims retain upstream evidence and necessary test conditions; do not
infer platform support from a label alone.

Selection order expresses technical priority within each repository and remains
stable when a PR merges. The five-entry cap follows filtering, without filling
unused slots from unreviewed PRs. Favor
substantive model integration, systems design, kernels, measurable improvements,
and correctness work; documentation and minor maintenance alone do not qualify.
Do not imply acceptance for Open work or generalize a benchmark beyond its tested
hardware, model, precision, and baseline.

Sync refreshes GitHub titles, statuses, dates, repository stars, and Contributor
membership without changing the selection or editorial metadata. Contributor membership
requires a verified GitHub listing. Displayed selected totals and complete
external PR statistics remain separate in the snapshot. Technical evidence is
reviewed again when upstream scope changes; status refresh alone is not a new
technical review.

Run `npm run sync:contributions` before building to refresh the local, ignored
`.cache/contributions.json` snapshot. `GITHUB_TOKEN` is optional locally and
avoids anonymous API limits. Ordinary builds work offline using the cache or
the checked-in initial snapshot.

The existing Pages workflow also runs every Monday at 06:17 UTC, as well as
on pushes to `main` and manual dispatch. It uses the built-in token with the
existing read-only repository permission. Fresh data is published with the
site at `/assets/data/open-source.json`; no bot commits or extra secrets are
needed. On API failure, syncing retains the latest valid local or published
snapshot (or the initial snapshot on first deployment), logs a warning, and
preserves its successful sync date. Invalid or partial results are never
published as fresh data. New featured PRs require a manual selection change;
run `npm run sync:contributions -- --write-seed` to regenerate the initial
snapshot for that selection before committing. This flag writes the source
snapshot only after a successful sync; scheduled jobs never use it.

`npm run test:contributions` exercises GitHub pagination, Contributor verification,
curation, status changes, and failure recovery without network requests.

Downloadable Blender projects, the TUM CV Challenge poster, the CSG-Fusion
poster, and the preserved LiteTracker source image live in the repository's
`site-assets-v1` GitHub Release. `SHA256SUMS` in that release verifies the
files.

Only web-ready derivatives are tracked. Personal photo originals and language
certificates are private and are not part of the public Release.

`.github/workflows/pages.yml` builds, validates, tests, and deploys `_site/`
with the official GitHub Pages Actions workflow. The workflow has only
`contents: read`, `pages: write`, and `id-token: write` permissions.

The repository was migrated away from tracked build dependencies and large
binary source files. Clones made before the `site-assets-v1` migration should
be deleted and cloned again; do not merge or push the old object history back
into `main`.

## Licensing

Site code and build tooling are available under the [MIT License](LICENSE).
Personal content, research artifacts, photos, documents, and third-party
branding are excluded; see [NOTICE.md](NOTICE.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
