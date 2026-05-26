import { defaultFacilities } from "./facilityLibrary";
import { defaultImages } from "./imageLibrary";
import type { ExportCheck } from "../types/storiq";
import { formatValidationGateReport, gateChecksToExportChecks, runValidationGate, validationGatePass } from "./validationGate";

/** Golden reference page — My Garage Temple North 27th Street (Loop 343 / system-prompt-v2). */
export const GOLDEN_TEMPLE_FIXTURE = "public/fixtures/temple-north-27th-CORRECTED.html";

export const runGoldenTempleChecks = (html: string): ExportCheck[] =>
  gateChecksToExportChecks(
    runValidationGate({
      html,
      images: defaultImages,
      facilities: defaultFacilities,
    }),
  );

export const goldenTempleChecksPass = (html: string): boolean =>
  validationGatePass(
    runValidationGate({
      html,
      images: defaultImages,
      facilities: defaultFacilities,
    }),
  );

export const formatGoldenTempleGateReport = (html: string): string =>
  formatValidationGateReport(
    runValidationGate({ html, images: defaultImages, facilities: defaultFacilities }),
    {
      facilityName: "My Garage Self Storage | North 27th Street",
      city: "Temple",
      state: "TX",
      storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/temple/north-27th-street",
    },
  );
