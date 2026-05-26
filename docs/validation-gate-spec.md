# Pre-Publish Validation Gate — My Garage Location Page Generator

> **For:** The Systems Engineer. This is a coded validation layer that runs on the generator's
> HTML output BEFORE it can be published or handed off. **Every check is BLOCKING:** if any check
> fails, the build hard-fails and the page does not ship until the failure is resolved.
>
> **Why this exists:** Prose rules in the system prompt were not enforced — a generated page shipped
> a wrong-area-code phone number, pricing noise, fabricated category links, and literal scaffold
> placeholder text. This gate converts "the spec says don't" into "the tool cannot ship it."
>
> Every check below is traceable to a real failure observed in the Temple / North 27th Street output.

---

## 0. How the gate runs

- **Input:** the generated HTML document + the structured inputs used to build it (location identity,
  parsed phone, image-library records used, facilities-list records used, map iframe).
- **Output:** PASS (build proceeds) or FAIL (build stops). On FAIL, emit a report listing every
  failed check by ID, the offending value, and the resolution path.
- **All checks block.** There is no "warning" tier. A check is either PASS or FAIL.
- **Resolution paths.** Most checks are resolved by fixing the generator output/inputs and re-running.
  A small number are judgment calls a machine cannot fully decide (distance without coordinates,
  borderline phrasing). Those still BLOCK, but can be cleared by an explicit, logged human override
  token attached to that specific check ID (see Section 5). An override requires a reason string;
  a bare override is itself a FAIL. This keeps "all-blocking" from wedging the build on a check the
  machine literally cannot verify alone.
- **Run order:** structural → safety-critical → content-integrity → schema → judgment. Report ALL
  failures in one pass (do not stop at the first) so the operator fixes everything at once.

---

## 1. SAFETY-CRITICAL CHECKS (the ones that protect the client)

These caused, or would have caused, real client-facing harm in the Temple run.

### S1 — Phone number integrity
- **Observed failure:** source digits `2545363341` became `tel:+15042545363` / "Call 504 2545363" —
  a New Orleans area code and a malformed display string.
- **Checks (all must pass):**
  - The `tel:` href contains exactly 10 national digits (after the `+1` country code) — not 9, not 11.
  - The 10 digits equal the 10 digits parsed from the source, in the same order. No insertion,
    deletion, or reordering.
  - The visible CTA display number contains the SAME 10 digits as the `tel:` href.
  - The display format matches `(NXX) NXX-XXXX` exactly (area code in parens, space, 3-3 split).
  - The area code is valid for the facility's state/region. Maintain a per-state allow-list of area
    codes (e.g., TX includes 254, 979, 512, 713, 281, 832, 915, 903, 936, 940, etc.). An area code
    outside the facility state's set FAILS. (This is the check that catches 504.)
  - The SelfStorage schema `telephone` digits equal the CTA digits.
- **Resolution:** fix the phone parse; re-run. No override (a wrong phone is never acceptable).

### S2 — No pricing or promotional language anywhere
- **Observed failure:** FAQ #1 was "Web Rate Only Standard Rate"; source promos like "50% off 1st 3
  months" and "$XX/month" were present in scraped fragments.
- **Checks:** the rendered HTML (visible text AND JSON-LD text fields) must NOT contain any of, case-insensitive:
  - currency-amount patterns: `$` followed by digits; `\d+\s*/\s*month`; "per month" with a number
  - "web rate", "standard rate", "during promo", "promo period", "% off", "percent off",
    "first month free", "second month free", "1st month", "move-in special", "specials",
    "discount" used as an offer (allow "Military discount" as a named amenity ONLY — see note)
  - **Note:** "Military discount" / "Military Discount" as a standalone amenity label is permitted;
    any "discount" adjacent to a number, percentage, or time period FAILS.
- **Resolution:** strip the offending copy; re-run. No override.

