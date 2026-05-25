import { catalogStorageImages } from "./imageLibraryCatalog";
import type { StorageImage } from "../types/storiq";

/** Default image library from client image_library.md (storage types + facility locations). */
export const starterImages: StorageImage[] = catalogStorageImages();
