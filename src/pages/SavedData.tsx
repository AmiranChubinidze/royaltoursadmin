import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Hotel, X, Pencil, Mail, MapPin } from "lucide-react";
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
      });
      toast({ title: "Hotel saved successfully" });
      resetForm();
      setHotelDialogOpen(false);
    } catch (error) {
      toast({ title: "Error saving hotel", variant: "destructive" });
    }
  };

  const openEditDialog = (hotel: SavedHotel) => {
    setEditingHotel(hotel);
    setHotelName(hotel.name);
    setHotelEmail(hotel.email || "");
    setHotelAddress(hotel.address || "");
    setHotelActivities(hotel.activities || []);
    setHotelOwned(hotel.is_owned || false);
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

  const stats = useMemo(() => {
    const total = hotels?.length ?? 0;
    const owned = hotels?.filter((h) => h.is_owned).length ?? 0;
    const withEmail = hotels?.filter((h) => h.email).length ?? 0;
    const activities = hotels?.reduce((sum, h) => sum + (h.activities?.length || 0), 0) ?? 0;
    return { total, owned, withEmail, activities };
  }, [hotels]);

  return (
    <div>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className={cn("mb-8", isMobile && "mb-5")}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className={cn("page-title text-foreground", isMobile && "text-[22px]")}>Saved Hotels</h1>
              <p className={cn("text-muted-foreground", isMobile && "text-xs")}>
                Manage hotels and activities for quick reuse
              </p>
            </div>
            {!isMobile && (
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-[#0F4C5C]/10 bg-white px-4 py-2 text-xs text-muted-foreground">
                  {stats.total} hotels - {stats.activities} activities
                </div>
              </div>
            )}
          </div>
          <div className={cn("mt-5 grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-4")}>
            {[
              { label: "Total Hotels", value: stats.total },
              { label: "Owned", value: stats.owned },
              { label: "With Email", value: stats.withEmail },
              { label: "Activities", value: stats.activities },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#0F4C5C]/10 bg-gradient-to-br from-white via-white to-[#EAF7F8] px-4 py-3 shadow-[0_8px_20px_rgba(15,76,92,0.08)]"
              >
                <div className="text-xs uppercase tracking-[0.15em] text-[#0F4C5C]/60">{stat.label}</div>
                <div className="mt-1 text-xl font-semibold text-[#0F4C5C]">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <Card className={cn(
          "border-border/60 bg-white/95 shadow-[0_12px_30px_rgba(15,76,92,0.08)]",
          isMobile && "rounded-2xl"
        )}>
          <CardHeader className={cn("flex flex-row items-center justify-between", isMobile && "px-4 py-4")}>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hotel className="h-5 w-5 text-[#0F4C5C]" />
                Hotels & Activities
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Quick references for bookings and confirmations.</p>
            </div>
            <Dialog open={hotelDialogOpen} onOpenChange={(open) => {
              if (!open) closeAddDialog();
              else setHotelDialogOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className={cn("rounded-full bg-[#0F4C5C] text-white hover:bg-[#0F4C5C]/90", isMobile && "rounded-full")}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Hotel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Hotel</DialogTitle>
                  <DialogDescription>
                    Save hotel details and activities for quick selection in confirmation forms.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Hotel Name *</Label>
                    <Input
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      placeholder="e.g. ONYX"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={hotelEmail}
                      disabled={hotelOwned}
                      onChange={(e) => setHotelEmail(e.target.value)}
                      placeholder="reservations@hotel.com"
                    />
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
                        }
                      }}
                    />
                    <Label htmlFor="hotel-owned" className="text-sm">
                      Company-owned hotel (no email needed)
                    </Label>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={hotelAddress}
                      onChange={(e) => setHotelAddress(e.target.value)}
                      placeholder="Hotel address"
                    />
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
                            <button
                              type="button"
                              onClick={() => removeActivity(activity)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
          </CardHeader>
          <CardContent className={cn(isMobile && "px-4 pb-5")}>
            {hotelsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : hotels?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Hotel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No saved hotels yet</p>
              </div>
            ) : (
              isMobile ? (
                <div className="space-y-3">
                  {hotels?.map((hotel) => (
                    <div
                      key={hotel.id}
                      className="rounded-2xl border border-[#0F4C5C]/10 bg-white p-4 shadow-[0_8px_20px_rgba(15,76,92,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{hotel.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                            {hotel.is_owned ? "Company-owned" : hotel.email || "No email"}
                          </div>
                        </div>
                        {hotel.is_owned && (
                          <Badge variant="secondary" className="text-[10px] bg-[#0F4C5C]/10 text-[#0F4C5C]">Owned</Badge>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {hotel.activities?.length > 0 ? (
                          hotel.activities.map((activity) => (
                            <Badge key={activity} variant="outline" className="text-[10px] border-[#0F4C5C]/20 text-[#0F4C5C]">
                              {activity}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No activities</span>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => openEditDialog(hotel)}
                        >
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
                              <AlertDialogDescription>
                                Are you sure you want to delete {hotel.name}?
                              </AlertDialogDescription>
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
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Name</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Contact</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Activities</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotels?.map((hotel) => (
                      <TableRow key={hotel.id} className="hover:bg-[#F7FBFC] transition-colors">
                        <TableCell className="font-medium">
                          <div>
                            <div className="text-sm font-semibold">{hotel.name}</div>
                            {hotel.address && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {hotel.address}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {hotel.is_owned ? (
                              <Badge variant="secondary" className="text-xs bg-[#0F4C5C]/10 text-[#0F4C5C]">Owned</Badge>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                {hotel.email || "--"}
                              </span>
                            )}
                          </div>
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
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {hotel.name}?
                                  </AlertDialogDescription>
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
              )
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Hotel</DialogTitle>
              <DialogDescription>
                Update hotel details and activities.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Hotel Name *</Label>
                <Input
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  placeholder="e.g. ONYX"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={hotelEmail}
                  disabled={hotelOwned}
                  onChange={(e) => setHotelEmail(e.target.value)}
                  placeholder="reservations@hotel.com"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hotel-owned-edit"
                  checked={hotelOwned}
                  onCheckedChange={(checked) => {
                    const next = Boolean(checked);
                    setHotelOwned(next);
                    if (next) {
                      setHotelEmail("");
                    }
                  }}
                />
                <Label htmlFor="hotel-owned-edit" className="text-sm">
                  Company-owned hotel (no email needed)
                </Label>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={hotelAddress}
                  onChange={(e) => setHotelAddress(e.target.value)}
                  placeholder="Hotel address"
                />
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
                        <button
                          type="button"
                          onClick={() => removeActivity(activity)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
}
