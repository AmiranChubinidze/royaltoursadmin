import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Hotel, Users } from "lucide-react";
import {
  useSavedHotels,
  useSavedClients,
  useCreateSavedHotel,
  useCreateSavedClient,
  useDeleteSavedHotel,
  useDeleteSavedClient,
} from "@/hooks/useSavedData";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

export default function SavedData() {
  const navigate = useNavigate();
  const { data: hotels, isLoading: hotelsLoading } = useSavedHotels();
  const { data: clients, isLoading: clientsLoading } = useSavedClients();
  const createHotel = useCreateSavedHotel();
  const createClient = useCreateSavedClient();
  const deleteHotel = useDeleteSavedHotel();
  const deleteClient = useDeleteSavedClient();

  // Hotel form state
  const [hotelName, setHotelName] = useState("");
  const [hotelEmail, setHotelEmail] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false);

  // Client form state
  const [clientName, setClientName] = useState("");
  const [clientPassport, setClientPassport] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  const handleAddHotel = async () => {
    if (!hotelName.trim()) {
      toast({ title: "Hotel name is required", variant: "destructive" });
      return;
    }
    try {
      await createHotel.mutateAsync({
        name: hotelName,
        email: hotelEmail || null,
        phone: hotelPhone || null,
        address: hotelAddress || null,
      });
      toast({ title: "Hotel saved successfully" });
      setHotelName("");
      setHotelEmail("");
      setHotelPhone("");
      setHotelAddress("");
      setHotelDialogOpen(false);
    } catch (error) {
      toast({ title: "Error saving hotel", variant: "destructive" });
    }
  };

  const handleAddClient = async () => {
    if (!clientName.trim()) {
      toast({ title: "Client name is required", variant: "destructive" });
      return;
    }
    try {
      await createClient.mutateAsync({
        full_name: clientName,
        passport_number: clientPassport || null,
        phone: clientPhone || null,
        email: clientEmail || null,
        notes: null,
      });
      toast({ title: "Client saved successfully" });
      setClientName("");
      setClientPassport("");
      setClientPhone("");
      setClientEmail("");
      setClientDialogOpen(false);
    } catch (error) {
      toast({ title: "Error saving client", variant: "destructive" });
    }
  };

  const handleDeleteHotel = async (id: string) => {
    await deleteHotel.mutateAsync(id);
    toast({ title: "Hotel deleted" });
  };

  const handleDeleteClient = async (id: string) => {
    await deleteClient.mutateAsync(id);
    toast({ title: "Client deleted" });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Saved Data</h1>
            <p className="text-muted-foreground">Manage saved hotels and clients for quick reuse</p>
          </div>
        </div>

        <Tabs defaultValue="hotels" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="hotels" className="flex items-center gap-2">
              <Hotel className="h-4 w-4" />
              Hotels
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clients
            </TabsTrigger>
          </TabsList>

          {/* Hotels Tab */}
          <TabsContent value="hotels">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Saved Hotels</CardTitle>
                <Dialog open={hotelDialogOpen} onOpenChange={setHotelDialogOpen}>
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
                        Save hotel details for quick selection in confirmation forms.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Hotel Name *</Label>
                        <Input
                          value={hotelName}
                          onChange={(e) => setHotelName(e.target.value)}
                          placeholder="e.g. Marriott Tbilisi"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={hotelEmail}
                          onChange={(e) => setHotelEmail(e.target.value)}
                          placeholder="reservations@hotel.com"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={hotelPhone}
                          onChange={(e) => setHotelPhone(e.target.value)}
                          placeholder="+995 xxx xxx xxx"
                        />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Input
                          value={hotelAddress}
                          onChange={(e) => setHotelAddress(e.target.value)}
                          placeholder="Hotel address"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setHotelDialogOpen(false)}>
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
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hotels?.map((hotel) => (
                        <TableRow key={hotel.id}>
                          <TableCell className="font-medium">{hotel.name}</TableCell>
                          <TableCell>{hotel.email || "—"}</TableCell>
                          <TableCell>{hotel.phone || "—"}</TableCell>
                          <TableCell className="text-right">
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Saved Clients</CardTitle>
                <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Client</DialogTitle>
                      <DialogDescription>
                        Save client details for quick selection in confirmation forms.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Full Name *</Label>
                        <Input
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label>Passport Number</Label>
                        <Input
                          value={clientPassport}
                          onChange={(e) => setClientPassport(e.target.value)}
                          placeholder="AB1234567"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+1 xxx xxx xxxx"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="client@email.com"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setClientDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddClient} disabled={createClient.isPending}>
                        {createClient.isPending ? "Saving..." : "Save Client"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : clients?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved clients yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Passport</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients?.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.full_name}</TableCell>
                          <TableCell>{client.passport_number || "—"}</TableCell>
                          <TableCell>{client.email || "—"}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {client.full_name}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
