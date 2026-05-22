/** Draft copy meant for editors in the app — must not appear in exported Storagely HTML. */
export const isEditorInstruction = (text: string): boolean =>
  /should use accurate copy|link the H3 only|Card copy appears under each image|Do not publish|manual distance verification|must match the FAQPage|Close with verified|Build local relevance around|These cards must not link|this tool does not auto-verify|Regenerate both together after edits/i.test(
    text,
  );

export const exportDraftBody = (body: string | undefined, fallback: string): string => {
  const trimmed = body?.trim() ?? "";
  if (!trimmed || isEditorInstruction(trimmed)) {
    return fallback;
  }
  return trimmed;
};
