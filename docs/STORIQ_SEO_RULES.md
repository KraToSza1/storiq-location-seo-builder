# StorIQ SEO Rules

## Required Inputs

Hard fails:

- Missing city.
- Missing state.
- Missing ZIP code.
- Missing facility name.
- Missing Storagely page URL.
- Missing primary keyword.
- Missing existing source content.
- Missing address.
- Missing phone number.
- Missing Google Maps iframe.
- No storage types selected.
- No nearby locations selected.

Warnings:

- Missing office hours.
- Missing access hours.
- No local landmarks.
- No lifestyle tie-ins.
- No do-not-include notes.
- More than 6 storage type cards selected.
- Fewer or more than 3 nearby locations selected.
- FAQ schema not generated.
- HTML not generated.
- Map iframe missing `loading="lazy"`.
- Map iframe missing `title`.

## Page Structure

Generated HTML must include one main wrapper:

```html
<main id="facility-template" class="facility-template">
```

Required H2 sections:

1. Features & Amenities
2. Value Proposition / Why Choose
3. Types of Storage
4. Local Content
5. Nearby Locations
6. FAQs
7. Map + Location + CTA

## Heading Rules

- The page should use exactly 7 H2 section headings.
- Storage cards use H3 headings.
- Nearby location cards use H3 headings.
- FAQ questions use H3 inside `summary`.

## Image Rules

- Every image needs alt text.
- Storage image alt text must include City, State.
- Images should include `loading="lazy"`.
- Images should include `decoding="async"`.
- Images should include width and height.

## Link Rules

- Vehicle Storage heading links only when destination URL exists.
- Business Storage heading links only when destination URL exists.
- Climate-Controlled Storage heading links only when destination URL exists.
- Other storage type headings stay plain unless a destination URL is later added.
- Nearby Locations must not link to the same facility.

## Local SEO Rules

- Section 4 landmarks must be within 10 miles / 16 km.
- MVP does not verify distances.
- All distance checks must be marked as manual verification required unless actual distance data exists.

## Schema Rules

- FAQPage JSON-LD must exist.
- JSON-LD question text must match visible FAQ question text.
- JSON-LD answer text must match visible FAQ answer text.

## Map Rules

- Google Maps iframe must exist.
- Iframe should include `loading="lazy"`.
- Iframe should include `title`.
- Iframe should include `referrerpolicy`.

## Export Rules

- CSS must be scoped to `#facility-template`.
- HTML must not contain unresolved placeholders such as `[City]`, `[State]`, `REPLACE_WITH_URL`, `TODO`, or `PLACEHOLDER`.
- Final output must be paste-safe for Storagely.
