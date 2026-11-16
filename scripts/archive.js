import { mkdir, writeFile } from 'node:fs/promises';
import { blogCategoryIcons } from './blog-categories.js';
import { englishPostSlug, localizePostUrls } from './post-routes.js';
import { themeHead, themeToggle } from './theme.js';

const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// One short signal per selected bullet; never mark whole sentences or invent claims.
const post = (slug) => `/posts/${encodeURIComponent(englishPostSlug(slug))}/`;

export function primaryNavigation() {
  return `<nav class="primary-nav" aria-label="외부 링크"><a href="https://github.com/xhae123" aria-label="Woojin Kim GitHub" title="GitHub"><svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a></nav>`;
}

function writingRedirect() {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="post-redirect" content="/"><link rel="canonical" href="https://xhae123.github.io/"><meta http-equiv="refresh" content="0;url=/"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>글 목록 주소가 바뀌었어요 · Woojin Kim</title></head><body><p>글 목록 주소가 바뀌었어요. <a href="/">바뀐 주소로 이동하기</a></p><script>location.replace('/' + location.search + location.hash);</script></body></html>`;
}

function writing(items) {
  const cats = [...Object.keys(blogCategoryIcons), ...items.map(i => i.category)].filter((cat, index, all) => cat && all.indexOf(cat) === index && items.some(i => i.category === cat));
  const categories = cats.map(cat => `<button data-cat="${escape(cat)}" aria-pressed="false">${escape(cat.toLowerCase())}<span class="n">${items.filter(i => i.category === cat).length}</span></button>`).join('');
  const feed = items.map(i => `<a class="item" data-cat="${escape(i.category || '')}" href="${post(i.slug)}"><div class="i-main"><h2 class="i-title">${escape(i.title)}</h2>${i.excerpt ? `<p class="i-lead">${escape(i.excerpt)}</p>` : ''}<p class="i-meta"><time datetime="${escape(i.date.slice(0, 10))}">${escape(i.date.slice(0, 10).replaceAll('-', '.'))}</time>${i.category ? `<span class="sep">·</span><span class="i-category">${escape(i.category.toLowerCase())}</span>` : ''}</p></div>${i.cover?.src ? `<div class="i-thumb"><img src="${escape(i.cover.src)}" alt="" loading="lazy"></div>` : ''}</a>`).join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${themeHead}<title>Writing · Woojin Kim</title><meta name="description" content="개발하면서 배운 것과 생각한 것을 기록합니다."><link rel="canonical" href="https://xhae123.github.io/"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css?v=gray-2"><link rel="stylesheet" href="/navigation.css?v=gray-2"><link rel="stylesheet" href="/blog.css?v=gray-2"></head><body class="writing-archive"><a class="blog-skip" href="#feed">본문으로 건너뛰기</a><div class="wrap"><aside class="rail"><div class="rail-identity"><a class="rail-name" href="/">woojin kim</a>${primaryNavigation()}</div><nav class="rail-cats" id="rail-cats" aria-label="글 카테고리"><button class="is-on" data-cat="*" aria-pressed="true">전체<span class="n">${items.length}</span></button>${categories}</nav></aside><main class="feed" id="feed"><h1 class="visually-hidden">글 목록</h1><section id="feed-list" aria-label="글 목록">${feed}</section><p class="feed-empty" id="feed-empty" hidden>이 카테고리에는 아직 글이 없어요.</p></main></div>${themeToggle}<script src="/app.js?v=archive-3"></script></body></html>`;
}

export async function writeArchive(items) {
  const pages = [['index.html', writing(items)], ['writing/index.html', writingRedirect()]];
  for (const [file, html] of pages) {
    const slash = file.lastIndexOf('/');
    if (slash > 0) await mkdir(file.slice(0, slash), { recursive: true });
    await writeFile(file, localizePostUrls(html));
  }
}
