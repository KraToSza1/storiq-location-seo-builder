import { Wand2 } from "lucide-react";
import { extractContentClues } from "../lib/contentExtraction";
import { ListTextarea, TextArea, TextInput } from "./FormControls";
import type { LocationProject } from "../types/storiq";

export default function ExistingContentParser({
  content,
  onChange,
  onExtracted,
  showNapFields = true,
  showStorageTypes = true,
}: {
  content: LocationProject["existingContent"];
  onChange: (content: LocationProject["existingContent"]) => void;
  onExtracted?: (content: LocationProject["existingContent"]) => void;
  /** Hide address/phone when collected on the NAP step. */
  showNapFields?: boolean;
  /** Hide storage types list — selected via Storage Types step. */
  showStorageTypes?: boolean;
}) {
  const extract = () => {
    const extracted = extractContentClues(content.rawContent);
    const next = {
      ...content,
      phone: content.phone || extracted.phone || "",
      address: content.address || extracted.address || "",
      accessHours: content.accessHours || extracted.accessHours || "",
      officeHours: content.officeHours || extracted.officeHours || "",
      features: content.features.length ? content.features : extracted.features,
      storageTypes: content.storageTypes.length ? content.storageTypes : extracted.storageTypes,
    };
    onChange(next);
    onExtracted?.(next);
  };

  return (
    <div className="storiq-stack">
      <TextArea
        label="Raw existing web page content or brief"
        value={content.rawContent}
        onChange={(rawContent) => onChange({ ...content, rawContent })}
        required
        placeholder="Paste the current location page content. Include Facility Features and Unit Rental Grid sections when available."
      />
      <button type="button" onClick={extract} className="storiq-btn storiq-btn-ghost">
        <Wand2 className="h-4 w-4" aria-hidden="true" />
        Extract from pasted content
      </button>
      {showNapFields ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Address" value={content.address} onChange={(address) => onChange({ ...content, address })} required />
          <TextInput
            label="Phone"
            value={content.phone}
            onChange={(phone) => onChange({ ...content, phone })}
            required
            placeholder="+1 555 123 4567"
            helpText="International numbers with a leading + are supported."
          />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Access hours" value={content.accessHours} onChange={(accessHours) => onChange({ ...content, accessHours })} />
        <TextInput label="Office hours" value={content.officeHours} onChange={(officeHours) => onChange({ ...content, officeHours })} />
      </div>
      <ListTextarea
        label="Features & Amenities"
        value={content.features}
        onChange={(features) => onChange({ ...content, features })}
        helpText="Auto-filled from Facility Features and Unit Rental Grid in pasted content."
      />
      {showStorageTypes ? (
        <ListTextarea label="Storage types offered" value={content.storageTypes} onChange={(storageTypes) => onChange({ ...content, storageTypes })} />
      ) : null}
    </div>
  );
}
