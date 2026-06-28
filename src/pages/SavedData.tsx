import { useMemo, useState } from "react";
import { ExpenseRulesSection } from "@/components/ExpenseRulesSection";
import { HotelPriceAttachments } from "@/components/HotelPriceAttachments";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Hotel, X, Pencil, Mail, MapPin, BedDouble } from "lucide-react";
import {
  useSavedHotels,
  useCreateSavedHotel,
  useUpdateSavedHotel,
  useDeleteSavedHotel,
  SavedHotel,
} from "@/hooks/useSavedData";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function SavedData() {
  const isMobile = useIsMobile();
  const { data: hotels, isLoading: hotelsLoading } = useSavedHotels();
  const createHotel = useCreateSavedHotel();
  const updateHotel = useUpdateSavedHotel();
  const deleteHotel = useDeleteSavedHotel();

  // Hotel form state
  const [hotelName, setHotelName] = useState("");
  const [hotelEmail, setHotelEmail] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelActivities, setHotelActivities] = useState<string[]>([]);
  const [activityInput, setActivityInput] = useState("");
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false);
  const [hotelOwned, setHotelOwned] = useState(false);
  // Rooms tracking (owned hotels only)
  const [roomsTracked, setRoomsTracked] = useState(false);
  const [roomCount, setRoomCount] = useState("");

  // Edit state
  const [editingHotel, setEditingHotel] = useState<SavedHotel | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const resetForm = () => {
    setHotelName("");
    setHotelEmail("");
    setHotelAddress("");
    setHotelActivities([]);
    setActivityInput("");
    setHotelOwned(false);
    setRoomsTracked(false);
    setRoomCount("");
  };

  // room_count is null unless this is an owned hotel with tracking on and a positive count.
  const resolveRoomCount = (): number | null => {
    if (!hotelOwned || !roomsTracked) return null;
    const n = parseInt(roomCount, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const addActivity = () => {
    if (activityInput.trim() && !hotelActivities.includes(activityInput.trim())) {
      setHotelActivities([...hotelActivities, activityInput.trim()]);
      setActivityInput("");
    }
  };

  const removeActivity = (activity: string) => {
    setHotelActivities(hotelActivities.filter(a => a !== activity));
  };

  const handleAddHotel = async () => {
    if (!hotelName.trim()) {
      toast({ title: "Hotel name is required", variant: "destructive" });
      return;
    }
    try {
      await createHotel.mutateAsync({
        name: hotelName,
        email: hotelOwned ? null : (hotelEmail || null),
        address: hotelAddress || null,
        activities: hotelActivities,
        is_owned: hotelOwned,
        room_count: resolveRoomCount(),
      });
      toast({ title: "Hotel saved successfully" });
      resetForm();
      setHotelDialogOpen(false);
    } catch (error) {
      toast({ title: "Error saving hotel", variant: "destructive" });
    }
  };

  const openAddDialog = (owned: boolean) => {
    resetForm();
    setHotelOwned(owned);
    setHotelDialogOpen(true);
  };

  const openEditDialog = (hotel: SavedHotel) => {
    setEditingHotel(hotel);
    setHotelName(hotel.name);
    setHotelEmail(hotel.email || "");
    setHotelAddress(hotel.address || "");
    setHotelActivities(hotel.activities || []);
    setHotelOwned(hotel.is_owned || false);
    setRoomsTracked(hotel.room_count != null);
    setRoomCount(hotel.room_count != null ? String(hotel.room_count) : "");
    setEditDialogOpen(true);
  };

  const handleUpdateHotel = async () => {
    if (!editingHotel) return;
    if (!hotelName.trim()) {
      toast({ title: "Hotel name is required", variant: "destructive" });
      return;
    }
    try {
      await updateHotel.mutateAsync({
        id: editingHotel.id,
        name: hotelName,
        email: hotelOwned ? null : (hotelEmail || null),
        address: hotelAddress || null,
        activities: hotelActivities,
        is_owned: hotelOwned,
        room_count: resolveRoomCount(),
      });
      toast({ title: "Hotel updated successfully" });
      resetForm();
      setEditingHotel(null);
      setEditDialogOpen(false);
    } catch (error) {
      toast({ title: "Error updating hotel", variant: "destructive" });
    }
  };

  const handleDeleteHotel = async (id: string) => {
    await deleteHotel.mutateAsync(id);
    toast({ title: "Hotel deleted" });
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingHotel(null);
    resetForm();
  };

  const closeAddDialog = () => {
    setHotelDialogOpen(false);
    resetForm();
  };

  const ownedHotels = useMemo(() => (hotels || []).filter((h) => h.is_owned), [hotels]);
  const otherHotels = useMemo(() => (hotels || []).filter((h) => !h.is_owned), [hotels]);
  const ownedWithRooms = ownedHotels.filter((h) => h.room_count != null).length;
  const otherWithEmail = otherHotels.filter((h) => h.email).length;

  // Reusable list renderer for one ownership group.
  const renderHotels = (list: SavedHotel[], showRooms: boolean, emptyText: string) => {
    if (list.length === 0) {
      return <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>;
    }
    if (isMobile) {
      return (
        <div className="space-y-3">
          {list.map((hotel) => (
            <div
              key={hotel.id}
              className="rounded-xl border border-[#0F4C5C]/10 bg-white p-3.5 shadow-[0_6px_16px_rgba(15,76,92,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{hotel.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">
                    {hotel.is_owned ? "Company-owned" : hotel.email || "No email"}
                  </div>
                </div>
                {showRooms && hotel.room_count != null && (
                  <Badge variant="outline" className="shrink-0 gap-1 border-[#0F4C5C]/20 text-[#0F4C5C] text-[10px]">
                    <BedDouble className="h-3 w-3" />
                    {hotel.room_count}
                  </Badge>
                )}
              </div>
              {hotel.activities?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hotel.activities.map((activity) => (
                    <Badge key={activity} variant="outline" className="text-[10px] border-[#0F4C5C]/20 text-[#0F4C5C]">
                      {activity}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => openEditDialog(hotel)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Hotel</AlertDialogTitle>
                      <AlertDialogDescription>Are you sure you want to delete {hotel.name}?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteHotel(hotel.id)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Name</TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {showRooms ? "Rooms" : "Contact"}
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Activities</TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((hotel) => (
            <TableRow key={hotel.id} className="hover:bg-[#F7FBFC] transition-colors">
              <TableCell className="font-medium">
                <div className="text-sm font-semibold">{hotel.name}</div>
                {hotel.address && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {hotel.address}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {showRooms ? (
                  hotel.room_count != null ? (
                    <Badge variant="outline" className="gap-1 border-[#0F4C5C]/20 text-[#0F4C5C] text-xs">
                      <BedDouble className="h-3.5 w-3.5" />
                      {hotel.room_count} rooms
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {hotel.email || "--"}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {hotel.activities?.length > 0 ? (
                    hotel.activities.map((activity) => (
                      <Badge key={activity} variant="outline" className="text-xs border-[#0F4C5C]/20 text-[#0F4C5C]">
                        {activity}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(hotel)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Hotel</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete {hotel.name}?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteHotel(hotel.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const addButton = (owned: boolean) => (
    <Button
      size="sm"
      className="rounded-full bg-[#0F4C5C] text-white hover:bg-[#0F4C5C]/90"
      onClick={() => openAddDialog(owned)}
    >
      <Plus className="h-4 w-4 mr-1" />
      Add
    </Button>
  );

  return (
    <div>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className={cn("mb-6", isMobile && "mb-4")}>
          <h1 className={cn("page-title text-foreground", isMobile && "text-[22px]")}>Saved Data</h1>
          <p className={cn("text-muted-foreground", isMobile && "text-xs")}>
            Hotels, rooms, and expense rules for quick reuse
          </p>
        </div>

        {hotelsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Our Hotels (owned) */}
            <CollapsibleSection
              icon={<Hotel className="h-4 w-4 text-[#0F4C5C]" />}
              title="Our Hotels"
              summary={`${ownedHotels.length} ${ownedHotels.length === 1 ? "hotel" : "hotels"}${
                ownedWithRooms > 0 ? ` · ${ownedWithRooms} with rooms` : ""
              }`}
              action={addButton(true)}
              defaultOpen
              tinted
              storageKey="saved-data-our-hotels"
            >
              {renderHotels(ownedHotels, true, "No company-owned hotels yet.")}
            </CollapsibleSection>

            {/* Other Hotels (partners) */}
            <CollapsibleSection
              icon={<BedDouble className="h-4 w-4 text-muted-foreground" />}
              title="Other Hotels"
              summary={`${otherHotels.length} ${otherHotels.length === 1 ? "hotel" : "hotels"}${
                otherWithEmail > 0 ? ` · ${otherWithEmail} with email` : ""
              }`}
              action={addButton(false)}
              storageKey="saved-data-other-hotels"
            >
              {renderHotels(otherHotels, false, "No partner hotels yet.")}
            </CollapsibleSection>

            {/* Expense Rules */}
            <ExpenseRulesSection />
          </div>
        )}

        {/* Add Dialog */}
        <Dialog
          open={hotelDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeAddDialog();
            else setHotelDialogOpen(true);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Hotel</DialogTitle>
              <DialogDescription>
                Save hotel details and activities for quick selection in confirmation forms.
              </DialogDescription>
            </DialogHeader>
            {renderHotelFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={closeAddDialog}>
                Cancel
              </Button>
              <Button onClick={handleAddHotel} disabled={createHotel.isPending}>
                {createHotel.isPending ? "Saving..." : "Save Hotel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Hotel</DialogTitle>
              <DialogDescription>Update hotel details and activities.</DialogDescription>
            </DialogHeader>
            {renderHotelFormFields()}
            {editingHotel && (
              <div className="border-t pt-4">
                <HotelPriceAttachments hotelId={editingHotel.id} />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button onClick={handleUpdateHotel} disabled={updateHotel.isPending}>
                {updateHotel.isPending ? "Updating..." : "Update Hotel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  // Shared form fields for Add + Edit dialogs.
  function renderHotelFormFields() {
    return (
      <div className="space-y-4 py-4">
        <div>
          <Label>Hotel Name *</Label>
          <Input value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="e.g. ONYX" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="hotel-owned"
            checked={hotelOwned}
            onCheckedChange={(checked) => {
              const next = Boolean(checked);
              setHotelOwned(next);
              if (next) {
                setHotelEmail("");
              } else {
                setRoomsTracked(false);
                setRoomCount("");
              }
            }}
          />
          <Label htmlFor="hotel-owned" className="text-sm">
            Company-owned hotel (no email needed)
          </Label>
        </div>

        {hotelOwned ? (
          <div className="rounded-xl border border-[#0F4C5C]/15 bg-[#F7FAFB] p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-[#0F4C5C]" />
                <Label htmlFor="rooms-tracked" className="text-sm font-medium text-[#0F4C5C]">
                  Track room availability
                </Label>
              </div>
              <Switch
                id="rooms-tracked"
                checked={roomsTracked}
                onCheckedChange={(checked) => {
                  setRoomsTracked(checked);
                  if (!checked) setRoomCount("");
                }}
              />
            </div>
            {roomsTracked && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Total rooms</Label>
                <Input
                  type="number"
                  min={1}
                  value={roomCount}
                  onChange={(e) => setRoomCount(e.target.value)}
                  placeholder="e.g. 10"
                  className="h-9 w-28"
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={hotelEmail}
              onChange={(e) => setHotelEmail(e.target.value)}
              placeholder="reservations@hotel.com"
            />
          </div>
        )}

        <div>
          <Label>Address</Label>
          <Input value={hotelAddress} onChange={(e) => setHotelAddress(e.target.value)} placeholder="Hotel address" />
        </div>
        <div>
          <Label>Activities</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              value={activityInput}
              onChange={(e) => setActivityInput(e.target.value)}
              placeholder="e.g. Tbilisi Tour"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addActivity();
                }
              }}
            />
            <Button type="button" onClick={addActivity} variant="secondary">
              Add
            </Button>
          </div>
          {hotelActivities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {hotelActivities.map((activity) => (
                <Badge key={activity} variant="secondary" className="gap-1">
                  {activity}
                  <button type="button" onClick={() => removeActivity(activity)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}
