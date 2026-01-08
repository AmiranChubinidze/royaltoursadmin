import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusCheckboxProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export function StatusCheckbox({ checked, onChange, disabled }: StatusCheckboxProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative h-6 w-6 rounded-full border-2 transition-all duration-200 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-emerald-500 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
          : "border-muted-foreground/40 bg-transparent hover:border-muted-foreground/60"
      )}
    >
      <Check
        className={cn(
          "absolute inset-0 m-auto h-3.5 w-3.5 text-white transition-all duration-200",
          checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}
        strokeWidth={3}
      />
    </button>
  );
}
