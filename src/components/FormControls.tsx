import { listFromText, listToText } from "../lib/contentExtraction";
import { logInputChange } from "../lib/debugUi";

interface BaseFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}

export function TextInput({ label, value, onChange, placeholder, required, helpText }: BaseFieldProps) {
  return (
    <label className="block">
      <span className="storiq-label">
        {label}
        {required ? <span className="storiq-required">*</span> : null}
      </span>
      <input
        className="storiq-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          logInputChange(label, next);
          onChange(next);
        }}
      />
      {helpText ? <span className="storiq-help">{helpText}</span> : null}
    </label>
  );
}

export function TextArea({ label, value, onChange, placeholder, required, helpText }: BaseFieldProps) {
  return (
    <label className="block">
      <span className="storiq-label">
        {label}
        {required ? <span className="storiq-required">*</span> : null}
      </span>
      <textarea
        className="storiq-textarea"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          logInputChange(label, next);
          onChange(next);
        }}
      />
      {helpText ? <span className="storiq-help">{helpText}</span> : null}
    </label>
  );
}

export function ListTextarea({
  label,
  value,
  onChange,
  placeholder,
  helpText,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helpText?: string;
}) {
  return (
    <label className="block">
      <span className="storiq-label">{label}</span>
      <textarea
        className="storiq-textarea"
        style={{ minHeight: "7rem" }}
        value={listToText(value)}
        placeholder={placeholder}
        onChange={(event) => {
          const lines = listFromText(event.target.value);
          logInputChange(label, lines);
          onChange(lines);
        }}
      />
      {helpText ? <span className="storiq-help">{helpText}</span> : null}
    </label>
  );
}
