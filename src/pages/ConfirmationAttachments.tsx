import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Upload, FileText, Trash2, Download, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useConfirmation } from "@/hooks/useConfirmations";
import { 
  useConfirmationAttachments, 
  useUploadAttachment, 
  useDeleteAttachment, 
  useMarkAsPaid,
  useUnmarkAsPaid,
  useGetAttachmentUrl,
  useAttachmentExpenses,
} from "@/hooks/useConfirmationAttachments";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

export default function ConfirmationAttachments() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useUserRole();
  
  const { data: confirmation, isLoading: confirmationLoading } = useConfirmation(id);
  const { data: attachments, isLoading: attachmentsLoading } = useConfirmationAttachments(id);
  const { data: expenseMap } = useAttachmentExpenses(id);
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();
  const markPaidMutation = useMarkAsPaid();
  const unmarkPaidMutation = useUnmarkAsPaid();
  const getAttachmentUrl = useGetAttachmentUrl();
  
  const isAdmin = role === "admin";
  const isWorker = role === "worker";
  
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  
  const canUpload = role === "admin" || role === "booking";
  const canDelete = role === "admin" || role === "worker";
  const isBookingView = role === "booking";
  
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
    
    uploadMutation.mutate({
      confirmationId: id,
      file: pendingFile,
      customName: invoiceName,
      amount: invoiceAmount ? parseFloat(invoiceAmount) : undefined,
    });
    
    setUploadDialogOpen(false);
    setPendingFile(null);
    setInvoiceName("");
    setInvoiceAmount("");
  }, [pendingFile, id, invoiceName, invoiceAmount, uploadMutation]);

  const handleDownload = async (filePath: string, fileName: string, attachmentId: string) => {
    setDownloadingId(attachmentId);
    try {
      const url = await getAttachmentUrl(filePath);
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
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
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!confirmation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(`/confirmation/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Confirmation
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

        {/* Invoices List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Invoices
              {attachments && attachments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {attachments.length}
                </Badge>
              )}
            </CardTitle>
            {isWorker && (
              <CardDescription>
                View-only access. Contact booking team to upload invoices.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {attachmentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : attachments && attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-destructive/10">
                        <FileText className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size)} • {format(new Date(attachment.uploaded_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      {expenseMap?.[attachment.id] && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          ${expenseMap[attachment.id].toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(attachment.file_path, attachment.file_name, attachment.id)}
                        disabled={downloadingId === attachment.id}
                        title="Download"
                      >
                        {downloadingId === attachment.id ? (
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
                                Are you sure you want to delete "{attachment.file_name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate({
                                  attachmentId: attachment.id,
                                  filePath: attachment.file_path,
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No invoices attached yet</p>
                {canUpload && <p className="text-sm mt-1">Upload PDF invoices below to get started</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Area - Only for booking/admin */}
        {canUpload && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <label
                className={cn(
                  "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all",
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className={cn(
                    "h-10 w-10 mb-3 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="mb-2 text-sm text-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PDF invoices only</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploadMutation.isPending}
                />
              </label>
              {uploadMutation.isPending && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mark as Paid Button - Only for booking/admin when there are invoices */}
        {canUpload && hasAttachments && !isPaid && (
          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900">
            <CardContent className="pt-6">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 text-white"
                    disabled={markPaidMutation.isPending}
                  >
                    {markPaidMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Mark as Paid
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Payment Status</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to mark <strong>{confirmation.confirmation_code}</strong> as paid? 
                      This action indicates that all invoices have been processed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => markPaidMutation.mutate(id!)}
                      className="bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      Confirm Payment
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-center text-sm text-emerald-700 dark:text-emerald-400 mt-3">
                {attachments?.length} invoice{attachments?.length !== 1 ? "s" : ""} attached
              </p>
            </CardContent>
          </Card>
        )}

        {/* Unmark as Paid Button - Only for admin when already paid */}
        {isAdmin && isPaid && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
            <CardContent className="pt-6">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="w-full h-12 text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950"
                    disabled={unmarkPaidMutation.isPending}
                  >
                    {unmarkPaidMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Unmark as Paid
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revert Payment Status</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to unmark <strong>{confirmation.confirmation_code}</strong> as paid? 
                      This will set the confirmation back to pending status.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => unmarkPaidMutation.mutate(id!)}
                      className="bg-amber-500 text-white hover:bg-amber-600"
                    >
                      Unmark as Paid
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Admin only action
              </p>
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
                <Label htmlFor="invoice-amount">Amount Paid ($)</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">This will be recorded as a hotel expense</p>
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
      </div>
    </div>
  );
}
