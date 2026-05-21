# Storagely media library (local files)

Paste client or demo images here before linking them in **Master Data** or your markdown/CSV import.

## Folders

| Folder | Purpose |
|--------|---------|
| `storage-types/` | Vehicle Storage, Climate-Controlled, RV, etc. (wizard Step 4) |
| `facility-locations/` | Facility exterior / location hero images |
| `nearby-locations/` | Thumbnail images for nearby location cards (export grid backgrounds) |

## How URLs work in the app

Files in `public/` are served from the site root. Example:

- File on disk: `public/media-library/nearby-locations/self-storage-units-in-temple.webp`
- URL in Master Data: `/media-library/nearby-locations/self-storage-units-in-temple.webp`

Use that path in the **image URL** column (CSV/markdown import) or when editing a facility in Master Data.

If you omit `imageUrl` on import, StorIQ tries to match `self-storage-units-in-{city}.webp` (or `.jpg`) from filenames in `nearby-locations/`.

## Suggested naming

Use lowercase, hyphens, no spaces:

- `self-storage-units-in-killeen.webp`
- `self-storage-units-in-belton.jpg`
- `vehicle_storage.png` (storage types — underscores match bundled PNGs)

## Note

For production on Vercel, these files are deployed with the app. For very large libraries, you may still prefer Storagely CDN URLs in Master Data instead of bundling every image here.
