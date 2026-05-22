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
  const display = formatCityState(city, state);

  return (
    <label className="block">
      <span className="storiq-label">
        City, State{required ? <span className="storiq-required"> *</span> : null}
      </span>
      <input
        className="storiq-input mt-1"
        value={display}
        onChange={(event) => {
          const parsed = parseCityState(event.target.value);
          onChange(parsed.city, parsed.state);
        }}
        placeholder="Orange, TX"
        required={required}
      />
      {helpText ? <span className="storiq-help">{helpText}</span> : null}
    </label>
  );
}
