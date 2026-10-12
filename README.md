# Woojin Kim's writing site

Published articles are closed GitHub Issues authored by `xhae123`, excluding issues with the `excluded` label. An issue title supplies the article title; its Markdown body supplies the content. Run `npm run build` to regenerate the site. The workflow rebuilds and publishes from `main`.

## Shared article presentation

Every article uses the same template and `blog.css`. Markdown `**emphasis**` becomes `<strong>` and receives the shared pink highlight. Blockquotes use the shared blockquote treatment.

Article source may contain semantic HTML such as figures, captions, tables, and heading IDs. It must not contain stylesheets, inline styles, executable HTML, presentational attributes, custom CSS classes, or the presentational `<b>` tag. Use Markdown emphasis or semantic `<strong>`. The existing `aside.sidebar` and code-language classes are allowed. Syntax-highlighting classes are generated after the source check.

`scripts/article-presentation.js` enforces these rules during every build. It also rejects article-body modifier classes and emphasis selectors outside the two shared rules. Build errors stop publication rather than silently applying an article-specific appearance.

Do not add slug-dependent classes or article-specific CSS to `scripts/build.js`. Improve shared semantic elements when an article needs a better figure or caption layout. These checks govern the publishing pipeline; repository maintainers can still change the shared policy through code review.
