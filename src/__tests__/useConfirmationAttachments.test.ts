import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---- Supabase mock builder ----

/** Tracks every chained Supabase call so tests can inspect what was called. */
function createCallTracker() {
  const calls: Array<{ method: string; args: any[] }> = [];

  /** Build a chainable object that records every method call. */
  const chainable = (terminal?: Record<string, any>): any =>
    new Proxy(
      {},
      {
        get(_target, prop: string) {
          // Terminal values returned by the last link in the chain
          if (terminal && prop in terminal) return terminal[prop];

          return (...args: any[]) => {
            calls.push({ method: prop, args });

            // .single() / .maybeSingle() → resolve with data
            if (prop === "single" || prop === "maybeSingle") {
              return Promise.resolve({ data: terminal?._data ?? null, error: null });
            }
            // .select() right after .insert() / .delete() → need to keep chaining
            return chainable(terminal);
          };
        },
      }
    );

  return { calls, chainable };
}

// ---- Storage mock ----

function createStorageMock(tracker: ReturnType<typeof createCallTracker>) {
  return {
    from: (bucket: string) => {
      tracker.calls.push({ method: "storage.from", args: [bucket] });
      return {
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    },
  };
}

// ---- Build full mock ----

let tracker: ReturnType<typeof createCallTracker>;
let storageMock: ReturnType<typeof createStorageMock>;
let insertData: Record<string, any>;
let attachmentLookup: Record<string, any> | null;
let confirmationLookup: Record<string, any> | null;
let stayAttachments: any[];
let existingExpenses: any[];
let deleteError: any;

function buildFromMock() {
  return (table: string) => {
    tracker.calls.push({ method: "from", args: [table] });

    const chain: any = {};

    const wrap = (obj: any) =>
      new Proxy(obj, {
        get(target, prop: string) {
          if (prop in target) return target[prop];
          // Default: every unknown method returns the same proxy (chaining)
          return (...args: any[]) => {
            tracker.calls.push({ method: prop, args });
            return wrap({ ...obj });
          };
        },
      });

    chain.select = (...args: any[]) => {
      tracker.calls.push({ method: "select", args });
      return wrap({
        single: () => Promise.resolve({ data: insertData, error: null }),
        maybeSingle: () => {
          // For confirmation_attachments lookup
          if (table === "confirmation_attachments") {
            return Promise.resolve({ data: attachmentLookup, error: null });
          }
          // For confirmations lookup
          if (table === "confirmations") {
            return Promise.resolve({ data: confirmationLookup, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        // When chaining .eq().ilike() etc., the terminal select should resolve
        then: (resolve: any) =>
          resolve({ data: stayAttachments, error: null }),
      });
    };

    chain.insert = (...args: any[]) => {
      tracker.calls.push({ method: "insert", args });
      return wrap({
        select: (...a: any[]) => {
          tracker.calls.push({ method: "select", args: a });
          return wrap({
            single: () => Promise.resolve({ data: insertData, error: null }),
          });
        },
        then: (resolve: any) => resolve({ error: null }),
      });
    };

    chain.update = (...args: any[]) => {
      tracker.calls.push({ method: "update", args });
      return wrap({
        then: (resolve: any) => resolve({ error: null }),
      });
    };

    chain.delete = () => {
      tracker.calls.push({ method: "delete", args: [] });
      return wrap({
        then: (resolve: any) => resolve({ error: deleteError }),
      });
    };

    chain.not = (...args: any[]) => {
      tracker.calls.push({ method: "not", args });
      return wrap({
        then: (resolve: any) => resolve({ data: existingExpenses, error: null }),
      });
    };

    return wrap(chain);
  };
}

// ---- Mock modules ----

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
      }),
    },
    from: (...args: any[]) => buildFromMock()(...args),
    storage: {
      from: (bucket: string) => {
        tracker.calls.push({ method: "storage.from", args: [bucket] });
        return {
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      },
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// ---- Import after mocks ----

import { useUploadAttachment, useDeleteAttachment } from "@/hooks/useConfirmationAttachments";

// ---- Helpers ----

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function findCalls(method: string) {
  return tracker.calls.filter((c) => c.method === method);
}

function findFromCalls(table: string) {
  return tracker.calls.filter((c) => c.method === "from" && c.args[0] === table);
}

// ---- Tests ----

describe("useUploadAttachment", () => {
  beforeEach(() => {
    tracker = createCallTracker();
    insertData = { id: "att-1", file_name: "Hotel.pdf" };
    attachmentLookup = null;
    confirmationLookup = null;
    stayAttachments = [];
    existingExpenses = [];
    deleteError = null;
  });

  it("creates a transaction + expense when invoice is uploaded with amount", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUploadAttachment(), { wrapper });

    const file = new File(["pdf"], "hotel.pdf", { type: "application/pdf" });

    await act(async () => {
      result.current.mutate({
        confirmationId: "conf-1",
        file,
        customName: "Hotel Marriott",
        amount: 500,
        originalCurrency: "GEL",
        originalAmount: 500,
        attachmentType: "invoice",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Should have inserted into transactions table
    const transactionInserts = findCalls("insert").filter(
      (c) => {
        const arg = c.args[0];
        return arg && typeof arg === "object" && arg.type === "expense" && arg.kind === "out";
      }
    );
    expect(transactionInserts.length).toBeGreaterThanOrEqual(1);

    // The description should be "Invoice: ..." not "Payment: ..."
    const txArg = transactionInserts[0].args[0];
    expect(txArg.description).toMatch(/^Invoice:/);
    expect(txArg.amount).toBe(500);
    expect(txArg.currency).toBe("GEL");
    expect(txArg.category).toBe("hotel");

    // Should have inserted into expenses table
    const expenseInserts = findCalls("insert").filter(
      (c) => {
        const arg = c.args[0];
        return arg && typeof arg === "object" && arg.expense_type === "hotel";
      }
    );
    expect(expenseInserts.length).toBeGreaterThanOrEqual(1);

    const expArg = expenseInserts[0].args[0];
    expect(expArg.attachment_id).toBe("att-1");
    expect(expArg.amount).toBe(500);
  });

  it("uses 'Payment:' prefix for payment order uploads", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUploadAttachment(), { wrapper });

    const file = new File(["pdf"], "po.pdf", { type: "application/pdf" });

    await act(async () => {
      result.current.mutate({
        confirmationId: "conf-1",
        file,
        customName: "Hotel PO",
        amount: 300,
        originalCurrency: "USD",
        originalAmount: 300,
        attachmentType: "payment",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    const transactionInserts = findCalls("insert").filter(
      (c) => {
        const arg = c.args[0];
        return arg && typeof arg === "object" && arg.type === "expense";
      }
    );
    expect(transactionInserts.length).toBeGreaterThanOrEqual(1);
    expect(transactionInserts[0].args[0].description).toMatch(/^Payment:/);
  });

  it("does NOT create ledger entries when no amount is provided", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUploadAttachment(), { wrapper });

    const file = new File(["pdf"], "invoice.pdf", { type: "application/pdf" });

    await act(async () => {
      result.current.mutate({
        confirmationId: "conf-1",
        file,
        customName: "Hotel Marriott",
        // no amount
        attachmentType: "invoice",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Should NOT have inserted into transactions with type=expense
    const transactionInserts = findCalls("insert").filter(
      (c) => {
        const arg = c.args[0];
        return arg && typeof arg === "object" && arg.type === "expense";
      }
    );
    expect(transactionInserts.length).toBe(0);
  });

  it("stores invoice amount in raw_payload for reference", async () => {
    confirmationLookup = { raw_payload: {} };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUploadAttachment(), { wrapper });

    const file = new File(["pdf"], "invoice.pdf", { type: "application/pdf" });

    await act(async () => {
      result.current.mutate({
        confirmationId: "conf-1",
        file,
        customName: "Test Invoice",
        amount: 200,
        originalCurrency: "USD",
        originalAmount: 200,
        attachmentType: "invoice",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Should have called update on confirmations to store invoice_amounts
    const updates = findCalls("update").filter(
      (c) => {
        const arg = c.args[0];
        return arg && typeof arg === "object" && arg.raw_payload?.invoice_amounts;
      }
    );
    expect(updates.length).toBeGreaterThanOrEqual(1);
  });
});

describe("useDeleteAttachment", () => {
  beforeEach(() => {
    tracker = createCallTracker();
    insertData = null;
    attachmentLookup = { file_name: "Hotel Marriott.pdf" };
    confirmationLookup = { raw_payload: { invoice_amounts: { "att-1": { amount: 100 } } } };
    stayAttachments = [];
    existingExpenses = [];
    deleteError = null;
  });

  it("deletes expenses and transactions for invoice type (not just payment)", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        attachmentId: "att-1",
        filePath: "user-123/conf-1/123.pdf",
        confirmationId: "conf-1",
        attachmentType: "invoice",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Should have called delete on expenses table
    const expensesFromCalls = findFromCalls("expenses");
    expect(expensesFromCalls.length).toBeGreaterThanOrEqual(1);

    const deleteCalls = findCalls("delete");
    // Should have at least: expenses delete, transactions delete, confirmation_attachments delete
    expect(deleteCalls.length).toBeGreaterThanOrEqual(3);
  });

  it("deletes expenses and transactions for payment type", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        attachmentId: "att-2",
        filePath: "user-123/conf-1/456.pdf",
        confirmationId: "conf-1",
        attachmentType: "payment",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    const expensesFromCalls = findFromCalls("expenses");
    expect(expensesFromCalls.length).toBeGreaterThanOrEqual(1);

    const transactionsFromCalls = findFromCalls("transactions");
    expect(transactionsFromCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("searches for both Invoice: and Payment: description prefixes on delete", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        attachmentId: "att-1",
        filePath: "user-123/conf-1/123.pdf",
        confirmationId: "conf-1",
        attachmentType: "invoice",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Check the .in() call includes both description prefixes
    const inCalls = findCalls("in");
    const descriptionIn = inCalls.find(
      (c) => c.args[0] === "description"
    );
    expect(descriptionIn).toBeDefined();
    expect(descriptionIn!.args[1]).toContain("Payment: Hotel Marriott.pdf");
    expect(descriptionIn!.args[1]).toContain("Invoice: Hotel Marriott.pdf");
  });

  it("deletes DB record before storage (DB first, storage best-effort)", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        attachmentId: "att-1",
        filePath: "user-123/conf-1/123.pdf",
        confirmationId: "conf-1",
        attachmentType: "invoice",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Find the index of the confirmation_attachments from-call (DB delete)
    const dbDeleteIdx = tracker.calls.findIndex(
      (c) => c.method === "from" && c.args[0] === "confirmation_attachments" &&
        // The select/maybeSingle is the lookup, the second from("confirmation_attachments") is the delete
        tracker.calls.indexOf(c) > tracker.calls.findIndex(
          (c2) => c2.method === "from" && c2.args[0] === "confirmation_attachments"
        )
    );

    const storageIdx = tracker.calls.findIndex(
      (c) => c.method === "storage.from"
    );

    // DB delete should happen before storage delete
    expect(dbDeleteIdx).toBeLessThan(storageIdx);
  });

  it("succeeds even when storage delete throws", async () => {
    // Override storage mock to throw
    const origFrom = vi.fn();
    const supabaseMod = await import("@/integrations/supabase/client");
    const originalStorageFrom = (supabaseMod.supabase.storage as any).from;
    (supabaseMod.supabase.storage as any).from = (bucket: string) => {
      tracker.calls.push({ method: "storage.from", args: [bucket] });
      return {
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockRejectedValue(new Error("Storage permission denied")),
      };
    };

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        attachmentId: "att-1",
        filePath: "user-123/conf-1/123.pdf",
        confirmationId: "conf-1",
        attachmentType: "payment",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Should still succeed — storage failure is caught
    expect(result.current.isSuccess).toBe(true);

    // Restore
    (supabaseMod.supabase.storage as any).from = originalStorageFrom;
  });

  it("cleans up raw_payload invoice_amounts for invoice type", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        attachmentId: "att-1",
        filePath: "user-123/conf-1/123.pdf",
        confirmationId: "conf-1",
        attachmentType: "invoice",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Should have accessed confirmations table to update raw_payload
    const confirmationsFrom = findFromCalls("confirmations");
    expect(confirmationsFrom.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT clean up raw_payload for payment type", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });

    // Reset confirmationLookup so we can tell if it was accessed
    confirmationLookup = null;

    await act(async () => {
      result.current.mutate({
        attachmentId: "att-2",
        filePath: "user-123/conf-1/456.pdf",
        confirmationId: "conf-1",
        attachmentType: "payment",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Should NOT have updated confirmations.raw_payload for payment type
    const updateCalls = findCalls("update").filter(
      (c) => {
        const arg = c.args[0];
        return arg && typeof arg === "object" && arg.raw_payload;
      }
    );
    expect(updateCalls.length).toBe(0);
  });

  it("throws when DB record delete fails", async () => {
    deleteError = { message: "RLS violation" };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteAttachment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        attachmentId: "att-1",
        filePath: "user-123/conf-1/123.pdf",
        confirmationId: "conf-1",
        attachmentType: "invoice",
      });
    });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    expect(result.current.isError).toBe(true);
  });
});
