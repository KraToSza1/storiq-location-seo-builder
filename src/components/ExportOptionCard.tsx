import { CircleHelp } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ExportOptionGuide {
  id: string;
  title: string;
  summary: string;
  details: string;
  recommended?: boolean;
}

interface ExportOptionCardProps extends ExportOptionGuide {
  disabled?: boolean;
  children: ReactNode;
  helpOpen: boolean;
  onHelpOpen: () => void;
  onHelpClose: () => void;
}

export default function ExportOptionCard({
  title,
  summary,
  details,
  recommended = false,
  disabled = false,
  children,
  helpOpen,
  onHelpOpen,
  onHelpClose,
}: ExportOptionCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (helpOpen && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!helpOpen && dialog.open) {
      dialog.close();
    }
  }, [helpOpen]);

  return (
    <article className={`storiq-export-option${disabled ? " storiq-export-option--disabled" : ""}`}>
      <div className="storiq-export-option__header">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="storiq-export-option__title">{title}</h3>
            {recommended ? <span className="storiq-badge storiq-badge-ready-launch">Start here</span> : null}
          </div>
          <p className="storiq-export-option__summary">{summary}</p>
        </div>
        <button
          type="button"
          className="storiq-export-option__help"
          onClick={onHelpOpen}
          aria-label={`Learn more about ${title}`}
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
          <span>What is this?</span>
        </button>
      </div>
      <div className="storiq-export-option__action">{children}</div>

      {createPortal(
        <dialog
          ref={dialogRef}
          className="storiq-dialog"
          onClose={onHelpClose}
          onClick={(event) => {
            if (event.target === dialogRef.current) {
              onHelpClose();
            }
          }}
        >
          <div className="storiq-dialog__panel">
            <h3 className="storiq-dialog__title">{title}</h3>
            <p className="storiq-dialog__body">{details}</p>
            <button type="button" className="storiq-btn storiq-btn-primary mt-4" onClick={onHelpClose}>
              Got it
            </button>
          </div>
        </dialog>,
        document.body,
      )}
    </article>
  );
}
