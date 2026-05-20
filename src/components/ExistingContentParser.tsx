import { Wand2 } from "lucide-react";
import { extractContentClues } from "../lib/contentExtraction";
import { ListTextarea, TextArea, TextInput } from "./FormControls";
import type { LocationProject } from "../types/storiq";

export default function ExistingContentParser({
  content,
  onChange,
}: {
  content: LocationProject["existingContent"];
  onChange: (content: LocationProject["existingContent"]) => void;
}) {
  const extract = () => {
    const extracted = extractContentClues(content.rawContent);
    onChange({
      ...content,
      phone: content.phone || extracted.phone || "",
      address: content.address || extracted.address || "",
      accessHours: content.accessHours || extracted.accessHours || "",
      officeHours: content.officeHours || extracted.officeHours || "",
      features: content.features.length ? content.features : extracted.features,
      storageTypes: content.storageTypes.length ? content.storageTypes : extracted.storageTypes,
      uniqueSellingPoints: content.uniqueSellingPoints.length ? content.uniqueSellingPoints : extracted.uniqueSellingPoints,
    });
  };

  return (
    <div className="storiq-stack">
      <TextArea
        label="Raw existing web page content or brief"
        value={content.rawContent}
        onChange={(rawContent) => onChange({ ...content, rawContent })}
        required
        placeholder="Paste the current location page content, facility brief, hours, feature list, and notes here."
      />
      <button type="button" onClick={extract} className="storiq-btn storiq-btn-ghost">
        <Wand2 className="h-4 w-4" aria-hidden="true" />
        Extract from pasted content
      </button>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Address" value={content.address} onChange={(address) => onChange({ ...content, address })} required />
        <TextInput label="Phone" value={content.phone} onChange={(phone) => onChange({ ...content, phone })} required />
        <TextInput label="Access hours" value={content.accessHours} onChange={(accessHours) => onChange({ ...content, accessHours })} />
        <TextInput label="Office hours" value={content.officeHours} onChange={(officeHours) => onChange({ ...content, officeHours })} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ListTextarea label="Features list" value={content.features} onChange={(features) => onChange({ ...content, features })} />
        <ListTextarea label="Storage types offered" value={content.storageTypes} onChange={(storageTypes) => onChange({ ...content, storageTypes })} />
        <ListTextarea label="Unique selling points" value={content.uniqueSellingPoints} onChange={(uniqueSellingPoints) => onChange({ ...content, uniqueSellingPoints })} />
      </div>
    </div>
  );
}
