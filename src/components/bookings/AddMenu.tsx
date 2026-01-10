import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ArrowDownLeft, ArrowUpRight, FileText } from "lucide-react";

interface AddMenuProps {
  onAddPayment: () => void;
  onAddExpense: () => void;
  onAddBooking: () => void;
}

export function AddMenu({ onAddPayment, onAddExpense, onAddBooking }: AddMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 mb-2">
        <DropdownMenuItem 
          onClick={() => {
            onAddPayment();
            setOpen(false);
          }}
          className="cursor-pointer"
        >
          <ArrowDownLeft className="h-4 w-4 mr-2 text-emerald-600" />
          Add Payment
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            onAddExpense();
            setOpen(false);
          }}
          className="cursor-pointer"
        >
          <ArrowUpRight className="h-4 w-4 mr-2 text-red-600" />
          Add Expense
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            onAddBooking();
            setOpen(false);
          }}
          className="cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2 text-blue-600" />
          Add Booking
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
