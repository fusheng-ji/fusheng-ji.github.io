# Contributing

This is a personal research portfolio, so content changes are maintained by
Wenbo Ji. Reusable engineering improvements and well-scoped bug fixes are
welcome.

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
