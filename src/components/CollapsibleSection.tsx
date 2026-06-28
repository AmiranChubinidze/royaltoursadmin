import { ReactNode, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Reusable collapsible card section for the Saved Data page.
// Header: icon + title + summary + optional action (e.g. an Add button) + chevron.
// Open state self-persists to localStorage under `storageKey`.
export function CollapsibleSection({
  icon,
  title,
  summary,
  action,
  defaultOpen = false,
  storageKey,
  tinted = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  summary?: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
  storageKey: string;
  tinted?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (raw === "open") setOpen(true);
    else if (raw === "closed") setOpen(false);
  }, [storageKey]);

  const toggle = (next: boolean) => {
    setOpen(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, next ? "open" : "closed");
    }
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={toggle}
      className={cn(
        "rounded-2xl border shadow-[0_10px_24px_rgba(15,76,92,0.08)] overflow-hidden",
        tinted ? "border-[#0F4C5C]/20 bg-[#F4FBFB]" : "border-border/60 bg-white"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <CollapsibleTrigger className="group flex flex-1 items-center gap-3 min-w-0 text-left">
          <div
            className={cn(
              "h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center",
              tinted ? "bg-[#EAF7F8] border-[#0F4C5C]/15" : "bg-muted border-border/60"
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#0F4C5C]">{title}</div>
            {summary && <div className="text-[11px] text-muted-foreground truncate">{summary}</div>}
          </div>
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <CollapsibleContent>
        <div className="border-t border-border/40 p-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
