import { useState } from "react";
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
import { Plus, Trash2, Hotel, X, Pencil } from "lucide-react";
import {
  useSavedHotels,
  useCreateSavedHotel,
  useUpdateSavedHotel,
  useDeleteSavedHotel,
  SavedHotel,
} from "@/hooks/useSavedData";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

export default function SavedData() {
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

  return (
    <div>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="page-title text-foreground">Saved Hotels</h1>
          <p className="text-muted-foreground">Manage hotels and their activities for quick reuse</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Hotels & Activities</CardTitle>
            <Dialog open={hotelDialogOpen} onOpenChange={(open) => {
              if (!open) closeAddDialog();
              else setHotelDialogOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
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
          <CardContent>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Activities</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotels?.map((hotel) => (
                    <TableRow key={hotel.id}>
                      <TableCell className="font-medium">{hotel.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {hotel.is_owned ? (
                            <Badge variant="secondary" className="text-xs">Owned</Badge>
                          ) : (
                            <span>{hotel.email || "—"}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {hotel.activities?.length > 0 ? (
                            hotel.activities.map((activity) => (
                              <Badge key={activity} variant="outline" className="text-xs">
                                {activity}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">—</span>
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
