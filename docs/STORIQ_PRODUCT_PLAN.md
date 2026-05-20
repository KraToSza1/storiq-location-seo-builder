# StorIQ Location SEO Builder Product Plan

## Product Purpose

StorIQ Location SEO Builder is an internal production tool for creating, validating, auditing, and exporting Storagely-ready local SEO location pages for My Garage Self Storage facilities.

The first version replaces a fragile manual workflow with a guided intake, structured project data, deterministic HTML rendering, copy-ready AI prompts, and a repeatable SEO audit.

## Primary Users

- SEO/content team members building new location pages.
- Operations or marketing reviewers checking facility details before publish.
- Developers or implementation specialists pasting approved HTML into Storagely.

## MVP Jobs To Be Done

1. Create a new location page project.
2. Capture the complete location brief in a guided form.
3. Extract likely address, phone, hours, feature, and storage-type clues from pasted content.
4. Validate missing fields before generation.
5. Select storage image/type cards and nearby location cards.
6. Generate a structured AI build prompt.
7. Generate deterministic Storagely-ready HTML.
8. Run a repeatable SEO audit against the generated output.
9. Copy or download HTML, prompt, project JSON, and audit report.
10. Persist drafts locally without requiring API keys.

## MVP Scope

- React + Vite + Tailwind PWA.
- LocalStorage persistence.
- Dashboard with saved projects.
- Seven-step new-location wizard.
- Location workspace tabs.
- Settings for brand and keyword defaults.
- Master facility database with CSV import.
- Deterministic template renderer.
- Rules-based working draft generator.
- Client-side prompt builder.
- Client-side SEO audit.
- Launch readiness scorecard.
- JSON backup import/export.

## Out Of Scope For MVP

- User login and teams.
- Billing.
- Direct Storagely publishing.
- AI API calls.
- Google Maps Distance API verification.
- Live crawler checks.
- Full image library CRUD.
- Client approval workflow.

## Success Criteria

- The team can complete a new location brief without losing required fields.
- The app clearly flags missing inputs and SEO risks.
- Generated HTML is paste-safe and scoped to `#facility-template`.
- Drafts survive page refresh.
- `npm run build` succeeds without secrets or private credentials.

## Phase 1.5 Speed Upgrades

The app now includes the first major speed upgrades needed for a stronger internal demo:

- A persistent master facility database so nearby cards come from one approved source.
- CSV import and CSV template download for facility onboarding.
- Launch readiness scoring that gives managers one fast ship/no-ship signal.
- A working draft generator that turns project inputs into reusable title, meta, and section copy starters.
- HTML and AI prompts now include the generated draft copy and selected master-facility data.
