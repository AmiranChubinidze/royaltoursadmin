import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Upload, Trash2, Download, Eye, CheckCircle, Clock, Loader2, Plus, MessageSquare, Save, Hotel } from "lucide-react";
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
  useUnmarkAsPaid,
  useAttachmentExpenses,
  type ConfirmationAttachment,
} from "@/hooks/useConfirmationAttachments";
import { useUserRole } from "@/hooks/useUserRole";
import { useSavedHotels } from "@/hooks/useSavedData";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { TransactionModal } from "@/components/finances/TransactionModal";
import { useCurrency, Currency } from "@/contexts/CurrencyContext";
import { useQueryClient } from "@tanstack/react-query";

export default function ConfirmationAttachments() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { viewAsRole } = useViewAs();
  const effectiveRole = viewAsRole || role;
  const { exchangeRate } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const { data: confirmation, isLoading: confirmationLoading } = useConfirmation(id);
  const { data: attachments, isLoading: attachmentsLoading } = useConfirmationAttachments(id);
  const { data: expenseMap } = useAttachmentExpenses(id);
  const { data: savedHotels } = useSavedHotels();
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();
  const markPaidMutation = useMarkAsPaid();
  const unmarkPaidMutation = useUnmarkAsPaid();
  const updateNotesMutation = useUpdateConfirmationNotes();
  
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingStayKey, setPendingStayKey] = useState<string | null>(null);
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceCurrency, setInvoiceCurrency] = useState<Currency>("USD");
  const [uploadType, setUploadType] = useState<"invoice" | "payment">("invoice");
  
  // Transaction modal state
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    id: string;
    filePath: string;
    fileName: string;
  } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  
  // Notes state
  const [notes, setNotes] = useState("");
  const [notesEditing, setNotesEditing] = useState(false);
  const [manualInvoiceChecks, setManualInvoiceChecks] = useState<string[]>([]);
  const [invoiceCheckSaving, setInvoiceCheckSaving] = useState<string | null>(null);
  
  // Sync notes when confirmation loads
  useEffect(() => {
    if (confirmation) {
      setNotes((confirmation as any).notes || "");
    }
  }, [confirmation]);

  useEffect(() => {
    if (confirmation) {
      const rawChecks = (confirmation as any).raw_payload?.invoice_checks;
      setManualInvoiceChecks(Array.isArray(rawChecks) ? rawChecks : []);
    }
  }, [confirmation]);
  

  // Auto-mark as paid when all hotel stays have invoices
  useEffect(() => {
    if (!confirmation || !attachments || !id || markPaidMutation.isPending) return;
    const isPaidNow = (confirmation as any).is_paid;

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

    const ownedSet = new Set(
      (savedHotels || [])
        .filter((h) => h.is_owned)
        .map((h) => h.name.trim().toLowerCase())
    );
    const visibleStays = stays.filter(
      (stay) => !ownedSet.has(stay.hotel.trim().toLowerCase())
    );
    if (visibleStays.length === 0) {
      if (isPaidNow && !unmarkPaidMutation.isPending) {
        unmarkPaidMutation.mutate(id);
      }
      return;
    }

    const allCovered = visibleStays.every((stay, idx) => {
      const sameHotelBefore = visibleStays.slice(0, idx).filter(s => s.hotel === stay.hotel).length;
      const stayKey = getStayKey(stay.hotel, sameHotelBefore);
      return manualInvoiceChecks.includes(stayKey);
    });

    if (allCovered) {
      if (!isPaidNow) {
        markPaidMutation.mutate(id);
      }
    } else if (isPaidNow) {
      if (!unmarkPaidMutation.isPending) {
        unmarkPaidMutation.mutate(id);
      }
    }
  }, [confirmation, attachments, id, savedHotels, manualInvoiceChecks, unmarkPaidMutation.isPending]);

  const canUpload = effectiveRole === "admin" || effectiveRole === "worker" || effectiveRole === "accountant" || effectiveRole === "coworker";
  const canDelete = effectiveRole === "admin" || effectiveRole === "worker";
  const canAddTransaction = effectiveRole === "admin" || effectiveRole === "worker" || effectiveRole === "accountant";
  
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
      setPendingStayKey(null);
      setUploadType("invoice");
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
      setPendingStayKey(null);
      setUploadType("invoice");
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
      attachmentType: uploadType,
      stayKey: pendingStayKey || undefined,
    });
    
    setUploadDialogOpen(false);
    setPendingFile(null);
    setPendingStayKey(null);
    setInvoiceName("");
    setInvoiceAmount("");
    setInvoiceCurrency("USD");
    setUploadType("invoice");
  }, [pendingFile, id, invoiceName, invoiceAmount, invoiceCurrency, uploadMutation, uploadType, pendingStayKey]);

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

  const handlePreview = async (filePath: string, fileName: string, attachmentId: string) => {
    setPreviewLoadingId(attachmentId);
    try {
      const { data, error } = await supabase.storage
        .from("confirmation-attachments")
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl) {
        toast({
          title: "Preview failed",
          description: error?.message || "Could not load preview.",
          variant: "destructive",
        });
        return;
      }

      const opened = window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      if (opened) {
        return;
      }

      setPreviewUrl(data.signedUrl);
      setPreviewAttachment({ id: attachmentId, filePath, fileName });
      setPreviewOpen(true);
    } catch (err) {
      toast({
        title: "Preview failed",
        description: "Could not load preview.",
        variant: "destructive",
      });
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const isPaid = Boolean((confirmation as any)?.is_paid);
  const paidAt = (confirmation as any)?.paid_at;
  const hasAttachments = attachments && attachments.length > 0;

  const rawPayload = (confirmation as any)?.raw_payload || {};
  const itinerary = rawPayload?.itinerary || [];
  // Extract hotel stays from itinerary — each consecutive run of the same hotel = one stay
  const hotelStays: { hotel: string; checkIn: string; checkOut: string }[] = [];
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
  if (hotelStays.length === 0 && rawPayload?.hotelBookings) {
    for (const hb of rawPayload.hotelBookings) {
      hotelStays.push({ hotel: hb.hotelName, checkIn: hb.checkIn, checkOut: hb.checkOut });
    }
  }

  const ownedHotelSet = new Set(
    (savedHotels || [])
      .filter((h) => h.is_owned)
      .map((h) => h.name.trim().toLowerCase())
  );
  const visibleHotelStays = hotelStays.filter(
    (stay) => !ownedHotelSet.has(stay.hotel.trim().toLowerCase())
  );

  const isPaymentAttachment = (fileName: string) => {
    const lower = fileName.toLowerCase();
    return lower.includes("payment") || lower.includes("paid") || lower.includes("po");
  };

  const getStayKey = (hotelName: string, stayIndex: number) =>
    `${hotelName.trim().toLowerCase()}::${stayIndex}`;

  const getStayPathKey = (stayKey: string) =>
    stayKey.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

  const getPathStayKey = (filePath: string) => {
    const parts = filePath.split("/");
    if (parts.length >= 4) {
      const candidate = parts[2];
      if (candidate && !candidate.includes(".")) {
        return candidate;
      }
    }
    return null;
  };


  const buildAttachmentStayMap = (
    items: ConfirmationAttachment[],
    stays: { hotel: string }[],
    existing: Record<string, string>
  ) => {
    const map = { ...existing };
    const attachmentIds = new Set(items.map((a) => a.id));
    let changed = false;

    for (const key of Object.keys(map)) {
      if (!attachmentIds.has(key)) {
        delete map[key];
        changed = true;
      }
    }

    const stayKeysByHotel = new Map<string, string[]>();
    stays.forEach((stay, idx) => {
      const sameHotelBefore = stays.slice(0, idx).filter(s => s.hotel === stay.hotel).length;
      const stayKey = getStayKey(stay.hotel, sameHotelBefore);
      const hotelLower = stay.hotel.trim().toLowerCase();
      const list = stayKeysByHotel.get(hotelLower) || [];
      list.push(stayKey);
      stayKeysByHotel.set(hotelLower, list);
    });

    const stayPathToKey = new Map<string, string>();
    stayKeysByHotel.forEach((keys) => {
      keys.forEach((stayKey) => {
        stayPathToKey.set(getStayPathKey(stayKey), stayKey);
      });
    });

    const unmatchedByHotel = new Map<string, ConfirmationAttachment[]>();
    const stayRegex = /\(\s*stay\s*(\d+)\s*\)/i;

    items.forEach((attachment) => {
      if (map[attachment.id]) return;
      const pathKey = getPathStayKey(attachment.file_path);
      if (pathKey) {
        const mappedStay = stayPathToKey.get(pathKey);
        if (mappedStay) {
          map[attachment.id] = mappedStay;
          changed = true;
          return;
        }
      }

      const lowerName = attachment.file_name.toLowerCase();
      const stayMatch = lowerName.match(stayRegex);
      if (stayMatch) {
        const stayIndex = Number(stayMatch[1]) - 1;
        for (const [hotelLower, keys] of stayKeysByHotel.entries()) {
          if (lowerName.includes(hotelLower)) {
            const stayKey = keys[stayIndex] || keys[keys.length - 1];
            if (stayKey) {
              map[attachment.id] = stayKey;
              changed = true;
              return;
            }
          }
        }
      }

      let matchedHotel: string | null = null;
      let matchedLength = 0;
      for (const hotelLower of stayKeysByHotel.keys()) {
        if (lowerName.includes(hotelLower) && hotelLower.length > matchedLength) {
          matchedHotel = hotelLower;
          matchedLength = hotelLower.length;
        }
      }

      if (matchedHotel) {
        const list = unmatchedByHotel.get(matchedHotel) || [];
        list.push(attachment);
        unmatchedByHotel.set(matchedHotel, list);
      }
    });

    unmatchedByHotel.forEach((list, hotelLower) => {
      const stayKeys = stayKeysByHotel.get(hotelLower) || [];
      if (stayKeys.length === 0) return;
      list.sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
      list.forEach((attachment, idx) => {
        if (map[attachment.id]) return;
        const stayKey = stayKeys[Math.min(idx, stayKeys.length - 1)];
        map[attachment.id] = stayKey;
        changed = true;
      });
    });

    return { map, changed };
  };


  const rawAttachmentStayMap = useMemo(() => {
    const rawMap = (confirmation as any)?.raw_payload?.attachment_stay_map;
    return rawMap && typeof rawMap === "object" ? (rawMap as Record<string, string>) : {};
  }, [confirmation]);

  const derivedStayMapInfo = useMemo(() => {
    if (!attachments || !visibleHotelStays.length) {
      return { map: rawAttachmentStayMap, changed: false };
    }
    return buildAttachmentStayMap(attachments, visibleHotelStays, rawAttachmentStayMap);
  }, [attachments, visibleHotelStays, rawAttachmentStayMap]);


  useEffect(() => {
    if (!id || !confirmation || !derivedStayMapInfo.changed) return;
    const nextPayload = {
      ...((confirmation as any)?.raw_payload || {}),
      attachment_stay_map: derivedStayMapInfo.map,
    };
    supabase
      .from("confirmations")
      .update({ raw_payload: nextPayload })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to persist attachment map", error);
        } else {
          queryClient.invalidateQueries({ queryKey: ["confirmation", id] });
        }
      });
  }, [id, confirmation, derivedStayMapInfo, queryClient]);

  
  const attachmentsByStay = useMemo(() => {
    const map = new Map<string, { invoice: ConfirmationAttachment | null; payment: ConfirmationAttachment | null }>();
    if (!attachments || visibleHotelStays.length === 0) return map;

    const buckets = new Map<string, { invoice: ConfirmationAttachment[]; payment: ConfirmationAttachment[] }>();

    attachments.forEach((attachment) => {
      const stayKey = derivedStayMapInfo.map[attachment.id] || null;
      if (!stayKey) return;
      const bucket = buckets.get(stayKey) || { invoice: [], payment: [] };
      if (isPaymentAttachment(attachment.file_name)) {
        bucket.payment.push(attachment);
      } else {
        bucket.invoice.push(attachment);
      }
      buckets.set(stayKey, bucket);
    });

    buckets.forEach((bucket, stayKey) => {
      const invoice = bucket.invoice.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0] || null;
      const payment = bucket.payment.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0] || null;
      map.set(stayKey, { invoice, payment });
    });

    return map;
  }, [attachments, visibleHotelStays, derivedStayMapInfo.map]);


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


  const toggleManualInvoiceCheck = async (stayKey: string, nextChecked: boolean) => {
    if (!id) return;
    const prev = manualInvoiceChecks;
    const nextChecks = nextChecked
      ? Array.from(new Set([...manualInvoiceChecks, stayKey]))
      : manualInvoiceChecks.filter((k) => k !== stayKey);
    setManualInvoiceChecks(nextChecks);
    setInvoiceCheckSaving(stayKey);

    const rawPayload = { ...(confirmation?.raw_payload || {}), invoice_checks: nextChecks };
    const { error } = await supabase
      .from("confirmations")
      .update({ raw_payload: rawPayload })
      .eq("id", id);

    if (error) {
      setManualInvoiceChecks(prev);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ["confirmation", id] });
    }
    setInvoiceCheckSaving(null);
  };

  const handleHotelFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    hotelName: string,
    stayKey: string,
    stayOrdinal: number,
    type: "invoice" | "payment"
  ) => {
    if (!canUpload || !id || !e.target.files) return;
    const file = e.target.files[0];
    if (file) {
      setPendingFile(file);
      setPendingStayKey(stayKey);
      setUploadType(type);
      const suffix = stayOrdinal > 0 ? ` (Stay ${stayOrdinal + 1})` : "";
      const baseName = `${hotelName}${suffix}`;
      setInvoiceName(type === "payment" ? `${baseName} - Payment Order` : baseName);
      setInvoiceAmount("");
      setUploadDialogOpen(true);
    }
    e.target.value = "";
  };

  const handleDeleteAttachment = (
    attachmentId: string,
    filePath: string,
    confirmationId: string,
    stayKey: string,
    type: "invoice" | "payment"
  ) => {
    deleteMutation.mutate(
      { attachmentId, filePath, confirmationId },
      {
        onSuccess: () => {
          if (type === "invoice" && manualInvoiceChecks.includes(stayKey)) {
            toggleManualInvoiceCheck(stayKey, false);
          }
        },
      }
    );
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
        {visibleHotelStays.length > 0 && (
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
              <CardDescription>Upload a payment order and invoice for each hotel stay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleHotelStays.map((stay, idx) => {
                // Count how many times this hotel appeared before this index
                const sameHotelBefore = visibleHotelStays.slice(0, idx).filter(s => s.hotel === stay.hotel).length;
                const stayKey = getStayKey(stay.hotel, sameHotelBefore);
                const attachmentMatches = attachmentsByStay.get(stayKey);
                const invoiceMatch = attachmentMatches?.invoice ?? null;
                const paymentMatch = attachmentMatches?.payment ?? null;
                const hasInvoiceUpload = !!invoiceMatch;
                const manualChecked = manualInvoiceChecks.includes(stayKey);
                const invoiceChecked = hasInvoiceUpload || manualChecked;
                const hasPayment = !!paymentMatch;
                const isSavingCheck = invoiceCheckSaving === stayKey;
                const expense = invoiceMatch && expenseMap?.[invoiceMatch.id];

                return (
                  <div
                    key={`${stay.hotel}-${idx}`}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors group",
                      invoiceChecked
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-muted/30 border-border"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasInvoiceUpload) {
                          toggleManualInvoiceCheck(stayKey, !manualChecked);
                        }
                      }}
                      disabled={hasInvoiceUpload || isSavingCheck}
                      aria-label={invoiceChecked ? "Invoice checked" : "Mark invoice checked"}
                      className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-full shrink-0 transition-colors",
                        invoiceChecked
                          ? "bg-emerald-500 text-white"
                          : "border-2 border-muted-foreground/30",
                        !hasInvoiceUpload && "hover:border-emerald-500/70 hover:bg-emerald-50",
                        (hasInvoiceUpload || isSavingCheck) && "cursor-default"
                      )}
                    >
                      {invoiceChecked && <CheckCircle className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        invoiceChecked && "text-emerald-700 dark:text-emerald-400"
                      )}>
                        {stay.hotel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stay.checkIn}{stay.checkOut && stay.checkOut !== stay.checkIn ? ` → ${stay.checkOut}` : ""}
                      </p>
                    </div>
                    {hasInvoiceUpload && expense?.amount != null && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                        {expense.currency === "GEL" ? "₾" : "$"}{expense.amount.toLocaleString()}
                      </Badge>
                    )}
                    <div className="flex flex-col gap-2 shrink-0">
                      <div className={cn(
                        "flex items-center gap-2 rounded-md border px-2 py-1",
                        invoiceChecked ? "border-emerald-200 bg-emerald-50/70 text-emerald-700" : "border-border bg-background"
                      )}>
                        <span className="text-xs font-medium w-16">Invoice</span>
                        {hasInvoiceUpload && invoiceMatch ? (
                          <div className="flex items-center gap-1 ml-auto">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(invoiceMatch.file_path, invoiceMatch.file_name, invoiceMatch.id)}
                              disabled={previewLoadingId === invoiceMatch.id}
                              title="Preview invoice"
                              className="h-7 w-7"
                            >
                              {previewLoadingId === invoiceMatch.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {canDelete && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    title="Delete invoice"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{invoiceMatch.file_name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteAttachment(
                                        invoiceMatch.id,
                                        invoiceMatch.file_path,
                                        id!,
                                        stayKey,
                                        "invoice"
                                      )}
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
                          <label className="ml-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 border-emerald-200 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-50"
                              asChild
                            >
                              <span>
                                <Upload className="h-3.5 w-3.5" />
                                <span className="sr-only">Upload invoice</span>
                              </span>
                            </Button>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,application/pdf"
                              onChange={(e) =>
                                handleHotelFileSelect(e, stay.hotel, stayKey, sameHotelBefore, "invoice")
                              }
                              disabled={uploadMutation.isPending}
                            />
                          </label>
                        ) : null}
                      </div>

                      <div className={cn(
                        "flex items-center gap-2 rounded-md border px-2 py-1",
                        hasPayment ? "border-amber-200 bg-amber-50/70 text-amber-700" : "border-border bg-background"
                      )}>
                        <span className="text-xs font-medium w-16">Payment</span>
                        {hasPayment && paymentMatch ? (
                          <div className="flex items-center gap-1 ml-auto">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(paymentMatch.file_path, paymentMatch.file_name, paymentMatch.id)}
                              disabled={previewLoadingId === paymentMatch.id}
                              title="Preview payment order"
                              className="h-7 w-7"
                            >
                              {previewLoadingId === paymentMatch.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {canDelete && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    title="Delete payment order"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Payment Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{paymentMatch.file_name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteAttachment(
                                        paymentMatch.id,
                                        paymentMatch.file_path,
                                        id!,
                                        stayKey,
                                        "payment"
                                      )}
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
                          <label className="ml-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 border-amber-200 text-amber-700 bg-amber-50/60 hover:bg-amber-50"
                              asChild
                            >
                              <span>
                                <Upload className="h-3.5 w-3.5" />
                                <span className="sr-only">Upload payment order</span>
                              </span>
                            </Button>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,application/pdf"
                              onChange={(e) =>
                                handleHotelFileSelect(e, stay.hotel, stayKey, sameHotelBefore, "payment")
                              }
                              disabled={uploadMutation.isPending}
                            />
                          </label>
                        ) : null}
                      </div>
                    </div>
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
            setPendingStayKey(null);
            setInvoiceName("");
            setInvoiceAmount("");
            setInvoiceCurrency("USD");
            setUploadType("invoice");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{uploadType === "payment" ? "Upload Payment Order" : "Upload Invoice"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-name">{uploadType === "payment" ? "Payment Order Name" : "Invoice Name"}</Label>
                <Input
                  id="invoice-name"
                  value={invoiceName}
                  onChange={(e) => setInvoiceName(e.target.value)}
                  placeholder={uploadType === "payment" ? "e.g. Hotel Marriott - Payment Order" : "e.g. Hotel Marriott - Room 204"}
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
                  {uploadType === "payment"
                    ? "This will be saved as a payment order (no expense recorded)."
                    : "This will be recorded as a hotel expense"}
                  {uploadType !== "payment" && invoiceCurrency === "GEL" && invoiceAmount && (
                    <span className="text-muted-foreground">
                      {" "}(??? ${(parseFloat(invoiceAmount) * exchangeRate.gel_to_usd).toFixed(2)} USD)
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

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={(open) => {
          if (!open) {
            setPreviewOpen(false);
            setPreviewUrl(null);
            setPreviewAttachment(null);
          }
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewAttachment?.fileName || "Preview"}</DialogTitle>
            </DialogHeader>
            <div className="rounded-md border bg-muted/30 h-[70vh] overflow-hidden">
              {previewUrl ? (
                isMobile ? (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
                    Preview opens in a new tab on mobile devices.
                  </div>
                ) : (
                  <iframe
                    src={previewUrl}
                    title={previewAttachment?.fileName || "Preview"}
                    className="h-full w-full"
                  />
                )
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                  Loading preview...
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              {previewUrl && previewAttachment && (
                <>
                  <Button variant="outline" asChild>
                    <a href={previewUrl} target="_blank" rel="noreferrer">
                      Open in new tab
                    </a>
                  </Button>
                  <Button
                    onClick={() => {
                      handleDownload(previewAttachment.filePath, previewAttachment.fileName, previewAttachment.id);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </>
              )}
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