### S3 — No scaffold / placeholder / debug strings
- **Observed failure:** Section 5 cards shipped with "Sample data — import real facilities CSV" and
  "Listed from nearby-locations image library".
- **Checks:** the HTML must NOT contain any of, case-insensitive:
  - "sample data", "import real", "image library", "placeholder", "lorem ipsum", "TODO", "FIXME",
    "REPLACE_WITH", "XXX", "{{", "}}", "[city", "[type", "[nearby", "[street", "[facility"
    (any unresolved bracket/handlebars token)
  - the literal generic alt strings from the image library (e.g., a card `alt` exactly equal to
    "vehicle storage", "boat storage", "rv storage", etc. — see C3).
- **Resolution:** replace with real content; re-run. No override.

### S4 — No fabricated outbound links
- **Observed failure:** storage cards linked to `/boat-storage`, `/truck-storage`, `/rv-storage` —
  URLs the generator invented; none exist in the image library's destination_url set.
- **Checks:**
  - Every `href` on a `.storage-card__heading-link` must EXACTLY equal a `destination_url` present in
    the image-library records actually used for this page. A storage-card link whose URL is not in
    the library FAILS.
  - No storage-card link may be auto-derived by pattern (e.g., `/{type}-storage`). The gate cannot
    see "intent," so it enforces the stronger rule: link URL ∈ library destination_url set, or no link.
  - Every `.location-card__link` href must EXACTLY equal a `storagely_url` from the facilities list.
  - No `href` may be empty, `#`, `REPLACE_WITH_*`, or `javascript:`.
- **Resolution:** remove the link or correct it to a real library/facilities URL; re-run. No override.

---

## 2. STRUCTURAL CHECKS

### T1 — No H1
- **Check:** zero `<h1>` elements in the output (Storagely injects it). Any `<h1>` FAILS.

### T2 — Section count and order
- **Check:** exactly 7 `.facility-section` blocks, in the fixed order (Features, Value Prop, Types,
  Local, Nearby, FAQs, Map). Background-variant classes match the wireframe
  (white, light, white, light, white, light, brand).

### T3 — One H2 per section; Section 5 keyword-free
- **Checks:** exactly one `<h2>` per section (7 total). Section 5's H2 equals the exact string
  `Other Nearby Locations at My Garage`. No two keyword-bearing H2s are byte-identical.

### T4 — Wrapper and cascade defenses present
- **Checks:** a single `<main id="facility-template" class="facility-template">` wraps the content.
  The required ID-scoped `!important` rules for `.storage-card__image`, brand-section text color, and
  FAQ `summary h3` reset are present in the `<style>` block.

### T5 — Storage grid column count matches card count
- **Observed risk:** mismatched grids look broken.
- **Check:** `.storage-grid` `grid-template-columns` repeat-count is consistent with the rendered
  card count per the spec mapping (4 → repeat(4); 5-6 → repeat(3)). A 5-card section using a stray
  second grid or a repeat(4) FAILS.

### T6 — Card minimums
- **Checks:** Section 3 has ≥3 storage cards. Section 5 has exactly 3 location cards. A one-card
  Section 3 FAILS (this is the "never silently drop offered types" guard at the output layer).

---

## 3. CONTENT-INTEGRITY CHECKS

### C1 — Section 1 amenity count and de-duplication
- **Observed failure:** 7 amenities (under the 8 minimum) with a "Code Gate Entry" / "Gated Access"
  near-duplicate pair carrying identical descriptions.
- **Checks:** Section 1 list has 8-12 items. No two items are near-synonyms. Maintain a synonym map
  (e.g., {code gate entry, gated access, gate access}, {drive up units, drive-up access},
  {security fence, fenced perimeter}); two items mapping to the same synonym group FAILS.

### C2 — No duplicated bullet descriptions
- **Observed failure:** two Value-Prop bullets had word-for-word identical description sentences.
- **Check:** within Section 1 and Section 2, no two list items share an identical (normalized)
  description string.

