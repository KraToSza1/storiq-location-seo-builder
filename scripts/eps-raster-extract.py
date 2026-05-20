"""Extract embedded raster from Cairo-generated EPS (ASCII85 + Flate)."""
import base64
import re
import zlib
import struct
from pathlib import Path

EPS = Path(__file__).resolve().parent.parent / "public" / "brand-logo-source.eps"
OUT_PNG = Path(__file__).resolve().parent.parent / "public" / "brand-logo.png"
OUT_SVG = Path(__file__).resolve().parent.parent / "public" / "brand-logo.svg"


def main() -> None:
    text = EPS.read_text(encoding="latin-1", errors="ignore")
    width_m = re.search(r"/Width\s+(\d+)", text)
    height_m = re.search(r"/Height\s+(\d+)", text)
    if not width_m or not height_m:
        raise SystemExit("Could not find image dimensions in EPS")

    width = int(width_m.group(1))
    height = int(height_m.group(1))
    lines = text.splitlines()
    start_idx = next((i for i, line in enumerate(lines) if line.strip() == "cairo_image"), -1)
    if start_idx < 0:
        raise SystemExit("cairo_image marker not found")
    chunks: list[str] = []
    for line in lines[start_idx + 1 :]:
        stripped = line.strip()
        if not stripped:
            continue
        if "~>" in stripped:
            chunks.append(stripped.split("~>", 1)[0])
            break
        chunks.append(stripped)
    if not chunks:
        raise SystemExit("Could not find ASCII85 image data")
    a85 = "".join(chunks) + "~>"
    raw = base64.a85decode(a85, adobe=True)
    rgb = zlib.decompress(raw)
    expected = width * height * 3
    if len(rgb) < expected:
        raise SystemExit(f"Unexpected RGB length {len(rgb)} vs {expected}")

    rgb = rgb[:expected]

    # Write PNG via pure Python (minimal IHDR chunk)
    def png_chunk(tag: bytes, data: bytes) -> bytes:
        import binascii
        crc = binascii.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    # Convert RGB to RGBA (opaque)
    rgba = bytearray()
    for i in range(0, len(rgb), 3):
        rgba.extend((rgb[i], rgb[i + 1], rgb[i + 2], 255))

    row_bytes = width * 4
    raw_rows = b"".join(b"\0" + rgba[y * row_bytes : (y + 1) * row_bytes] for y in range(height))
    compressed = zlib.compress(raw_rows, 9)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", compressed)
        + png_chunk(b"IEND", b"")
    )
    OUT_PNG.write_bytes(png)

    # Simple SVG wrapper referencing PNG (works everywhere in the app)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="My Garage logo">
  <image href="/brand-logo.png" width="{width}" height="{height}" preserveAspectRatio="xMidYMid meet"/>
</svg>'''
    OUT_SVG.write_text(svg, encoding="utf-8")
    print(f"OK: {width}x{height} -> {OUT_PNG.name}, {OUT_SVG.name}")


if __name__ == "__main__":
    main()
