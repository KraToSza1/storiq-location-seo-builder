# StorIQ Location SEO Builder — Final Demo Readiness Audit

**Audit date:** May 20, 2026  
**Auditor:** Automated + code review (pre-demo)  
**Build verified:** `npm run build` — **PASS** (TypeScript + Vite production bundle)  
**Programmatic checks:** `npx tsx scripts/demo-readiness-audit.ts` — **14/14 PASS** (after fixes below)

---

## Executive summary

StorIQ is **safe for an internal demo** and **acceptable for a client demo** if you **import real My Garage master data first** and walk through **one fully completed Belton (or real) location** end-to-end. Do **not** present starter Unsplash/sample facilities as production data.

**Bugs fixed during this audit:**

1. **False “placeholder” failures** — CSS class `.facility-template__map-placeholder` in scoped `<style>` triggered placeholder scans. Fixed with `hasUnresolvedPlaceholderInHtml()` (strips `<style>` before scan; removes bare `PLACEHOLDER` token).
2. **Storage H3 link rule** — Non-linkable categories (e.g. Boat Storage) could render as `<h3><a>` when `destinationUrl` was set. Renderer now uses `isLinkableStorageType()` (Vehicle, Business, Climate-Controlled only).

---

## Audit checklist (20 items)

| # | Area | Result | Evidence / notes |
|---|------|--------|------------------|
| 1 | Production build | **PASS** | `npm run build` exit 0; `dist/` generated. |
| 2 | Console errors (normal use) | **PASS** (code review) | No `console.error` in app paths. Context hooks throw only if providers missing. StrictMode double-mount in dev is expected. **Manual:** open DevTools while clicking Dashboard → Wizard → Workspace → Export. |
| 3 | Sample/demo values in UI | **WARN** | Fresh install shows **6 sample TX facilities** + **10 Unsplash starter images** in Master Data. UI warns: *“Replace starter sample data before client demos.”* **Action before client demo:** import real CSVs. |
| 4 | Hardcoded test projects | **PASS** | `loadProjects()` defaults to `[]`. No seed projects in repo. |
| 5 | Master Data import/export | **PASS** | `parseFacilitiesCsv` / `parseImagesCsv` import; JSON export via context; CSV templates downloadable. Programmatic: 1 facility + 2 images imported. |
| 6 | Wizard uses Master Data | **PASS** | `LocationWizard` uses `useProjects().facilities`; `NearbyLocationSelector` + `StorageTypeSelector` read context libraries (not static-only). `prepareProject` passes live facilities/images. |
| 7 | Nearby self-link prevention | **PASS** | UI disables select when `storagelyUrl` or `facilityName` matches current location. SEO audit `nearby-self-link` fails if self appears in selection. |
| 8 | Storage destination URL rules | **PASS** (after fix) | Linkable categories only get `<h3><a>` when `destinationUrl` exists; others plain `<h3>`. UI labels explain behavior. |
| 9 | Single `<main id="facility-template">` | **PASS** | `renderStoragelyHtml` emits one wrapper; `runExportChecks` counts exactly 1. |
| 10 | Seven HTML sections | **PASS** | Features, Why Choose, Types of Storage, Serving, Nearby, FAQs, Map+CTA — all present in template. |
| 11 | No placeholder tokens | **PASS** (after fix) | Scans exclude `<style>`; bracket tokens, TODO, REPLACE_WITH_URL, undefined/null. Complete test project: clean. |
| 12 | FAQ visible ↔ JSON-LD | **PASS** | Same `buildFaqItems` source; audit + export checks compare `<summary><h3>` / `<p>` to schema `mainEntity`. |
| 13 | Image attributes | **PASS** | Template: `alt`, `width`, `height`, `loading="lazy"`, `decoding="async"` on storage + nearby imgs. |
| 14 | Map iframe attributes | **PASS** | Validated via `parseGoogleMapsIframe` (lazy, title, referrerpolicy). Paste full iframe in wizard/workspace. |
| 15 | Incomplete → Blocked | **PASS** | Empty project: `status=blocked`, 9+ `blockedReasons` (city, map, storage, nearby, etc.). |
| 16 | Complete → Ready / Needs Review | **PASS** | Fully filled test project: `needs_review` (landmark manual warning, alt warnings) — **not** blocked. Ready when warnings cleared. |
| 17 | localStorage persistence | **PASS** (code review) | Keys: `storiq-location-projects-v1`, `storiq-master-facilities-v1`, `storiq-master-images-v1`, `storiq-settings-v1`, `storiq-theme`. `useEffect` persists on change. **Manual:** save project → hard refresh → data remains. |
| 18 | Project JSON backup/import | **PASS** (code review) | Dashboard Import JSON / Export Backup; `importProjects` merges via `prepareProject`. **Manual:** export backup → clear storage → import → projects restore. |
| 19 | Bulk Builder scope | **PASS** | Copy states HTML not auto-generated; creates drafts via `addProject`; status stays `draft` until intake complete. |
| 20 | Landmark distance manual | **PASS** | SEO audit `landmark-distance` always **warning** with “Manual verification required… 10 miles / 16 km”. Launch readiness adds warning when landmarks exist. No distance API. |

---

## What passed

