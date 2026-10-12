// Public website identifier supplied by the site owner; this is not an API key.
export const umamiWebsiteId = 'b50b4b5c-7887-4c32-9970-42ac27783784';

export function installAnalytics($) {
  // One tracker per document, restricted to the production hostname. Ignore
  // section fragments so reports group a post under its page URL.
  $('script[src="https://cloud.umami.is/script.js"]').remove();
  $.root().append(`<script defer src="https://cloud.umami.is/script.js" data-website-id="${umamiWebsiteId}" data-domains="xhae123.github.io" data-exclude-hash="true"></script>`);
}
