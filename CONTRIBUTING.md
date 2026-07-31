# Contributing

This repository is Wenbo Ji's personal research portfolio. Biography,
research, publication, experience, and media changes are maintained by Wenbo
Ji and are not open for general contribution.

For reusable components, template features, customization questions, or bugs
that apply to academic homepages generally, contribute to
[fusheng-ji/academic-homepage-template](https://github.com/fusheng-ji/academic-homepage-template)
instead. This repository accepts only narrowly scoped fixes for behavior that
is specific to the deployed personal site.

## Development

1. Use Node.js 22.22.0.
2. Run `npm ci`.
3. Make changes in `src/` or `public/`; do not edit `_site/`.
4. Run:

   ```bash
   npm run build
   npm run check
   npm run test:e2e
   ```

5. Keep public URLs, section anchors, semantic heading order, keyboard access,
   reduced-motion behavior, and JavaScript-free content intact.

Do not add unoptimized source media, personal documents, generated output,
dependency directories, or files larger than 1 MiB. Large downloadable
artifacts belong in a versioned GitHub Release with SHA-256 checksums.

By contributing code, you agree that it may be distributed under the MIT
License. Do not submit third-party or personal media without explicit rights.
