import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { Confirmation, ConfirmationPayload, InvoiceData } from "@/types/confirmation";
import { useUpdateInvoice } from "@/hooks/useConfirmations";
import { toast } from "@/hooks/use-toast";
import { RGTInvoice } from "@/components/RGTInvoice";
import { CottageInvoice } from "@/components/CottageInvoice";

interface InvoiceViewProps {
  confirmation: Confirmation;
  canEdit: boolean;
}

export function InvoiceView({ confirmation, canEdit }: InvoiceViewProps) {
  const payload = confirmation.raw_payload as ConfirmationPayload;
  const isCottage = payload?.doc_type === "cottage";
  const accent = isCottage ? "#2c5e4a" : "#0F4C5C";
  const updateInvoice = useUpdateInvoice();

  const [invoice, setInvoice] = useState<InvoiceData>(payload?.invoice || {});

  const set = (patch: Partial<InvoiceData>) => setInvoice((prev) => ({ ...prev, ...patch }));
  const num = (v: string): number | null => (v === "" ? null : Number(v));

  const handleSave = async () => {
    try {
      await updateInvoice.mutateAsync({ id: confirmation.id, invoice });
      toast({ title: "Invoice saved" });
    } catch {
      /* toast handled by the hook */
    }
  };

  return (
    <div>
      {/* Editable panel — never printed */}
      {canEdit && (
        <div
          className="print:hidden mb-5 rounded-2xl border bg-white p-4 shadow-[0_8px_20px_rgba(15,76,92,0.06)]"
          style={{ borderColor: `${accent}33` }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: accent }}>
              Invoice details
            </h3>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateInvoice.isPending}
              style={{ backgroundColor: accent }}
              className="text-white hover:opacity-90"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateInvoice.isPending ? "Saving…" : "Save"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Invoice no.">
              <Input
                value={invoice.invoice_code ?? confirmation.confirmation_code}
                onChange={(e) => set({ invoice_code: e.target.value })}
              />
            </Field>
            <Field label="Invoice date">
              <Input
                value={invoice.invoice_date ?? confirmation.confirmation_date}
                onChange={(e) => set({ invoice_date: e.target.value })}
                placeholder="dd/mm/yyyy"
              />
            </Field>
            <Field label="Currency">
              <div className="flex rounded-lg border border-border overflow-hidden h-10">
                {(["USD", "GEL"] as const).map((c) => {
                  const active = (invoice.currency || confirmation.price_currency || "USD") === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set({ currency: c })}
                      className={`flex-1 text-sm font-semibold transition-colors ${active ? "text-white" : "bg-white text-foreground"}`}
                      style={active ? { backgroundColor: accent } : undefined}
                    >
                      {c === "USD" ? "$ USD" : "₾ GEL"}
                    </button>
                  );
                })}
              </div>
            </Field>

            {isCottage ? (
              <>
                <Field label="Line description">
                  <Input
                    value={invoice.line_description ?? "Cottage Stay"}
                    onChange={(e) => set({ line_description: e.target.value })}
                  />
                </Field>
                <Field label="Rate (per night)">
                  <Input
                    type="number"
                    min={0}
                    value={invoice.rate ?? ""}
                    onChange={(e) => set({ rate: num(e.target.value) })}
                    placeholder={String(confirmation.price ?? 0)}
                  />
                </Field>
                <Field label="Additional charges">
                  <Input
                    type="number"
                    min={0}
                    value={invoice.additional_charges ?? ""}
                    onChange={(e) => set({ additional_charges: num(e.target.value) })}
                    placeholder="0"
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Payment method">
                  <Input
                    value={invoice.payment_method ?? "Bank Transfer"}
                    onChange={(e) => set({ payment_method: e.target.value })}
                  />
                </Field>
                <Field label="Bill to">
                  <Input
                    value={invoice.bill_to ?? ""}
                    onChange={(e) => set({ bill_to: e.target.value })}
                    placeholder="Partner agency"
                  />
                </Field>
                <Field label="Amount">
                  <Input
                    type="number"
                    min={0}
                    value={invoice.amount ?? ""}
                    onChange={(e) => set({ amount: num(e.target.value) })}
                    placeholder={String(confirmation.price ?? 0)}
                  />
                </Field>
                <Field label="Service description">
                  <Input
                    value={invoice.service_description ?? "Tour & Travel Services"}
                    onChange={(e) => set({ service_description: e.target.value })}
                  />
                </Field>
                <Field label="Service detail" className="md:col-span-2">
                  <Input
                    value={invoice.service_detail ?? "As per tour management confirmation criteria"}
                    onChange={(e) => set({ service_detail: e.target.value })}
                  />
                </Field>
              </>
            )}
          </div>
        </div>
      )}

      {isCottage ? (
        <CottageInvoice confirmation={confirmation} invoice={invoice} />
      ) : (
        <RGTInvoice confirmation={confirmation} invoice={invoice} />
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
