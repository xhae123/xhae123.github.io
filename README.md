# Woojin Kim's writing site

Published articles are closed GitHub Issues authored by `xhae123`, excluding issues with the `excluded` label. An issue title supplies the article title; its Markdown body supplies the content. Run `npm run build` to regenerate the site. The workflow rebuilds and publishes from `main`.

## Shared article presentation

Every article uses the same template and `blog.css`. Markdown `**emphasis**` becomes `<strong>` and receives the shared pink highlight. Blockquotes use the shared blockquote treatment.

Article source may contain semantic HTML such as figures, captions, tables, and heading IDs. It must not contain stylesheets, inline styles, executable HTML, presentational attributes, custom CSS classes, or the presentational `<b>` tag. Use Markdown emphasis or semantic `<strong>`. The existing `aside.sidebar` and code-language classes are allowed. Syntax-highlighting classes are generated after the source check.

`scripts/article-presentation.js` enforces these rules during every build. It also rejects article-body modifier classes and emphasis selectors outside the two shared rules. Build errors stop publication rather than silently applying an article-specific appearance.

Do not add slug-dependent classes or article-specific CSS to `scripts/build.js`. Improve shared semantic elements when an article needs a better figure or caption layout. These checks govern the publishing pipeline; repository maintainers can still change the shared policy through code review.

## Search appearance and analytics

The shared document-head finalizer is used by full builds, portfolio builds, and local translations. `scripts/seo.js` defines page-specific descriptions, social previews, and WebSite/Person/ProfilePage/BlogPosting metadata. It changes the document head rather than article prose. Article modification dates come from the source Issue; unknown static-page modification dates are omitted from the sitemap instead of being reset on each build.

`scripts/analytics.js` installs the owner's Umami Cloud tracker once per published page. It runs on `xhae123.github.io`, excludes section fragments from reported URLs, and is not installed on legacy redirect pages. Future posts inherit it automatically. The website ID is public; it is not a dashboard credential. Local previews do not send visits.

Google Search Console can use `https://xhae123.github.io/sitemap.xml`. The existing ownership-verification tag is preserved. Changes to search appearance depend on Google's recrawl and indexing; metadata supplies accurate descriptions rather than guaranteeing rankings or a specific search-result layout.