### C3 — Dynamic alt text (no generic library alt)
- **Observed risk:** library generic alt ("vehicle storage") must never be used verbatim.
- **Checks:**
  - Every `.storage-card__image` `alt` matches the pattern `<Type> self storage units in <City>, <State>`.
  - Every `.location-card__image` `alt` matches `Self storage units in <Nearby City>, <State> near <Current City>`.
  - No `alt` equals a bare library generic-alt string.

### C4 — Brand mark (®) placement
- **Observed failure:** "My Garage Self Storage | North 27th Street®" — ® appended to the street name.
- **Checks:** every visible rendering of the brand reads `My Garage Self Storage®` (® immediately
  after "Storage", before any "| Street"). The string "Storage®" must be the only ®-bearing token;
  a ® anywhere else (e.g., end of the facility name) FAILS. The Value-Prop opener begins exactly with
  `At My Garage Self Storage®,`.

### C5 — Keyword stuffing cap
- **Observed failure:** the exact lowercase keyword string appeared dozens of times, jammed
  mid-sentence ("self storage units in temple, tx for households").
- **Checks (BLOCKING, override-eligible):**
  - The exact primary-keyword string appears at most once per paragraph (`<p>`) and at most once per
    list item.
  - The keyword never appears lowercased mid-sentence when it contains a place name; "Temple, TX"
    must be title-cased. A lowercased "temple, tx" inside body copy FAILS.
  - Total exact-keyword occurrences across the page ≤ a configurable ceiling (default 8).
- **Resolution:** rewrite; re-run. Override allowed only with a reason (rare; e.g., a legitimately
  keyword-dense H2 set), logged per Section 5.

### C6 — FAQ source integrity
- **Observed failure:** FAQ #1 was scraped pricing-widget noise ("What Will Fit" + "Web Rate / Standard Rate").
- **Checks:**
  - Exactly 6 `details.faq-item`, each with `<summary><h3>…</h3></summary>` and a `<p>` answer.
  - No FAQ question or answer contains UI/widget fragments: "What Will Fit", "Easily switch sizes",
    "No credit card required", "Join the waitlist", "Sort by", "Reviews".
  - No FAQ answer is shorter than a configurable minimum (default 12 words) — catches stub answers
    like "Web Rate Only Standard Rate".
  - (S2 pricing check also applies inside FAQs.)

### C7 — Section 5 self-reference and disambiguation
- **Observed failure:** a same-city sister branch rendered as a bare "Temple, TX" card,
  indistinguishable from the current page.
- **Checks:**
  - No location card's `storagely_url` equals the CURRENT facility's URL (no self-linking).
  - If a nearby card is in the SAME city as the current facility, its H3 must include a
    distinguishing branch token (street/highway), e.g., "Temple, TX — South 31st Street". A bare
    same-city "City, State" H3 FAILS.

---

## 4. SCHEMA CHECKS (JSON-LD)

### J1 — Both blocks present and valid
- **Check:** exactly two `application/ld+json` blocks; both parse as valid JSON (no comments, no
  trailing commas); `@type` values are `FAQPage` and `SelfStorage`.

### J2 — FAQPage matches visible FAQ word-for-word
- **Observed risk:** scraped-noise FAQ was mirrored into schema.
- **Check:** the 6 `Question`/`acceptedAnswer` text values are byte-identical to the visible Section 6
  questions/answers. Any mismatch FAILS.

