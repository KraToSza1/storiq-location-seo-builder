import { storageTypeImage } from "./mediaPaths";
import { STORAGE_DESTINATION_BY_ID } from "./storageDestinationUrls";
import type { StorageImage } from "../types/storiq";

/** Default storage-type library using images in `public/media-library/storage-types/`. */
export const starterImages: StorageImage[] = [
  {
    id: "vehicle-storage",
    category: "Vehicle Storage",
    imageUrl: storageTypeImage("vehicle_storage.png"),
    destinationUrl: STORAGE_DESTINATION_BY_ID["vehicle-storage"],
    altText: "Vehicle storage",
    type: "storage_type",
  },
  {
    id: "boat-storage",
    category: "Boat Storage",
    imageUrl: storageTypeImage("boat_storage.png"),
    destinationUrl: STORAGE_DESTINATION_BY_ID["boat-storage"],
    altText: "Boat storage",
    type: "storage_type",
  },
  {
    id: "rv-storage",
    category: "RV Storage",
    imageUrl: storageTypeImage("rv_storage.png"),
    destinationUrl: STORAGE_DESTINATION_BY_ID["rv-storage"],
    altText: "RV storage",
    type: "storage_type",
  },
  {
    id: "truck-storage",
    category: "Truck Storage",
    imageUrl: storageTypeImage("truck_storage.png"),
    destinationUrl: STORAGE_DESTINATION_BY_ID["truck-storage"],
    altText: "Truck storage",
    type: "storage_type",
  },
  {
    id: "business-storage",
    category: "Business Storage",
    imageUrl: storageTypeImage("business_storage.png"),
    destinationUrl: STORAGE_DESTINATION_BY_ID["business-storage"],
    altText: "Business storage",
    type: "storage_type",
  },
  {
    id: "climate-controlled-storage",
    category: "Climate-Controlled Storage",
    imageUrl: storageTypeImage("climate_controlled_storage.png"),
    destinationUrl: STORAGE_DESTINATION_BY_ID["climate-controlled-storage"],
    altText: "Climate-controlled storage",
    type: "storage_type",
  },
  {
    id: "non-climate-controlled-storage",
    category: "Non Climate-Controlled Storage",
    imageUrl: storageTypeImage("non_climate_controlled.png"),
    altText: "Non climate-controlled storage",
    type: "storage_type",
  },
  {
    id: "student-storage",
    category: "Student Storage",
    imageUrl: storageTypeImage("student_storage.png"),
    altText: "Student storage",
    type: "storage_type",
  },
  {
    id: "military-storage",
    category: "Military Storage",
    imageUrl: storageTypeImage("military_storage.png"),
    altText: "Military storage",
    type: "storage_type",
  },
  {
    id: "retail-storage",
    category: "Retail Storage",
    imageUrl: storageTypeImage("retail_Storage.png"),
    altText: "Retail storage",
    type: "storage_type",
  },
  {
    id: "indoor-storage",
    category: "Indoor Storage",
    imageUrl: storageTypeImage("indoor_storage.png"),
    altText: "Indoor storage",
    type: "storage_type",
  },
];
