# Deprecated reference template

The canonical My Garage location template is **`master_template.md`** in this folder (Loop 343 / system-prompt-v2 standard).

That file includes:

- Section 5 nearby cards as semantic `<img class="location-card__image">` (no CSS `--img-loc-*` backgrounds)
- FAQPage and SelfStorage JSON-LD blocks before `</main>`

The generator reads CSS from `master_template.md` via `npm run sync:master-css` → `src/lib/masterTemplateCss.ts`.

This legacy filename is kept only so old links do not 404.
