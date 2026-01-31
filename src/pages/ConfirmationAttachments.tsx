import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Upload, FileText, Trash2, Download, CheckCircle, Clock, Loader2, Plus, MessageSquare, Save, Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useConfirmation, useUpdateConfirmationNotes } from "@/hooks/useConfirmations";
import { 
  useConfirmationAttachments, 
  useUploadAttachment, 
  useDeleteAttachment, 
  useMarkAsPaid,
  useAttachmentExpenses,
} from "@/hooks/useConfirmationAttachments";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { TransactionModal } from "@/components/finances/TransactionModal";
import { useCurrency, Currency } from "@/contexts/CurrencyContext";

export default function ConfirmationAttachments() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { exchangeRate } = useCurrency();
  const { toast } = useToast();
  
  const { data: confirmation, isLoading: confirmationLoading } = useConfirmation(id);
  const { data: attachments, isLoading: attachmentsLoading } = useConfirmationAttachments(id);
  const { data: expenseMap } = useAttachmentExpenses(id);
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();
  const markPaidMutation = useMarkAsPaid();
  const updateNotesMutation = useUpdateConfirmationNotes();
  
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceCurrency, setInvoiceCurrency] = useState<Currency>("USD");
  
  // Transaction modal state
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState("");
  const [notesEditing, setNotesEditing] = useState(false);
  
  // Sync notes when confirmation loads
  useEffect(() => {
    if (confirmation) {
      setNotes((confirmation as any).notes || "");
    }
  }, [confirmation]);
  
  // Hotel file input ref map
  const [hotelUploadIndex, setHotelUploadIndex] = useState<number | null>(null);

  // Auto-mark as paid when all hotel stays have invoices
  useEffect(() => {
    if (!confirmation || !attachments || !id || markPaidMutation.isPending) return;
    const isPaidNow = (confirmation as any).is_paid;
    if (isPaidNow) return;

    const itineraryData = confirmation.raw_payload?.itinerary || [];
    const stays: { hotel: string }[] = [];
    let curHotel = "";
    for (const day of itineraryData) {
      const h = (day.hotel || "").trim();
      if (!h || h === "-" || h.toLowerCase() === "n/a") { curHotel = ""; continue; }
      if (h !== curHotel) { stays.push({ hotel: h }); curHotel = h; }
    }
    if (stays.length === 0 && confirmation.raw_payload?.hotelBookings) {
      for (const hb of confirmation.raw_payload.hotelBookings) {
        stays.push({ hotel: hb.hotelName });
      }
    }
    if (stays.length === 0) return;

    const allCovered = stays.every((stay, idx) => {
      const lower = stay.hotel.toLowerCase();
      const sameHotelBefore = stays.slice(0, idx).filter(s => s.hotel === stay.hotel).length;
      const matches = attachments.filter(a => a.file_name.toLowerCase().includes(lower));
      return !!(matches[sameHotelBefore] || matches[0]);
    });

    if (allCovered) {
      markPaidMutation.mutate(id);
    }
  }, [confirmation, attachments, id]);

  const canUpload = role === "admin" || role === "worker" || role === "accountant";
  const canDelete = role === "admin" || role === "worker";
  const canAddTransaction = role === "admin" || role === "worker" || role === "accountant";
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (canUpload) setIsDragging(true);
  }, [canUpload]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!canUpload || !id) return;
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(f => f.type === "application/pdf");
    
    if (pdfFile) {
      setPendingFile(pdfFile);
      setInvoiceName(pdfFile.name.replace(/\.pdf$/i, ""));
      setInvoiceAmount("");
      setUploadDialogOpen(true);
    }
  }, [canUpload, id]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpload || !id || !e.target.files) return;
    
    const file = e.target.files[0];
    if (file) {
      setPendingFile(file);
      setInvoiceName(file.name.replace(/\.pdf$/i, ""));
      setInvoiceAmount("");
      setUploadDialogOpen(true);
    }
    
    e.target.value = "";
  }, [canUpload, id]);

  const handleUploadConfirm = useCallback(() => {
    if (!pendingFile || !id) return;
    
    // Store amount in original currency
    const parsedAmount = invoiceAmount ? parseFloat(invoiceAmount) : undefined;
    
    uploadMutation.mutate({
      confirmationId: id,
      file: pendingFile,
      customName: invoiceName,
      amount: parsedAmount,
      originalCurrency: invoiceCurrency,
      originalAmount: parsedAmount,
    });
    
    setUploadDialogOpen(false);
    setPendingFile(null);
    setInvoiceName("");
    setInvoiceAmount("");
    setInvoiceCurrency("USD");
  }, [pendingFile, id, invoiceName, invoiceAmount, invoiceCurrency, uploadMutation]);

  const handleDownload = async (filePath: string, fileName: string, attachmentId: string) => {
    setDownloadingId(attachmentId);
    try {
      const { data, error } = await supabase.storage
        .from("confirmation-attachments")
        .download(filePath);
      
      if (error) {
        toast({
          title: "Download failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      toast({
        title: "Download failed",
        description: "Could not download the file.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (confirmationLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!confirmation) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">Confirmation not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = (confirmation as any).is_paid;
  const paidAt = (confirmation as any).paid_at;
  const hasAttachments = attachments && attachments.length > 0;

  // Extract hotel stays from itinerary — each consecutive run of the same hotel = one stay
  const hotelStays: { hotel: string; checkIn: string; checkOut: string }[] = [];
  const itinerary = confirmation.raw_payload?.itinerary || [];
  if (itinerary.length > 0) {
    let currentHotel = "";
    let checkIn = "";
    for (let i = 0; i < itinerary.length; i++) {
      const day = itinerary[i];
      const hotelName = (day.hotel || "").trim();
      if (!hotelName || hotelName === "-" || hotelName.toLowerCase() === "n/a") {
        if (currentHotel) {
          hotelStays.push({ hotel: currentHotel, checkIn, checkOut: day.date || itinerary[i - 1]?.date || "" });
          currentHotel = "";
          checkIn = "";
        }
        continue;
      }
      if (hotelName !== currentHotel) {
        if (currentHotel) {
          hotelStays.push({ hotel: currentHotel, checkIn, checkOut: day.date || "" });
        }
        currentHotel = hotelName;
        checkIn = day.date || "";
      }
    }
    if (currentHotel) {
      const lastDay = itinerary[itinerary.length - 1];
      hotelStays.push({ hotel: currentHotel, checkIn, checkOut: lastDay.date || "" });
    }
  }
  // Also include hotelBookings from draft flow if no itinerary hotels found
  if (hotelStays.length === 0 && confirmation.raw_payload?.hotelBookings) {
    for (const hb of confirmation.raw_payload.hotelBookings) {
      hotelStays.push({ hotel: hb.hotelName, checkIn: hb.checkIn, checkOut: hb.checkOut });
    }
  }

  // Check which hotel stays already have an uploaded invoice (match by hotel name in attachment file_name)
  const getMatchingAttachment = (hotelName: string, stayIndex: number) => {
    if (!attachments) return null;
    // Look for attachments whose name contains the hotel name (case-insensitive)
    const lower = hotelName.toLowerCase();
    const matches = attachments.filter(a => a.file_name.toLowerCase().includes(lower));
    return matches[stayIndex] || matches[0] || null;
  };

  const handleHotelFileSelect = (e: React.ChangeEvent<HTMLInputElement>, hotelName: string) => {
    if (!canUpload || !id || !e.target.files) return;
    const file = e.target.files[0];
    if (file) {
      setPendingFile(file);
      setInvoiceName(hotelName);
      setInvoiceAmount("");
      setUploadDialogOpen(true);
    }
    e.target.value = "";
    setHotelUploadIndex(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(-1)}
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Confirmation Info Card */}
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl font-mono text-primary flex items-center gap-2">
                  {isPaid && (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  )}
                  {confirmation.confirmation_code}
                </CardTitle>
                <CardDescription className="mt-1">
                  {confirmation.main_client_name} • Arrival: {confirmation.arrival_date}
                </CardDescription>
              </div>
              <Badge 
                variant={isPaid ? "default" : "secondary"}
                className={cn(
                  "text-sm px-3 py-1",
                  isPaid && "bg-emerald-500 hover:bg-emerald-500/90"
                )}
              >
                {isPaid ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Paid
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Pending
                  </span>
                )}
              </Badge>
            </div>
            {isPaid && paidAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Marked as paid on {format(new Date(paidAt), "MMM d, yyyy 'at' HH:mm")}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Notes Section */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notesEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this confirmation..."
                  className="min-h-[80px] resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (id) {
                        updateNotesMutation.mutate({ id, notes });
                        setNotesEditing(false);
                      }
                    }}
                    disabled={updateNotesMutation.isPending}
                  >
                    {updateNotesMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNotes((confirmation as any)?.notes || "");
                      setNotesEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                className="w-full text-left p-2 rounded-md hover:bg-muted/50 transition-colors min-h-[40px]"
                onClick={() => setNotesEditing(true)}
              >
                {notes ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Click to add notes...</p>
                )}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Hotel Invoices Checklist */}
        {hotelStays.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hotel className="h-5 w-5 text-primary" />
                  Hotel Invoices
                </CardTitle>
                {canAddTransaction && (
                  <Button size="sm" variant="outline" onClick={() => setTransactionModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Transaction
                  </Button>
                )}
              </div>
              <CardDescription>Upload an invoice for each hotel stay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {hotelStays.map((stay, idx) => {
                // Count how many times this hotel appeared before this index
                const sameHotelBefore = hotelStays.slice(0, idx).filter(s => s.hotel === stay.hotel).length;
                const match = getMatchingAttachment(stay.hotel, sameHotelBefore);
                const hasInvoice = !!match;
                const expense = match && expenseMap?.[match.id];

                return (
                  <div
                    key={`${stay.hotel}-${idx}`}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors group",
                      hasInvoice
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-muted/30 border-border"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-full shrink-0",
                      hasInvoice
                        ? "bg-emerald-500 text-white"
                        : "border-2 border-muted-foreground/30"
                    )}>
                      {hasInvoice && <CheckCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        hasInvoice && "text-emerald-700 dark:text-emerald-400"
                      )}>
                        {stay.hotel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stay.checkIn}{stay.checkOut && stay.checkOut !== stay.checkIn ? ` → ${stay.checkOut}` : ""}
                      </p>
                    </div>
                    {hasInvoice && expense?.amount != null && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                        {expense.currency === "GEL" ? "₾" : "$"}{expense.amount.toLocaleString()}
                      </Badge>
                    )}
                    {hasInvoice && match ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(match.file_path, match.file_name, match.id)}
                          disabled={downloadingId === match.id}
                          title="Download"
                        >
                          {downloadingId === match.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{match.file_name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate({
                                    attachmentId: match.id,
                                    filePath: match.file_path,
                                    confirmationId: id!,
                                  })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ) : canUpload ? (
                      <label className="shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 pointer-events-none"
                          asChild
                        >
                          <span>
                            <Upload className="h-3.5 w-3.5" />
                            Upload
                          </span>
                        </Button>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,application/pdf"
                          onChange={(e) => handleHotelFileSelect(e, stay.hotel)}
                          disabled={uploadMutation.isPending}
                        />
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}




        {/* Upload Invoice Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setUploadDialogOpen(false);
            setPendingFile(null);
            setInvoiceName("");
            setInvoiceAmount("");
            setInvoiceCurrency("USD");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-name">Invoice Name</Label>
                <Input
                  id="invoice-name"
                  value={invoiceName}
                  onChange={(e) => setInvoiceName(e.target.value)}
                  placeholder="e.g. Hotel Marriott - Room 204"
                />
                <p className="text-xs text-muted-foreground">.pdf will be added automatically</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-amount">Amount Paid</Label>
                <div className="flex gap-2">
                  <Input
                    id="invoice-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <div className="flex rounded-md border border-input bg-background overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setInvoiceCurrency("USD")}
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors",
                        invoiceCurrency === "USD"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      $
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceCurrency("GEL")}
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors",
                        invoiceCurrency === "GEL"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      ₾
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will be recorded as a hotel expense
                  {invoiceCurrency === "GEL" && invoiceAmount && (
                    <span className="text-muted-foreground">
                      {" "}(≈ ${(parseFloat(invoiceAmount) * exchangeRate.gel_to_usd).toFixed(2)} USD)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadConfirm}
                disabled={uploadMutation.isPending || !invoiceName.trim()}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Modal */}
        <TransactionModal
          open={transactionModalOpen}
          onOpenChange={setTransactionModalOpen}
          defaultConfirmationId={id}
        />
      </div>
    </div>
  );
}
