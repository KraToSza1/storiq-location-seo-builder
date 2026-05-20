import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CopyButtonProps {
  value: string;
  label: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
}

export default function CopyButton({ value, label, className = "", variant = "primary" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const variantClass =
    variant === "secondary" ? "storiq-btn-secondary" : variant === "ghost" ? "storiq-btn-ghost" : "storiq-btn-primary";

  return (
    <button type="button" onClick={copy} className={`storiq-btn ${variantClass} ${className}`}>
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}
