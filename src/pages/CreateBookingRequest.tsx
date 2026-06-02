import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plane,
  Mail,
  Send,
  CheckCircle2,
  Circle,
  Hotel,
  Search,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirmations } from "@/hooks/useConfirmations";
import { useSavedHotels } from "@/hooks/useSavedData";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import {
  getConfirmationHotels,
  useSetHotelApproval,
  useMarkHotelsEmailed,
} from "@/hooks/useHotelApprovals";
import { Confirmation, ConfirmationPayload } from "@/types/confirmation";

export default function CreateBookingRequest() {
  const navigate = useNavigate();
  const { data: confirmations, isLoading } = useConfirmations(200);
  const { data: savedHotels = [] } = useSavedHotels();
  const setApproval = useSetHotelApproval();
  const markEmailed = useMarkHotelsEmailed();

  const [search, setSearch] = useState("");
  const [previewConf, setPreviewConf] = useState<Confirmation | null>(null);

  // Only confirmations that actually have hotels to book (non-owned).
  const rows = useMemo(() => {
    if (!confirmations) return [];
    return confirmations
      .map((c) => ({ confirmation: c, hotels: getConfirmationHotels(c, savedHotels) }))
      .filter((r) => r.hotels.length > 0);
  }, [confirmations, savedHotels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      ({ confirmation: c }) =>
        c.confirmation_code.toLowerCase().includes(q) ||
        (c.main_client_name || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div>
      {/* Header */}
      <div className="border-b border-[#0F4C5C]/10 bg-gradient-to-r from-white via-white to-[#EAF7F8] -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-4">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <Plane className="h-4 w-4 text-[#0F4C5C]" />
          <h1 className="text-sm font-semibold text-[#0F4C5C]">Hotel Bookings</h1>
          <span className="text-xs text-muted-foreground">
            Send hotel emails and track approvals per confirmation
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-2 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or client..."
            className="pl-9 max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-14 text-center">
              <Hotel className="h-10 w-10 text-[#0F4C5C]/15 mx-auto mb-3" />
              <p className="text-sm font-medium">No confirmations with hotels yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Create a confirmation with hotels in its itinerary, then send booking emails here.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-[#0F4C5C]/30 text-[#0F4C5C]"
                onClick={() => navigate("/new")}
              >
                New confirmation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(({ confirmation: c, hotels }) => {
              const approvals = c.raw_payload?.hotel_approvals || {};
              const emailed = new Set(c.hotels_emailed || []);
              const approvedCount = hotels.filter((h) => approvals[h.hotelName]?.approved).length;
              const allApproved = approvedCount === hotels.length;
              const anyEmailed = hotels.some((h) => emailed.has(h.hotelName));
              const emailableNames = hotels.filter((h) => h.hasEmail).map((h) => h.hotelName);

              return (
                <Card
                  key={c.id}
                  className={cn(
                    "border bg-white/95 shadow-[0_10px_24px_rgba(15,76,92,0.08)] overflow-hidden transition-colors",
                    allApproved ? "border-emerald-300" : "border-[#0F4C5C]/10"
                  )}
                >
                  <CardHeader className="pb-3 bg-gradient-to-r from-white via-white to-[#EAF7F8]/50 border-b border-[#0F4C5C]/10">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          className="font-mono font-semibold text-[#0F4C5C] hover:underline"
                          onClick={() => navigate(`/confirmation/${c.id}`)}
                        >
                          {c.confirmation_code}
                        </button>
                        <span className="text-sm text-muted-foreground truncate">
                          {c.main_client_name || "—"}
                        </span>
                        {c.arrival_date && (
                          <span className="text-xs text-muted-foreground">{c.arrival_date}</span>
                        )}
                      </div>
                      {/* Status pill */}
                      {allApproved ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          All approved
                        </Badge>
                      ) : !anyEmailed ? (
                        <Badge variant="outline" className="text-muted-foreground gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Not sent
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                          {approvedCount}/{hotels.length} approved
                        </Badge>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#0F4C5C]/10 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          allApproved ? "bg-emerald-500" : "bg-[#0F4C5C]"
                        )}
                        style={{ width: `${(approvedCount / hotels.length) * 100}%` }}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-2">
                    {hotels.map((h) => {
                      const approved = !!approvals[h.hotelName]?.approved;
                      const wasEmailed = emailed.has(h.hotelName);
                      return (
                        <div
                          key={h.hotelName}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
                            approved ? "border-emerald-200 bg-emerald-50/50" : "border-border bg-white"
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Hotel className="h-4 w-4 text-[#0F4C5C] shrink-0" />
                              <span className="text-sm font-medium truncate">{h.hotelName}</span>
                              {wasEmailed && (
                                <Badge variant="outline" className="border-emerald-400 text-emerald-600 gap-1 text-[10px]">
                                  <Mail className="h-3 w-3" />
                                  Emailed
                                </Badge>
                              )}
                              {!h.hasEmail && (
                                <span className="text-[10px] text-muted-foreground">(no email)</span>
                              )}
                            </div>
                            {(h.checkIn || h.checkOut) && (
                              <p className="text-xs text-muted-foreground mt-0.5 pl-6">
                                {h.checkIn} {h.checkOut ? `→ ${h.checkOut}` : ""}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={approved ? "default" : "outline"}
                            className={cn(
                              "gap-1.5 shrink-0",
                              approved
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "border-[#0F4C5C]/30 text-[#0F4C5C]"
                            )}
                            disabled={setApproval.isPending}
                            onClick={() =>
                              setApproval.mutate({
                                confirmationId: c.id,
                                hotelName: h.hotelName,
                                approved: !approved,
                              })
                            }
                          >
                            {approved ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                            {approved ? "Approved" : "Mark approved"}
                          </Button>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-muted-foreground">
                        {emailableNames.length > 0
                          ? `${emailableNames.length} hotel${emailableNames.length > 1 ? "s" : ""} with email`
                          : "No hotel emails on file"}
                      </p>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-[#0F4C5C] hover:bg-[#0F4C5C]/90"
                        disabled={emailableNames.length === 0}
                        onClick={() => setPreviewConf(c)}
                      >
                        <Send className="h-4 w-4" />
                        {anyEmailed ? "Review & send emails" : "Send booking emails"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {previewConf && (
        <EmailPreviewDialog
          open={!!previewConf}
          onOpenChange={(o) => {
            if (!o) setPreviewConf(null);
          }}
          payload={previewConf.raw_payload as ConfirmationPayload}
          confirmationCode={previewConf.confirmation_code}
          onSent={(names) =>
            markEmailed.mutate({ confirmationId: previewConf.id, hotelNames: names })
          }
        />
      )}
    </div>
  );
}
