# theme-switch-v1 — the front door's light mode, retired

`theme.js`, as it was served at `js/theme.js` from 2026-10-14 until 2026-10-20: loaded in the head of both front doors
(`index.html`, `ar/index.html`), it set `data-theme` on the root from the visitor's remembered choice (localStorage, key
`theme`) or else the device's setting, and wired the header's switch. With it went the switch and the light tokens:

```html
<button id="theme" type="button" aria-pressed="false" aria-label="Light mode"><svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 1.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor"/></svg></button>
```

(`aria-label="الوضع الفاتح"` on `ar/index.html`), and in `css/film.css`:

```css
[data-theme=light] body>footer{--ground:#f3f1ec;--ink:#121118;--dim:#5b5763;--soft:#37343e;--warm:#9a4a00;--rule:#12111826;--hover:#34313b;color:var(--ink)}
#theme{display:block;padding:4px;color:var(--soft)}#theme:hover{color:var(--warm)}#theme svg{display:block}
```

(until earlier on 2026-10-20 the light block also re-tokened the two systems' sections and the close:
`[data-theme=light] :is(.system,.close,body>footer)`).

Retired on 2026-10-20 at the owner's decision: once the systems and the close moved over the passage, the switch changed
only the footer, a promise of an alternate view the page did not keep. The front door keeps one deliberately lit
environment, dark whatever the device's theme; the subpages keep their own treatment. A choice a visitor saved before
then stays in their browser until they clear the site's data, and nothing reads it. Not served, precached or named by
any served page.
