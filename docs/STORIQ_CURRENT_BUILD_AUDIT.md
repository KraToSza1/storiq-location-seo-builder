# StorIQ Location SEO Builder — Current Build Audit

**Audit date:** May 20, 2026  
**Purpose:** Baseline inventory before production-hardening sprint.

---

## Routes

| Path | Page | Purpose |
|------|------|---------|
| `/` | `Dashboard.tsx` | List projects, import/export JSON backup, launch readiness on cards |
| `/locations/new` | `LocationWizard.tsx` | 7-step guided intake for new location projects |
| `/locations/:id` | `LocationWorkspace.tsx` | Full workspace with tabbed editing |
| `/settings` | `SettingsPage.tsx` | Brand defaults, link to master data |
| `/master-data` | `MasterDataPage.tsx` | Facility Library + Image Library CRUD |
| `/bulk` | `BulkPage.tsx` | CSV upload preview, validate rows, create draft projects |
| `*` | redirect | Falls back to `/` |

---

## Components

### Layout & navigation
- `AppLayout.tsx` — header, nav (Dashboard, New Location, Master Data, Bulk, Settings)

### Workspace / wizard
- `WizardStep.tsx`, `CompletionProgress.tsx`, `RequiredFieldBadge.tsx`
- `ExistingContentParser.tsx`, `GoogleMapsEmbedInput.tsx`
- `StorageTypeSelector.tsx`, `FacilityLocationImageSelector.tsx`
- `NearbyLocationSelector.tsx`
- `DraftGeneratorPanel.tsx`, `LaunchReadinessPanel.tsx`
- `AuditPanel.tsx`, `AuditCheckItem.tsx`
- `HtmlPreview.tsx`, `ExportPanel.tsx`, `PromptPreview.tsx`

### Shared UI
- `FormControls.tsx`, `CopyButton.tsx`, `StatusBadge.tsx`

---

## Data flow

```
User input (wizard / workspace tabs)
    ↓
ProjectsContext.updateProject / addProject
    ↓
prepareProject()
    ├── generateDraftSections / title / meta / faqs (draftGenerator)
    ├── renderStoragelyHtml (templateRenderer + facilities + images)
    ├── renderFaqJsonLd
    ├── buildAiPrompt
    └── runSEOAudit
    ↓
LocationProject saved → localStorage (storiq-location-projects-v1)
```

**Master data (separate keys):**
- `storiq-master-facilities-v1` — Facility Library
- `storiq-master-images-v1` — Image Library
- `storiq-settings-v1` — App settings

---

## localStorage structure

### Projects (`storiq-location-projects-v1`)
Array of `LocationProject` objects. Key fields:
- `locationIdentity` — city, state, zipCode, facilityName, storagelyPageUrl
- `seo` — primaryKeyword, titleTag, metaDescription
- `existingContent` — raw brief, address, phone, hours, features, USPs
- `googleMaps` — iframeCode, detectedSrc, isValid
- `localContext` — landmarks, neighborhoods, lifestyle, do-not-include
- `selectedNearbyLocations` — facility IDs (exactly 3 expected)
- `selectedStorageImages` — image library IDs (storage_type)
- `selectedFacilityLocationImages` — image library IDs (facility_location)
- `generated` — html, faqJsonLd, aiPrompt, draft sections, draft FAQs, title/meta drafts
- `audit` — score + checks array

### Facilities (`storiq-master-facilities-v1`)
Array of `NearbyFacility`: id, facilityName, city, state, address, zipCode, storagelyUrl, phone?, imageUrl?, notes?

### Images (`storiq-master-images-v1`)
Array of `StorageImage`: id, category, imageUrl, destinationUrl?, altText, type (`storage_type` | `facility_location`)

### Settings (`storiq-settings-v1`)
`AppSettings`: brandName, defaultKeywordPattern, aiPromptSettings

---

## Template renderer behavior

**File:** `src/lib/templateRenderer.ts`

- Outputs one `<main id="facility-template" class="facility-template">` with scoped `#facility-template` CSS
- **7 sections:** Features & Amenities, Why Choose, Types of Storage, Serving (local), Nearby Locations, FAQs, Map + CTA
- Storage cards: H3 links only when `destinationUrl` exists; images get `loading="lazy"`, `decoding="async"`, width/height
- Alt text enriched with City, State via `buildStorageImageAlt`
- Nearby cards from Facility Library selections
- FAQ visible HTML + embedded FAQPage JSON-LD from `buildFaqItems` / draft FAQs
- Map: raw iframe passthrough or placeholder
- **No AI** — deterministic string assembly from project + draft sections

---

## SEO audit behavior

**File:** `src/lib/seoAudit.ts`

Runs ~20 checks: keyword, 7 sections/H2s, storage/nearby H3s, image alt/performance, link rules, landmark manual warning, self-link prevention, FAQ schema match, map embed, main wrapper, scoped CSS, placeholders.

Score = weighted pass/warning ratio → 0–100.

---

## Export behavior

**File:** `src/components/ExportPanel.tsx` + `src/lib/exportChecks.ts`

- Copy/download HTML (`storiq-{city}-{state}-{facility-slug}.html`)
- Copy AI prompt, download project JSON, copy audit report
- Pre-export validation panel (placeholders, sections, FAQ match, image attrs, map attrs)

---

## Known bugs / weak spots (pre-sprint)

| Issue | Severity |
|-------|----------|
| Starter sample facilities/images ship as defaults | High |
| No external AI API (by design) | Info |
| Landmark distance = manual only | Expected |
| No Storagely publish API | Expected |
| localStorage only — no multi-user sync | Medium |
| Bulk mode does not auto-generate HTML | Expected |

---

## Sample data still in use

- `src/lib/sampleFacilities.ts` — 6 TX facilities (fallback until real CSV imported)
- `src/lib/storageLibrary.ts` — starter Unsplash URLs (seed for Image Library)

**Must be replaced with real approved data:**
- All facility names, addresses, Storagely URLs, zip codes, phones
- All image URLs and alt text from My Garage CDN/approved assets
- Destination URLs for Vehicle, Business, Climate-Controlled storage types

---

## Sprint deliverables mapped

1. ✅ This audit document  
2. ✅ Master Data (`/master-data`) — Facility + Image libraries  
3. ✅ Wizard/workspace wired to master data  
4. ✅ Launch Readiness Scorecard V2  
5. ✅ Deterministic Draft Generator (no API keys)  
6. ✅ HTML export hardening + filename convention  
7. ✅ Bulk Builder (`/bulk`) — CSV preview + draft project creation  
8. ✅ UI polish pass  
9. ✅ `npm run build` verification  

---

## Recommended next sprint

- Google Maps Distance Matrix for landmark verification  
- Optional OpenAI/Anthropic draft refinement (env-based keys)  
- Storagely API or scripted publish workflow  
- Supabase/Postgres backend for team-wide master data  
- Image dimension validation and usage tracking  
