import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ConfirmationPayload, HOTEL_EMAILS, GuestInfo } from "@/types/confirmation";

interface HotelEmail {
  hotelName: string;
  hotelEmail: string;
  clientName: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  meals: string;
  confirmationCode: string;
  guestInfo: GuestInfo;
}

export function useSendHotelEmails() {
  const [isSending, setIsSending] = useState(false);

  const sendHotelEmails = async (
    payload: ConfirmationPayload,
    confirmationCode: string
  ) => {
    setIsSending(true);

    try {
      // Extract unique hotels from itinerary and map to email addresses
      const hotelMap = new Map<string, { checkIn: string; checkOut: string; roomType: string; meals: string }>();
      
      for (const day of payload.itinerary) {
        if (day.hotel && !hotelMap.has(day.hotel)) {
          hotelMap.set(day.hotel, {
            checkIn: day.date,
            checkOut: day.date,
            roomType: day.roomType || "Standard",
            meals: day.meals || "BB",
          });
        } else if (day.hotel && hotelMap.has(day.hotel)) {
          // Update checkout date
          const existing = hotelMap.get(day.hotel)!;
          existing.checkOut = day.date;
        }
      }

      // Build hotel email list with known email addresses
      const hotels: HotelEmail[] = [];
      const mainClient = payload.clients[0];
      const guestInfo = payload.guestInfo || { numAdults: 1, numKids: 0, kidsAges: [], numRooms: 1 };

      for (const [hotelName, dates] of hotelMap.entries()) {
        const hotelEmail = HOTEL_EMAILS[hotelName];
        if (hotelEmail) {
          hotels.push({
            hotelName,
            hotelEmail,
            clientName: mainClient?.name || "Guest",
            checkIn: dates.checkIn,
            checkOut: dates.checkOut,
            roomType: dates.roomType,
            meals: dates.meals,
            confirmationCode,
            guestInfo,
          });
        }
      }

      if (hotels.length === 0) {
        toast({
          title: "No hotel emails found",
          description: "None of the hotels in this itinerary have email addresses configured.",
          variant: "destructive",
        });
        return { success: false, reason: "no_hotels" };
      }

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("send-hotel-emails", {
        body: { hotels, confirmationCode },
      });

      if (error) {
        throw error;
      }

      const successCount = data.results.filter((r: { success: boolean }) => r.success).length;
      
      if (successCount === hotels.length) {
        toast({
          title: "Emails sent successfully",
          description: `All ${successCount} hotel confirmation emails were sent.`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Some emails sent",
          description: `${successCount} of ${hotels.length} emails were sent. Check logs for details.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send emails",
          description: "No emails could be sent. Please check your Gmail configuration.",
          variant: "destructive",
        });
      }

      return { success: successCount > 0, results: data.results };
    } catch (error) {
      console.error("Error sending hotel emails:", error);
      toast({
        title: "Error sending emails",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsSending(false);
    }
  };

  return { sendHotelEmails, isSending };
}
