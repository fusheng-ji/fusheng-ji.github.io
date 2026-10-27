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

The homepage groups 20 curated technical PRs by external public repository,
with at most five entries per repository. Open and merged technical work informs
the visible repository summaries and category tags; draft and closed-unmerged PRs
do not qualify a repository for display. Entries are rendered
as compact static HTML, with no filters, pagination, or browser API requests.
Each repository heading pairs its name with deduplicated contribution types.
One concise technical summary remains visible for each eligible repository. Only merged
PRs appear as evidence inside its native, initially closed `Merged PRs` disclosure.
Repositories without merged evidence have no empty disclosure. Evidence rows show
descriptions, links, purple merge icons, and optional mechanism tags; statistics, sync dates, and repository metadata
stay in the data snapshot rather than appearing on the homepage.
Edit the selection, repository summaries, English descriptions, contribution categories, and optional
mechanism tags in `src/_data/openSource.js`. Every selected repository needs a
nonempty editorial summary, including proposed work without implying acceptance.
Review the technical substance before
adding a PR; formatting, documentation, dependency declarations, and small
maintenance fixes do not qualify, and new PRs never fill unused slots automatically.
Selection order expresses technical priority within each repository; merged work
is placed first before the five-entry cap is applied.

Sync refreshes GitHub titles, statuses, dates, repository stars, and Contributor
membership without changing the curated selection. Repositories are ordered by
stars, but technical work in smaller repositories is eligible too. Contributor
membership requires a verified GitHub listing. Derived totals count eligible
selected Open/Merged work, separately from the merged evidence list and the
complete external PR statistics stored in the snapshot.

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
