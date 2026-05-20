from pathlib import Path

root = Path(__file__).resolve().parent.parent
skip = {"node_modules", "dist", ".git"}

for path in root.rglob("*"):
    if not path.is_file() or any(s in path.parts for s in skip):
        continue
    if path.suffix.lower() not in {".ts", ".tsx", ".css", ".html", ".json", ".md", ".js", ".webmanifest"}:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    orig = text
    text = text.replace("StorIQ-", "storiq-")
    text = text.replace("types/StorIQ", "types/storiq")
    text = text.replace('"StorIQ-location', '"storiq-location')
    text = text.replace('"StorIQ-theme"', '"storiq-theme"')
    text = text.replace("StorIQ-location-seo-builder", "storiq-location-seo-builder")
    text = text.replace("--StorIQ-", "--storiq-")
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print(path.relative_to(root))
