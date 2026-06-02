import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Plus, Trash2, Download, Loader2 } from "lucide-react";
import {
  useSavedHotelAttachments,
  useUploadSavedHotelAttachment,
  useDeleteSavedHotelAttachment,
  getSavedHotelAttachmentUrl,
} from "@/hooks/useSavedHotelAttachments";

export function HotelPriceAttachments({ hotelId }: { hotelId: string }) {
  const { data: files = [], isLoading } = useSavedHotelAttachments(hotelId);
  const uploadMutation = useUploadSavedHotelAttachment();
  const deleteMutation = useDeleteSavedHotelAttachment();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleUpload = async (list: FileList | null) => {
    if (!list?.length) return;
    for (const file of Array.from(list)) {
      await uploadMutation.mutateAsync({ hotelId, file });
    }
  };

  const handleOpen = async (filePath: string, id: string) => {
    setBusyId(id);
    try {
      const url = await getSavedHotelAttachmentUrl(filePath);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Price Lists</Label>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploadMutation.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Upload PDF
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No price lists uploaded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{f.file_name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busyId === f.id}
                  onClick={() => handleOpen(f.file_path, f.id)}
                >
                  {busyId === f.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() =>
                    deleteMutation.mutate({
                      attachmentId: f.id,
                      filePath: f.file_path,
                      hotelId,
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
