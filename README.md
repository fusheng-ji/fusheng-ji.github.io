# Wenbo Ji — personal research portfolio

Source for [fusheng-ji.github.io](https://fusheng-ji.github.io/), a static
research portfolio built with Eleventy and deployed on GitHub Pages.

The repository is intentionally framework-free in the browser: Eleventy and
Nunjucks generate semantic HTML, esbuild produces one homepage stylesheet and
one homepage JavaScript bundle, and core research content remains readable
without JavaScript.

## Requirements

- Node.js 22.22.0 (see `.nvmrc`)
- npm 10 or newer

## Commands

```bash
npm ci
npm run dev
npm run build
npm run check
npm run test:e2e
```

`npm run build` writes the deployable site to `_site/`. Generated assets use
content-hashed filenames and are referenced through
`src/_data/asset-manifest.json`.

## Repository structure

```text
src/
  _data/          Structured homepage and metadata collections
  _includes/      Reusable Nunjucks components
  _layouts/       Shared page shells
  _schemas/       Content validation contracts
  demos/          Three.js demo source
  scripts/        Browser-side modules
  styles/         Tokens, layout, components, and page styles
public/           Static assets copied as-is
scripts/          Build, validation, media, and repository checks
tests/            Playwright responsive and interaction tests
```

The main content interfaces are:

- `researchArea`: `id`, `label`, `theme`
- `resourceLink`: `type`, `url`, `label`, `external`
- `publication`: `id`, `title`, `venue`, `year`, `area`, `media`,
  `authors[]`, `summary`, `links[]`, and optional `award`
- `experience`: `id`, `title`, `date`, `type`, `area`, `logos[]`,
  `contributions[]`, `mentors[]`

`npm run validate:data` rejects duplicate IDs, unknown research areas or
resource types, missing local media, and media without dimensions or alt text.
The same structured data generates the homepage, JSON-LD, `sitemap.xml`, and
`llms.txt`.

## Large source assets

Downloadable Blender projects, the TUM CV Challenge poster, the TUM DI Lab
report, the CSG-Fusion poster, and the preserved LiteTracker source image live
in the repository's `site-assets-v1` GitHub Release. `SHA256SUMS` in that
release verifies the files.

Only web-ready derivatives are tracked. Personal photo originals and language
certificates are private and are not part of the public Release.

## Deployment

`.github/workflows/pages.yml` builds, validates, tests, and deploys `_site/`
with the official GitHub Pages Actions workflow. The workflow has only
`contents: read`, `pages: write`, and `id-token: write` permissions.

## History rewrite notice

The repository was migrated away from tracked build dependencies and large
binary source files. Clones made before the `site-assets-v1` migration should
be deleted and cloned again; do not merge or push the old object history back
into `main`.

## Licensing

Site code and build tooling are available under the [MIT License](LICENSE).
Personal content, research artifacts, photos, documents, and third-party
branding are excluded; see [NOTICE.md](NOTICE.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
