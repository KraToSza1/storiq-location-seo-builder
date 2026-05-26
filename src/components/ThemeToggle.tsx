import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { debugLog } from "../lib/debugLog";
import { useTheme, type ThemeMode } from "../context/ThemeContext";

const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Light — Sage & Cream", icon: Sun },
  { mode: "dark", label: "Dark — Midnight Forest", icon: Moon },
  { mode: "sunset", label: "Sunset Brass — Coastal dark", icon: Palette },
  { mode: "system", label: "System (light or forest dark)", icon: Monitor },
];

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="storiq-theme-toggle storiq-theme-toggle--4" role="group" aria-label="Color theme">
      {options.map(({ mode: optionMode, label, icon: Icon }) => (
        <button
          key={optionMode}
          type="button"
          aria-pressed={mode === optionMode}
          aria-label={label}
          title={label}
          onClick={() => {
            debugLog("ThemeToggle", "theme changed", { mode: optionMode });
            setMode(optionMode);
          }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
