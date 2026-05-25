import type { LocationProject } from "../types/storiq";

type LocalContext = LocationProject["localContext"];

export const mergeLocalReferences = (localContext: LocalContext): string[] =>
  [...localContext.landmarks, ...localContext.neighborhoods, ...localContext.lifestyleTieIns].filter(
    (item) => item.trim().length > 0,
  );

export const applyLocalReferences = (localContext: LocalContext, lines: string[]): LocalContext => ({
  ...localContext,
  landmarks: lines,
  neighborhoods: [],
  lifestyleTieIns: [],
});
