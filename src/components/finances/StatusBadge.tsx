import { cn } from "@/lib/utils";
import { Check, Clock, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: "paid" | "pending" | "overdue";
  label?: string;
  size?: "sm" | "default";
}

const statusConfig = {
  paid: {
    icon: Check,
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Paid",
  },
  pending: {
    icon: Clock,
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    label: "Pending",
  },
  overdue: {
    icon: AlertCircle,
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    label: "Overdue",
  },
};

export function StatusBadge({ status, label, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        config.bg,
        config.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {label || config.label}
    </span>
  );
}
