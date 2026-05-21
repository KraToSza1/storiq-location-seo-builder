import type { LocationProject } from "../types/storiq";

export type PublishedQaCheck = {
  id: string;
  status: "pass" | "warning" | "fail";
  label: string;
  message: string;
};

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const firstMatch = (html: string, pattern: RegExp): string =>
  stripTags(html.match(pattern)?.[1] ?? "").trim();

export const runPublishedPageQa = (project: LocationProject, pastedHtml: string): PublishedQaCheck[] => {
  const checks: PublishedQaCheck[] = [];
  const trimmed = pastedHtml.trim();

  if (!trimmed) {
    return [
      {
        id: "empty",
        status: "fail",
        label: "Published HTML",
        message: "Paste the live Storagely page HTML or view-source snippet to compare.",
      },
    ];
  }

  const keyword = project.seo.primaryKeyword.trim().toLowerCase();
  const city = project.locationIdentity.city.trim().toLowerCase();
  const hasMain = /<main\s+id=["']facility-template["']/i.test(trimmed);
  checks.push({
    id: "main-wrapper",
    status: hasMain ? "pass" : "warning",
    label: "facility-template wrapper",
    message: hasMain ? "Published page includes #facility-template." : "Could not find #facility-template on live page.",
  });

  if (keyword) {
    const includesKeyword = trimmed.toLowerCase().includes(keyword);
    checks.push({
      id: "keyword",
      status: includesKeyword ? "pass" : "warning",
      label: "Primary keyword on page",
      message: includesKeyword
        ? `Live page includes “${project.seo.primaryKeyword}”.`
        : `Live page may not include primary keyword “${project.seo.primaryKeyword}”.`,
    });
  }

  if (city) {
    const h2Count = (trimmed.match(new RegExp(`<h2[^>]*>[\\s\\S]*?${city}`, "gi")) ?? []).length;
    checks.push({
      id: "city-h2",
      status: h2Count > 0 ? "pass" : "warning",
      label: "City in section headings",
      message: h2Count > 0 ? `Found H2 sections referencing ${project.locationIdentity.city}.` : `No H2 found with city ${project.locationIdentity.city}.`,
    });
  }

  const liveFaqCount = (trimmed.match(/<details\s+class=["']faq-item["']/gi) ?? []).length;
  const expectedFaq = project.generated.draftFaqs.length || 6;
  checks.push({
    id: "faq-count",
    status: liveFaqCount >= Math.min(3, expectedFaq) ? "pass" : "warning",
    label: "FAQ accordion count",
    message: `Live page has ${liveFaqCount} FAQ item(s); project expects about ${expectedFaq}.`,
  });

  const liveSchema = trimmed.includes('"@type": "FAQPage"') || trimmed.includes('"@type":"FAQPage"');
  checks.push({
    id: "faq-schema",
    status: liveSchema ? "pass" : "fail",
    label: "FAQPage JSON-LD",
    message: liveSchema ? "FAQPage schema found on live page." : "FAQPage JSON-LD not detected on live page.",
  });

  const liveTitle = firstMatch(trimmed, /<title>([\s\S]*?)<\/title>/i);
  const expectedTitle = project.seo.titleTag.trim() || project.generated.draftTitleTag;
  if (expectedTitle) {
    const titleMatch = liveTitle.toLowerCase() === expectedTitle.toLowerCase();
    checks.push({
      id: "title",
      status: titleMatch ? "pass" : "warning",
      label: "Page title",
      message: titleMatch ? "Live title matches project title tag." : `Live: “${liveTitle || "missing"}” vs project: “${expectedTitle}”.`,
    });
  }

  const pageUrl = project.locationIdentity.storagelyPageUrl.trim().toLowerCase();
  if (pageUrl && trimmed.toLowerCase().includes(pageUrl)) {
    checks.push({
      id: "self-url",
      status: "warning",
      label: "Self URL in pasted HTML",
      message: "Pasted HTML contains the facility Storagely URL — confirm you pasted page content, not export only.",
    });
  }

  return checks;
};
