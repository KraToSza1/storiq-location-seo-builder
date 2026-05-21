# Storagely media library (local files)

Paste client or demo images here before linking them in **Master Data** or your markdown/CSV import.

## Folders

| Folder | Purpose |
|--------|---------|
| `storage-types/` | Vehicle Storage, Climate-Controlled, RV, etc. (wizard Step 4) |
| `facility-locations/` | Facility exterior / location hero images |
| `nearby-facilities/` | Thumbnail images for nearby location cards |

## How URLs work in the app

Files in `public/` are served from the site root. Example:

- File on disk: `public/media-library/storage-types/vehicle-storage.jpg`
- URL in Master Data: `/media-library/storage-types/vehicle-storage.jpg`

Use that path in the **image URL** column (CSV/markdown import) or when editing an image in Master Data.

## Suggested naming

Use lowercase, hyphens, no spaces:

- `vehicle-storage.jpg`
- `climate-controlled-storage.jpg`
- `facility-exterior-belton-i35.jpg`

## Note

For production on Vercel, these files are deployed with the app. For very large libraries, you may still prefer Storagely CDN URLs in Master Data instead of bundling every image here.
