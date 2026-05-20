# StorIQ MVP Implementation Plan

## Repo Audit

This was created as a new Desktop project. The starting generated workspace was empty, so the implementation scaffolded a fresh React + Vite + TypeScript app named `StorIQ Location SEO Builder`.

Supabase was not present in the repo, so the MVP uses localStorage persistence as requested.

## Architecture

- `src/types/storiq.ts`: Core project, image, facility, audit, and settings types.
- `src/state/ProjectsContext.tsx`: Project persistence, generation, audit refresh, import/export helpers.
- `src/lib/templateRenderer.ts`: Deterministic Storagely HTML renderer and FAQ JSON-LD generator.
- `src/lib/seoAudit.ts`: SEO audit engine.
- `src/lib/promptBuilder.ts`: Copy-ready AI build prompt generator.
- `src/lib/contentExtraction.ts`: Basic client-side parser for pasted source content.
- `src/lib/validators.ts`: Required-field validation and Google Maps iframe checks.
- `src/lib/storageLibrary.ts`: Starter storage image library.
- `src/lib/sampleFacilities.ts`: Starter nearby-facility list.
- `src/lib/facilityLibrary.ts`: Master facility CSV parsing, normalization, and merge logic.
- `src/lib/draftGenerator.ts`: Rules-based working draft copy generation.
- `src/lib/launchReadiness.ts`: Manager-facing ship-readiness scoring.
- `src/components/*`: Reusable layout, selectors, audit, preview, copy, and export components.
- `src/pages/*`: Dashboard, wizard, workspace, and settings routes.

## Build Steps

1. Scaffold Vite React TypeScript app.
2. Install React Router, Tailwind, and lucide icons.
3. Add PWA manifest and service worker.
4. Define the StorIQ data model.
5. Implement localStorage project persistence.
6. Implement the seven-step wizard.
7. Implement workspace tabs.
8. Implement deterministic HTML, prompt, and audit generation.
9. Implement copy/download/export actions.
10. Run `npm run build`.

## Phase 1.5 Upgrade Steps

1. Add persistent master facilities in localStorage.
2. Add Settings CSV import, template download, row preview, delete, and reset.
3. Regenerate project HTML, AI prompt, and audit from the current facility library.
4. Add Launch Score and Draft Copy workspace tabs.
5. Add launch-readiness stats to the dashboard.

## MVP Route Map

- `/`: Dashboard.
- `/locations/new`: New Location Wizard.
- `/locations/:id`: Location Workspace.
- `/settings`: Simple settings page.

## Verification Plan

1. Create a location project.
2. Fill identity fields and confirm primary keyword auto-generates.
3. Paste sample content and run extraction.
4. Paste a Google Maps iframe and check warnings.
5. Select storage type cards.
6. Add local context notes.
7. Select exactly 3 nearby locations.
8. Review required fields and warnings.
9. Open workspace tabs.
10. Confirm HTML preview renders.
11. Copy/download HTML.
12. Copy AI prompt.
13. Refresh the browser and confirm the draft persists.
14. Run `npm run build`.
