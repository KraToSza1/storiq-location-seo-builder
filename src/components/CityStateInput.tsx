import { useEffect, useState } from "react";
import { formatCityState, parseCityState } from "../lib/cityStateParse";

export default function CityStateInput({
  city,
  state,
  onChange,
  required,
  helpText,
}: {
  city: string;
  state: string;
  onChange: (city: string, state: string) => void;
  required?: boolean;
  helpText?: string;
}) {
  const formatted = formatCityState(city, state);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(formatted);

  useEffect(() => {
    if (!focused) {
      setDraft(formatted);
    }
  }, [formatted, focused]);

  return (
    <label className="block">
      <span className="storiq-label">
        City, State{required ? <span className="storiq-required"> *</span> : null}
      </span>
      <input
        className="storiq-input mt-1"
        value={focused ? draft : formatted}
        onFocus={() => {
          setFocused(true);
          setDraft(formatted);
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseCityState(draft);
          setDraft(formatCityState(parsed.city, parsed.state));
          onChange(parsed.city, parsed.state);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const parsed = parseCityState(next);
          onChange(parsed.city, parsed.state);
        }}
        placeholder="Orange, TX"
        required={required}
      />
      {helpText ? <span className="storiq-help">{helpText}</span> : null}
    </label>
  );
}