- Clean production build and typecheck pipeline  
- Core data flow: Master Data → Wizard/Workspace → `prepareProject` → HTML + audit + readiness  
- HTML structure (1 main, 7 sections, scoped CSS)  
- FAQ schema alignment, image perf attributes, map attribute validation  
- Self-link guard, bulk draft-only behavior, launch readiness blocked vs review logic  
- Programmatic regression script (`scripts/demo-readiness-audit.ts`)

---

## What failed (before fixes)

| Issue | Impact |
|-------|--------|
| Placeholder scan matched CSS `.facility-template__map-placeholder` | Launch readiness **Blocked** and export checks **fail** on otherwise valid HTML |
| Storage cards linked for any `destinationUrl` | Violated linkable-category rule (Boat/RV could get wrongful `<a>`) |

---

## What we fixed

| File | Change |
|------|--------|
| `src/lib/validators.ts` | Added `hasUnresolvedPlaceholderInHtml()` — strips `<style>` before scan |
| `src/lib/seoAudit.ts` | Uses shared placeholder helper |
| `src/lib/launchReadiness.ts` | Uses shared placeholder helper |
| `src/lib/exportChecks.ts` | Uses shared placeholder helper |
| `src/lib/templateRenderer.ts` | H3 links only for `isLinkableStorageType()` + `destinationUrl` |
| `scripts/demo-readiness-audit.ts` | Repeatable pre-demo verification script |

---

## Remaining limitations (disclose in demo)

| Limitation | Demo talking point |
|------------|-------------------|
| **Browser-only storage** | Data is per-browser; use JSON backup to move machines |
| **Starter sample libraries** | Replace with My Garage CSV before client-facing demo |
| **No Storagely publish API** | Export HTML → manual paste into Storagely |
| **No live AI API** | Deterministic drafts + copyable AI prompt for external tools |
| **No Google Distance Matrix** | Landmarks / 10-mile rule = manual verification |
| **Bulk = drafts only** | No batch HTML zip in this version |
| **Map in exported HTML** | Pasted iframe must include lazy/title/referrerpolicy |
| **PWA service worker** | Production registers `/sw.js`; failures are non-blocking |

---

## Safe for demo?

| Audience | Verdict |
|----------|---------|
| **Internal team (SEO, ops, dev)** | **Yes** — shows workflow, audit, export, readiness |
| **Client / My Garage stakeholder** | **Yes, with prep** — import real facility/image CSV, complete **one real location**, avoid “Reset to starter sample” buttons |

---

## Exact demo steps — one real My Garage location

**Prep (15–20 min, once)**

1. Run `npm run dev` (or open production build). Hard refresh (`Ctrl+Shift+R`).
2. Go to **Master Data** → import **approved facilities CSV** and **images CSV** (or edit rows manually).
3. Confirm **Settings** brand/keyword pattern (default: `self storage units in {City}, {State}`).
4. Optional: **Dashboard → Export Backup** after prep (safety copy).

**Live demo (10–15 min) — example: Belton I-35**

1. **Dashboard** → **Create New Location Page**.
2. **Step 1 — Identity:** City `Belton`, State `TX`, ZIP, facility name, real Storagely URL for that location.
3. **Step 2 — Existing content:** Paste real brief; run **Extract** for address/phone/hours/features.
4. **Step 3 — Google Maps:** Paste full embed iframe (`loading="lazy"`, `title`, `referrerpolicy`).
5. **Step 4 — Storage types:** Select real cards (note Vehicle/Business/Climate link only when destination URL set).
6. **Step 5 — Local context:** Add 2–3 landmarks; call out **manual 10-mile verification**.
7. **Step 6 — Nearby:** Pick **exactly 3** other facilities (not current location — button disabled for self).
8. **Step 7 — Review** → **Save draft** → opens **Workspace**.
9. **Workspace tabs:**
   - **Draft Generator** → generate starter copy  
   - **Launch Readiness** → show Blocked → fill gaps → **Needs Review** / **Ready**  
   - **SEO Audit** → walk 1–2 checks  
   - **HTML Preview** → scroll 7 sections  
   - **Export** → download `storiq-belton-tx-….html` + show pre-export checks  
10. **Close:** “HTML is pasted into Storagely by your implementation team — StorIQ is the quality gate, not the CMS.”

**Optional 2-min add-ons**

- **Bulk Builder:** upload CSV → preview → create draft projects only  
- **Import/Export JSON** on Dashboard for backup/handoff  

---

## Pre-demo command

```bash
npm run build
npx tsx scripts/demo-readiness-audit.ts
```

Both should pass before you share screen.

---

## Files referenced

| Area | Primary files |
|------|----------------|
| Build | `package.json`, `vite.config.ts` |
| State / persistence | `src/state/ProjectsContext.tsx` |
| HTML | `src/lib/templateRenderer.ts` |
| Audit | `src/lib/seoAudit.ts`, `src/lib/exportChecks.ts` |
| Readiness | `src/lib/launchReadiness.ts` |
| Master data | `src/lib/facilityLibrary.ts`, `src/lib/imageLibrary.ts` |
| Samples | `src/lib/sampleFacilities.ts`, `src/lib/defaultImages.ts` |

---

*End of audit.*
