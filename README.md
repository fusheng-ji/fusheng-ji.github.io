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
