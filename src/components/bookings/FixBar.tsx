import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, Link2Off, TrendingDown } from "lucide-react";
import { ProblemFilter } from "./types";

interface FixBarProps {
  counts: {
    loose: number;
    unpaid: number;
    pending: number;
    negative: number;
  };
  activeFilter: ProblemFilter;
  onFilterChange: (filter: ProblemFilter) => void;
}

export function FixBar({ counts, activeFilter, onFilterChange }: FixBarProps) {
  const pills = [
    {
      key: "loose" as const,
      label: "Loose Tx",
      count: counts.loose,
      icon: Link2Off,
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      activeColor: "bg-orange-500 text-white",
    },
    {
      key: "unpaid" as const,
      label: "Unpaid/Partial",
      count: counts.unpaid,
      icon: AlertTriangle,
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      activeColor: "bg-yellow-500 text-white",
    },
    {
      key: "pending" as const,
      label: "Pending Tx",
      count: counts.pending,
      icon: Clock,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      activeColor: "bg-blue-500 text-white",
    },
    {
      key: "negative" as const,
      label: "Negative Net",
      count: counts.negative,
      icon: TrendingDown,
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      activeColor: "bg-red-500 text-white",
    },
  ];

  const hasAnyProblems = Object.values(counts).some((c) => c > 0);

  if (!hasAnyProblems) return null;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {pills.map((pill) => {
          if (pill.count === 0) return null;
          const isActive = activeFilter === pill.key;
          const Icon = pill.icon;

          return (
            <button
              key={pill.key}
              onClick={() => onFilterChange(isActive ? null : pill.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all whitespace-nowrap",
                isActive ? pill.activeColor : pill.color
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{pill.label}</span>
              <span className={cn(
                "ml-1 px-2 py-0.5 rounded-full text-xs font-bold",
                isActive ? "bg-white/20" : "bg-black/10 dark:bg-white/10"
              )}>
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
