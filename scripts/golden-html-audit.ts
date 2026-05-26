/**
 * Run: npm run audit:golden
 * Validates public/fixtures/temple-north-27th-CORRECTED.html against validation-gate-spec.md
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatGoldenTempleGateReport, goldenTempleChecksPass, GOLDEN_TEMPLE_FIXTURE, runGoldenTempleChecks } from "../src/lib/goldenTempleAudit";

const root = join(import.meta.dirname, "..");
const fixturePath = join(root, GOLDEN_TEMPLE_FIXTURE);
const html = readFileSync(fixturePath, "utf8");
const checks = runGoldenTempleChecks(html);
const failed = checks.filter((c) => c.status === "fail");

console.log(formatGoldenTempleGateReport(html));
console.log(
  JSON.stringify(
    {
      fixture: GOLDEN_TEMPLE_FIXTURE,
      passed: checks.length - failed.length,
      failed: failed.length,
      ok: goldenTempleChecksPass(html),
      failures: failed.map((c) => ({ id: c.id, label: c.label, message: c.message })),
    },
    null,
    2,
  ),
);

process.exit(goldenTempleChecksPass(html) ? 0 : 1);
