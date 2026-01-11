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

export const useAttachmentExpenses = (confirmationId?: string) => {
  return useQuery({
    queryKey: ["attachment-expenses", confirmationId],
    queryFn: async () => {
      if (!confirmationId) return {};
      
      const { data, error } = await supabase
        .from("expenses")
        .select("attachment_id, amount")
        .eq("confirmation_id", confirmationId)
        .not("attachment_id", "is", null);

      if (error) throw error;
      
      // Create a map of attachment_id -> amount
      const expenseMap: Record<string, number> = {};
      data?.forEach((expense) => {
        if (expense.attachment_id) {
          expenseMap[expense.attachment_id] = Number(expense.amount);
        }
      });
      return expenseMap;
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
      file,
      customName,
      amount,
    }: { 
      confirmationId: string; 
      file: File;
      customName?: string;
      amount?: number;
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

      // Create database record with custom name if provided
      const displayName = customName?.trim() ? `${customName.trim()}.pdf` : file.name;
      
      const { data, error } = await supabase
        .from("confirmation_attachments")
        .insert({
          confirmation_id: confirmationId,
          file_name: displayName,
          file_path: fileName,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create expense if amount is provided, linked to attachment
      if (amount && amount > 0 && data) {
        const { error: expenseError } = await supabase
          .from("expenses")
          .insert({
            confirmation_id: confirmationId,
            expense_type: "hotel",
            description: `Invoice: ${displayName}`,
            amount: amount,
            expense_date: new Date().toISOString().split('T')[0],
            created_by: user.id,
            attachment_id: data.id,
          });
        
        if (expenseError) {
          console.error("Failed to create expense:", expenseError);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["confirmation-attachments", variables.confirmationId] 
      });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ 
        queryKey: ["attachment-expenses", variables.confirmationId] 
      });
      toast({
        title: "Invoice uploaded",
        description: variables.amount 
          ? `Invoice uploaded and $${variables.amount} expense recorded.`
          : "The invoice has been attached successfully.",
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
      // Delete associated expense first
      await supabase
        .from("expenses")
        .delete()
        .eq("attachment_id", attachmentId);

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

export const useUnmarkAsPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (confirmationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("confirmations")
        .update({
          is_paid: false,
          paid_at: null,
          paid_by: null,
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
        title: "Unmarked as Paid",
        description: "This confirmation has been unmarked as paid.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unmark as paid",
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
