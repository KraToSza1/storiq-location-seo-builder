import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { runMasterDataHealthCheck } from "../lib/masterDataHealth";
import type { NearbyFacility, StorageImage } from "../types/storiq";

const iconFor = {
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const classFor = {
  error: "storiq-alert-danger",
  warning: "storiq-alert-warning",
  info: "storiq-alert-info",
};

export default function MasterDataHealthPanel({
  facilities,
  images,
}: {
  facilities: NearbyFacility[];
  images: StorageImage[];
}) {
  const issues = runMasterDataHealthCheck(facilities, images);

  if (issues.length === 0) {
    return (
      <div className="storiq-alert storiq-alert-success flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Master data looks healthy — ready for location builds.
      </div>
    );
  }

  return (
    <div className="storiq-stack">
      <h3 className="storiq-section-title text-base">Library health check</h3>
      {issues.map((issue) => {
        const Icon = iconFor[issue.severity];
        return (
          <div key={issue.id} className={`storiq-alert ${classFor[issue.severity]} flex items-start gap-2`} style={{ margin: 0 }}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold">{issue.label}</div>
              <div className="text-xs opacity-90">{issue.message}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
