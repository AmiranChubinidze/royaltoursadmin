import { useState } from "react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useHolders } from "@/hooks/useHolders";
import { cn } from "@/lib/utils";

interface ConfirmWithResponsiblePopoverProps {
  checked: boolean;
  currentResponsibleId: string | null;
  onConfirm: (responsibleHolderId: string | null) => void;
  disabled?: boolean;
}

export function ConfirmWithResponsiblePopover({
  checked,
  currentResponsibleId,
  onConfirm,
  disabled,
}: ConfirmWithResponsiblePopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedHolder, setSelectedHolder] = useState<string>(currentResponsibleId || "none");
  const { data: holders } = useHolders();

  const handleClick = () => {
    if (checked) {
      // If already confirmed, just unconfirm without popup
      onConfirm(currentResponsibleId);
    } else {
      // Open popover to select responsible
      setSelectedHolder(currentResponsibleId || "none");
      setOpen(true);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedHolder === "none" ? null : selectedHolder);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            "relative h-5 w-5 rounded-full border-2 transition-all duration-200 ease-out",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            checked
              ? "border-emerald-500 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
              : "border-muted-foreground/40 bg-transparent hover:border-muted-foreground/60"
          )}
        >
          <Check
            className={cn(
              "absolute inset-0 m-auto h-3 w-3 text-white transition-all duration-200",
              checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
            )}
            strokeWidth={3}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">Who received/paid?</p>
          <Select value={selectedHolder} onValueChange={setSelectedHolder}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Select holder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No one / Unknown</SelectItem>
              {holders?.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="w-full" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
