import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BUCKET = "hotel-attachments";

export interface SavedHotelAttachment {
  id: string;
  hotel_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

export function useSavedHotelAttachments(hotelId?: string) {
  return useQuery({
    queryKey: ["saved-hotel-attachments", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      const { data, error } = await supabase
        .from("saved_hotel_attachments")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as SavedHotelAttachment[];
    },
    enabled: !!hotelId,
  });
}

export function useUploadSavedHotelAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ hotelId, file }: { hotelId: string; file: File }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${hotelId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("saved_hotel_attachments")
        .insert({
          hotel_id: hotelId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SavedHotelAttachment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["saved-hotel-attachments", variables.hotelId] });
      toast({ title: "Price list uploaded" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteSavedHotelAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      filePath,
      hotelId,
    }: {
      attachmentId: string;
      filePath: string;
      hotelId: string;
    }) => {
      const { error } = await supabase
        .from("saved_hotel_attachments")
        .delete()
        .eq("id", attachmentId);
      if (error) throw error;

      // Best-effort storage cleanup.
      try {
        await supabase.storage.from(BUCKET).remove([filePath]);
      } catch (storageErr) {
        console.error("Failed to remove hotel attachment from storage:", storageErr);
      }
      return { hotelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["saved-hotel-attachments", data.hotelId] });
      toast({ title: "Price list deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });
}

export async function getSavedHotelAttachmentUrl(filePath: string) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600);
  return data?.signedUrl;
}
