# Woojin Kim's writing site

Published articles are closed GitHub Issues authored by `xhae123`, excluding issues with the `excluded` label. An issue title supplies the article title; its Markdown body supplies the content. Run `npm run build` to regenerate the site. The workflow rebuilds and publishes from `main`.

## Shared article presentation

Every article uses the same template and `blog.css`. Markdown `**emphasis**` becomes `<strong>` and receives the shared pink highlight. Blockquotes use the shared blockquote treatment.

Article source may contain semantic HTML such as figures, captions, tables, and heading IDs. It must not contain stylesheets, inline styles, executable HTML, presentational attributes, custom CSS classes, or the presentational `<b>` tag. Use Markdown emphasis or semantic `<strong>`. The existing `aside.sidebar` and code-language classes are allowed. Syntax-highlighting classes are generated after the source check.

Local section edits live in `content/article-sections/<post-slug>/<heading-id>.html`. Each file starts with its matching `<h2 id="…">` and replaces that section through the next H2 during a build. Missing or ambiguous source headings fail the build. Issues still control publication and all other content. Preview a section edit offline with `node scripts/preview-article.js <post-slug>` against the existing local page.

For a swipeable image collection, use a semantic `<section data-gallery aria-label="…">` containing an `<ol>` of figures with unlinked images and descriptive captions. The shared stylesheet and script place arrows with generous hit areas and a page count over the images. A progress line straddles the image's bottom edge and advances to the next screen after six seconds, looping after the last screen. Hover, touch hold, keyboard focus, offscreen position, and a hidden browser tab pause playback; the counter also contains a pause/resume control. Reduced-motion preferences disable automatic playback by default. Images remain scrollable without JavaScript and all figures appear when printing. Gallery images use the same 8:5 aspect ratio so the controls remain aligned while swiping.

`scripts/article-presentation.js` enforces these rules during every build. It also rejects article-body modifier classes and emphasis selectors outside the two shared rules. Build errors stop publication rather than silently applying an article-specific appearance.

Do not add slug-dependent classes or article-specific CSS to `scripts/build.js`. Improve shared semantic elements when an article needs a better figure or caption layout. These checks govern the publishing pipeline; repository maintainers can still change the shared policy through code review.

## Search appearance and analytics

The shared document-head finalizer is used by full builds, portfolio builds, and local translations. `scripts/seo.js` defines page-specific descriptions, social previews, and WebSite/Person/ProfilePage/BlogPosting metadata. It changes the document head rather than article prose. Article modification dates come from the source Issue; unknown static-page modification dates are omitted from the sitemap instead of being reset on each build.

`scripts/analytics.js` installs the owner's Umami Cloud tracker once per published page. It runs on `xhae123.github.io`, excludes section fragments from reported URLs, and is not installed on legacy redirect pages. Future posts inherit it automatically. The website ID is public; it is not a dashboard credential. Local previews do not send visits.

Google Search Console can use `https://xhae123.github.io/sitemap.xml`. The existing ownership-verification tag is preserved. Changes to search appearance depend on Google's recrawl and indexing; metadata supplies accurate descriptions rather than guaranteeing rankings or a specific search-result layout.
