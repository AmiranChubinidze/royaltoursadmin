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

export interface AttachmentExpense {
  amount: number;
  currency: string;
}

export interface AttachmentExpenseRecord {
  id: string;
  attachment_id: string;
  amount: number;
  description: string | null;
}

export interface AttachmentExpenseInfo {
  amountMap: Record<string, AttachmentExpense>;
  records: Record<string, AttachmentExpenseRecord>;
}

export const useAttachmentExpenses = (confirmationId?: string) => {
  return useQuery({
    queryKey: ["attachment-expenses", confirmationId],
    queryFn: async () => {
      if (!confirmationId) return { amountMap: {}, records: {} } as AttachmentExpenseInfo;
      
      // Get from transactions table which has currency info
      const { data, error } = await supabase
        .from("transactions")
        .select("description, amount, currency")
        .eq("confirmation_id", confirmationId)
        .eq("type", "expense");

      if (error) throw error;
      
      // Also get attachment mapping from expenses table
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, attachment_id, amount, description")
        .eq("confirmation_id", confirmationId)
        .not("attachment_id", "is", null);
      
      // Create a map of attachment_id -> {amount, currency}
      const expenseMap: Record<string, AttachmentExpense> = {};
      const expenseRecords: Record<string, AttachmentExpenseRecord> = {};
      expenses?.forEach((expense) => {
        if (expense.attachment_id) {
          // Find matching transaction to get currency
          const matchingTx = data?.find(tx => tx.description === expense.description);
          expenseMap[expense.attachment_id] = {
            amount: Number(expense.amount),
            currency: matchingTx?.currency || "USD",
          };
          expenseRecords[expense.attachment_id] = {
            id: expense.id,
            attachment_id: expense.attachment_id,
            amount: Number(expense.amount),
            description: expense.description,
          };
        }
      });
      return { amountMap: expenseMap, records: expenseRecords } as AttachmentExpenseInfo;
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
      originalCurrency,
      originalAmount,
      attachmentType,
      stayKey,
    }: { 
      confirmationId: string; 
      file: File;
      customName?: string;
      amount?: number; // Amount entered by user
      originalCurrency?: string; // Currency selected
      originalAmount?: number; // Kept for compatibility
      attachmentType?: "invoice" | "payment";
      stayKey?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const isPaymentOrder =
        attachmentType === "payment" ||
        customName?.toLowerCase().includes("payment") ||
        customName?.toLowerCase().includes("paid") ||
        customName?.toLowerCase().includes("po");
      const hasAmount = typeof amount === "number" && !Number.isNaN(amount) && amount > 0;

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const stayPathKey = stayKey ? stayKey.replace(/[^a-z0-9]+/gi, "_").toLowerCase() : null;
      const fileName = stayPathKey
        ? `${user.id}/${confirmationId}/${stayPathKey}/${Date.now()}.${fileExt}`
        : `${user.id}/${confirmationId}/${Date.now()}.${fileExt}`;
      
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

      const storageCurrency = originalCurrency || "USD";
      const storageAmount = originalAmount || amount || 0;
      let uploaderResponsibleHolderId: string | null = null;

      // For payment uploads, attribute ledger responsibility to the uploader
      // when they have an active linked holder.
      if (isPaymentOrder) {
        try {
          const { data: linkedHolder } = await supabase
            .from("holders")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          uploaderResponsibleHolderId = linkedHolder?.id ?? null;
        } catch (holderLookupError) {
          console.error("Failed to resolve uploader holder:", holderLookupError);
        }
      }

      // Invoice amount is for reference only (not ledger)
      if (!isPaymentOrder && hasAmount && data) {
        try {
          const { data: confirmation } = await supabase
            .from("confirmations")
            .select("raw_payload")
            .eq("id", confirmationId)
            .maybeSingle();

          const rawPayload = (confirmation?.raw_payload && typeof confirmation.raw_payload === "object")
            ? (confirmation.raw_payload as Record<string, any>)
            : {};
          const existing = rawPayload.invoice_amounts && typeof rawPayload.invoice_amounts === "object"
            ? { ...rawPayload.invoice_amounts }
            : {};
          existing[data.id] = { amount: storageAmount, currency: storageCurrency };

          const { error: payloadError } = await supabase
            .from("confirmations")
            .update({ raw_payload: { ...rawPayload, invoice_amounts: existing } })
            .eq("id", confirmationId);

          if (payloadError) {
            console.error("Failed to store invoice amount:", payloadError);
          }
        } catch (err) {
          console.error("Failed to store invoice amount:", err);
        }
      }

      // Create or update ledger expense for both invoices and payment orders
      if (hasAmount && data) {
        const today = new Date().toISOString().split("T")[0];
        const description = isPaymentOrder ? `Payment: ${displayName}` : `Invoice: ${displayName}`;
        let existingExpense: { id: string; description: string | null } | null = null;

        if (stayPathKey) {
          const { data: stayAttachments, error: stayError } = await supabase
            .from("confirmation_attachments")
            .select("id")
            .eq("confirmation_id", confirmationId)
            .ilike("file_path", `%/${stayPathKey}/%`);

          if (!stayError && stayAttachments?.length) {
            const stayAttachmentIds = stayAttachments.map((a) => a.id);
            const { data: existingExpenses, error: expenseLookupError } = await supabase
              .from("expenses")
              .select("id, description")
              .eq("confirmation_id", confirmationId)
              .in("attachment_id", stayAttachmentIds)
              .limit(1);

            if (!expenseLookupError && existingExpenses?.length) {
              existingExpense = existingExpenses[0];
            }
          }
        }

        if (existingExpense) {
          const { error: updateExpenseError } = await supabase
            .from("expenses")
            .update({
              attachment_id: data.id,
              amount: storageAmount,
              description,
              expense_type: "hotel",
              expense_date: today,
            })
            .eq("id", existingExpense.id);

          if (updateExpenseError) {
            console.error("Failed to update expense:", updateExpenseError);
            const { error: insertExpenseError } = await supabase
              .from("expenses")
              .insert({
                confirmation_id: confirmationId,
                expense_type: "hotel",
                description,
                amount: storageAmount,
                expense_date: today,
                created_by: user.id,
                attachment_id: data.id,
              });
            if (insertExpenseError) {
              console.error("Failed to insert fallback expense:", insertExpenseError);
            }
          }

          if (existingExpense.description) {
            const updatePayload: Record<string, any> = {
              amount: storageAmount,
              currency: storageCurrency,
              description,
              date: today,
            };
            if (isPaymentOrder && uploaderResponsibleHolderId) {
              updatePayload.responsible_holder_id = uploaderResponsibleHolderId;
            }

            const { error: updateTxError } = await supabase
              .from("transactions")
              .update(updatePayload)
              .eq("confirmation_id", confirmationId)
              .eq("type", "expense")
              .eq("description", existingExpense.description);

            if (updateTxError) {
              console.error("Failed to update transaction:", updateTxError);
              const { error: insertTxError } = await supabase
                .from("transactions")
                .insert({
                  date: today,
                  kind: "out",
                  type: "expense",
                  category: "hotel",
                  description,
                  amount: storageAmount,
                  currency: storageCurrency,
                  status: "confirmed",
                  confirmation_id: confirmationId,
                  is_auto_generated: false,
                  is_paid: true,
                  created_by: user.id,
                  responsible_holder_id: isPaymentOrder ? uploaderResponsibleHolderId : null,
                });
              if (insertTxError) {
                console.error("Failed to insert fallback transaction:", insertTxError);
              }
            }
          } else {
            const { error: transactionError } = await supabase
              .from("transactions")
              .insert({
                date: today,
                kind: "out",
                type: "expense",
                category: "hotel",
                description,
                amount: storageAmount,
                currency: storageCurrency,
                status: "confirmed",
                confirmation_id: confirmationId,
                is_auto_generated: false,
                is_paid: true,
                created_by: user.id,
                responsible_holder_id: isPaymentOrder ? uploaderResponsibleHolderId : null,
              });

            if (transactionError) {
              console.error("Failed to create transaction:", transactionError);
            }
          }
        } else {
          const { error: transactionError } = await supabase
            .from("transactions")
            .insert({
              date: today,
              kind: "out",
              type: "expense",
              category: "hotel",
              description,
              amount: storageAmount,
              currency: storageCurrency,
              status: "confirmed",
              confirmation_id: confirmationId,
              is_auto_generated: false,
              is_paid: true,
              created_by: user.id,
              responsible_holder_id: isPaymentOrder ? uploaderResponsibleHolderId : null,
            });

          if (transactionError) {
            console.error("Failed to create transaction:", transactionError);
          }

          const { error: expenseError } = await supabase
            .from("expenses")
            .insert({
              confirmation_id: confirmationId,
              expense_type: "hotel",
              description,
              amount: storageAmount,
              expense_date: today,
              created_by: user.id,
              attachment_id: data.id,
            });

          if (expenseError) {
            console.error("Failed to create expense:", expenseError);
          }
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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["confirmation", variables.confirmationId] });
      toast({
        title: variables.attachmentType === "payment" ? "Payment order uploaded" : "Invoice uploaded",
        description: variables.attachmentType === "payment"
          ? variables.amount
            ? "Payment order uploaded and expense recorded."
            : "The payment order has been attached successfully."
          : variables.amount
            ? "Invoice uploaded and expense recorded."
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
      confirmationId,
      attachmentType,
    }: {
      attachmentId: string;
      filePath: string;
      confirmationId: string;
      attachmentType?: "invoice" | "payment";
    }) => {
      // Look up the attachment name to match the linked transaction description
      const { data: attachment } = await supabase
        .from("confirmation_attachments")
        .select("file_name")
        .eq("id", attachmentId)
        .maybeSingle();

      // Delete associated expense and transaction for both invoice and payment types
      await supabase
        .from("expenses")
        .delete()
        .eq("attachment_id", attachmentId);

      if (attachment?.file_name) {
        const descriptions = [
          `Payment: ${attachment.file_name}`,
          `Invoice: ${attachment.file_name}`,
        ];
        await supabase
          .from("transactions")
          .delete()
          .eq("confirmation_id", confirmationId)
          .eq("type", "expense")
          .in("description", descriptions);
      }

      if (attachmentType === "invoice") {
        try {
          const { data: confirmation } = await supabase
            .from("confirmations")
            .select("raw_payload")
            .eq("id", confirmationId)
            .maybeSingle();

          const rawPayload = (confirmation?.raw_payload && typeof confirmation.raw_payload === "object")
            ? (confirmation.raw_payload as Record<string, any>)
            : {};
          const existing = rawPayload.invoice_amounts && typeof rawPayload.invoice_amounts === "object"
            ? { ...rawPayload.invoice_amounts }
            : {};

          if (existing[attachmentId]) {
            delete existing[attachmentId];
            await supabase
              .from("confirmations")
              .update({ raw_payload: { ...rawPayload, invoice_amounts: existing } })
              .eq("id", confirmationId);
          }
        } catch (err) {
          console.error("Failed to remove invoice amount:", err);
        }
      }

      // Delete database record first (primary goal)
      const { error } = await supabase
        .from("confirmation_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;

      // Delete from storage (best-effort, don't block on failure)
      try {
        await supabase.storage
          .from("confirmation-attachments")
          .remove([filePath]);
      } catch (storageErr) {
        console.error("Failed to remove file from storage:", storageErr);
      }
      return { confirmationId, attachmentType };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["confirmation-attachments", data.confirmationId]
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["attachment-expenses", data.confirmationId]
      });
      queryClient.invalidateQueries({ queryKey: ["confirmation", data.confirmationId] });
      toast({
        title: "File deleted",
        description: "The attachment and its ledger entry have been removed.",
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
    onSuccess: (data, confirmationId) => {
      const targetId = data?.id || confirmationId;
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["confirmation", targetId] });
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
    onSuccess: (data, confirmationId) => {
      const targetId = data?.id || confirmationId;
      queryClient.invalidateQueries({ queryKey: ["confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["confirmation", targetId] });
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