### J3 — SelfStorage NAP + geo integrity
- **Observed failure:** `areaServed` listed "Temple" twice; geo must come from the map embed.
- **Checks:**
  - `telephone` digits equal the CTA digits (links to S1).
  - `address` fields equal the location-identity inputs (street, city, state, ZIP).
  - `geo.latitude` equals the value after `!3d` in the map iframe; `geo.longitude` equals the value
    after `!2d`. A geocoded-elsewhere or rounded value FAILS (must be the embed's full-precision value).
  - `areaServed` contains no duplicate entries; entries equal the current city + the 3 nearby cities
    (deduplicated). "Temple" listed twice FAILS.

---

## 5. JUDGMENT CHECKS (block, but human-override-eligible)

These cannot be fully decided by code. They BLOCK by default; an operator clears them with a logged
override token: `OVERRIDE:<checkID>:<reason>` recorded in the build log. A missing reason FAILS.

### G1 — Section 4 landmark distance (10-mile rule)
- **Observed failure:** Belton Lake / Temple Lake Park (~12-14 mi; the park is actually on Belton
  Lake in a different ZIP) were name-dropped from the source despite being out of range.
- **Automated portion (blocking, no override):** if the generator was given coordinates for a named
  landmark, compute distance from the facility geo; >10 mi FAILS outright.
- **Judgment portion (blocking, override-eligible):** for any Section 4 proper-noun landmark WITHOUT
  machine-checkable coordinates, the gate flags it for human distance confirmation. Cleared by
  `OVERRIDE:G1:<landmark verified at N.N mi>`.
- **Identity sub-check:** maintain a known-collision list (e.g., "Lake Cherokee" vs "Cherokee Lake";
  "Temple Lake Park is on Belton Lake"). A flagged-collision name present in Section 4 BLOCKS until
  overridden with the disambiguation reason.

### G2 — Section 4 has real local content
- **Observed failure:** four paragraphs of generic filler naming zero landmarks.
- **Check:** Section 4 must contain ≥2 distinct proper-noun place references (landmark, road, park,
  school, or named neighborhood). Zero named places FAILS. (Blocking; override-eligible only if the
  facility genuinely has no nearby named landmarks, with reason.)

### G3 — Storage-type fidelity to source
- **Observed failure:** a "Truck Storage" card was fabricated from a parking sub-label; cards must
  reflect what the source actually describes.
- **Check (judgment):** the set of rendered storage-card types is flagged for confirmation that each
  appears as a described offering in the source content (not merely a parking sub-bullet). Cleared by
  `OVERRIDE:G3:<types confirmed against source>`.

---

## 6. Failure Report Format

On any FAIL, emit:

```
[BUILD BLOCKED] — <N> check(s) failed
Page: <facility name> | <city, state> | <storagely url>

SAFETY-CRITICAL
- [S1] Phone area code 504 not valid for TX. Source digits 2545363341 → expected (254) 536-3341.
- [S2] Pricing language found in FAQ #1: "Web Rate Only Standard Rate".

CONTENT
- [C4] ® misplaced: "North 27th Street®" → expected "My Garage Self Storage® | North 27th Street".

JUDGMENT (override-eligible)
- [G1] Section 4 landmark "Belton Lake" unverified/known-collision. Confirm distance or remove.

Resolution: fix flagged items and re-run. Override-eligible items may be cleared with
OVERRIDE:<checkID>:<reason> in the build invocation.
```

On full pass: `[BUILD PASSED] — all checks green. Safe to publish.`

---

## 7. Implementation notes for the engineer

- Implement checks as independent assertion functions returning `{id, passed, offending_value, message}`.
  Run all, collect all failures, report together.
- Drive S1's area-code allow-list, C1's synonym map, S2's promo-token list, and G1's collision list
  from EDITABLE config files, not hardcoded constants — the same data-not-constants principle the
  generator spec uses. They will grow over time.
- The gate consumes the generator's INPUTS too (parsed phone, library records used, facilities
  records used, map iframe), not just the HTML — several checks (S1, S4, J3) compare output against
  the source of truth, which requires both.
- This gate is independent of the generator. It should pass on the corrected golden-reference output
  (`temple-north-27th-CORRECTED.html`) and fail on the original broken output. Use those two files as
  the gate's first regression fixtures: corrected → all green; broken → S1, S2, S3, S4, C1, C2, C4,
  C5, C6, C7, J2, J3, G1, G2, G3 all fire.
```
