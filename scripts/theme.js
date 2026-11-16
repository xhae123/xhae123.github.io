// Light and dark themes. A page follows the system setting until the reader
// uses the toggle; that choice is kept in localStorage under "theme".

// Goes in <head> before the stylesheets, so a stored choice is applied before
// the first paint. The meta tag colors the empty page while the CSS loads.
export const themeHead = `<meta name="color-scheme" content="light dark" /><script>try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.querySelector('meta[name="color-scheme"]').content=t}}catch(e){}</script>`;

// Hidden until app.js wires it up: without JavaScript the page still follows
// the system setting and shows no dead control.
export const themeToggle = `<button class="theme-toggle" type="button" data-theme-toggle aria-label="화면 테마 전환" hidden><svg class="theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7Z"/></svg><svg class="theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg></button>`;
