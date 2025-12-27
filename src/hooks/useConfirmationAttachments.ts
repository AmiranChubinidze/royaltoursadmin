import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ConfirmationAttachment {
  id: string;
  confirmation_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

export const useConfirmationAttachments = (confirmationId?: string) => {
  return useQuery({
    queryKey: ["confirmation-attachments", confirmationId],
    queryFn: async () => {
      if (!confirmationId) return [];
      
      const { data, error } = await supabase
        .from("confirmation_attachments")
        .select("*")
        .eq("confirmation_id", confirmationId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data as ConfirmationAttachment[];
    },
    enabled: !!confirmationId,
  });
};

export const useUploadAttachment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      confirmationId, 
      file 
    }: { 
      confirmationId: string; 
      file: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${confirmationId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("confirmation-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error } = await supabase
        .from("confirmation_attachments")
        .insert({
          confirmation_id: confirmationId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["confirmation-attachments", variables.confirmationId] 
      });
      toast({
        title: "File uploaded",
        description: "The PDF has been attached successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      attachmentId, 
      filePath,
      confirmationId 
    }: { 
      attachmentId: string; 
      filePath: string;
      confirmationId: string;
    }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("confirmation-attachments")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete database record
      const { error } = await supabase
        .from("confirmation_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;
      return { confirmationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["confirmation-attachments", data.confirmationId] 
      });
      toast({
        title: "File deleted",
        description: "The attachment has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useMarkAsPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (confirmationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("confirmations")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          paid_by: user.id,
        })
        .eq("id", confirmationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["confirmation"] });
      toast({
        title: "Marked as Paid",
        description: "This confirmation has been marked as paid.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark as paid",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useGetAttachmentUrl = () => {
  return async (filePath: string) => {
    const { data } = await supabase.storage
      .from("confirmation-attachments")
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    return data?.signedUrl;
  };
};
