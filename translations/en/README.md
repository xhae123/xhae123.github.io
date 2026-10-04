# Local English translations

The portfolio and all 16 existing articles are English. The corresponding GitHub Issues are synchronized with the published English copy, including English figure references.

`posts/*.json` contains the English article titles, full body translations, and code-comment replacements. Block keys refer to the zero-based direct children of the existing `.post-body`; the outer elements and heading IDs stay unchanged. `portfolio.json` records the copy translations applied to `scripts/portfolio.js`, which is now the English portfolio source.

Run `npm run translate:local` to apply article translations and rebuild the portfolio and archive offline. The translation step checks that block counts, code-block counts, image sources, and heading IDs have not changed.

Run `npm run test:portfolio` and `npm run test:translations` for local checks.

`npm run build` fetches the synchronized GitHub Issues and rebuilds the complete site. A hidden `slug` comment preserves each English URL independently of its title. Legacy Korean routes remain redirects, and original figures are retained alongside English siblings. The rebuild workflow validates the generated portfolio and translations before committing.

`node scripts/sync-english-issues.js` prepares a checked migration and saves original issues and proposed updates in a temporary backup directory. It is read-only unless `--apply` is supplied; applying requires an authenticated GitHub CLI. Every translated block is checked for preserved text, structure, images, code, and heading anchors before synchronization.

Existing post URLs, source-code identifiers, curriculum standard IDs, and original screenshots are preserved. Text embedded in original screenshots has not been altered. Article prose, headings, tables, captions, code comments, navigation, and metadata are English.

## English figures

`figures.json` records the source-to-English asset mapping and the complete English labels/data supplied for localization. The shared constraints plus each figure's labels form the prompt set. These are text-localization edits made with the built-in image-generation tool, checked against the inspected originals. English siblings are saved in `assets/en/`; originals remain untouched. Two March 22 source files are byte-identical and share one English replacement.

Scope: March 22 diagrams; June 20 metric graphs only; July 22 pipeline figures; July 30 workflow; September 16 diagrams and performance graphs; September 22 memory diagrams. App screenshots, dashboard screenshots, and PR screenshots are excluded. Rebuilding locally reapplies this mapping to article images, cover metadata, and archive thumbnails.

July 22 has ten editable SVG originals. Their English siblings are localized directly as SVG rather than rasterized or regenerated with AI. Text and accessibility labels are translated; vector shapes and measured data are preserved. English formula spacing is adjusted for readability. The served-card screenshot remains unchanged. SVG records use `format: "svg"`; existing raster records default to PNG.
