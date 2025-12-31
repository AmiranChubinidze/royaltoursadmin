import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EditableRoute } from "@/components/EditableRoute";
import { BookingRoute } from "@/components/BookingRoute";
import { AccountantRoute } from "@/components/AccountantRoute";
import Index from "./pages/Index";
import NewConfirmation from "./pages/NewConfirmation";
import EditConfirmation from "./pages/EditConfirmation";
import ViewConfirmation from "./pages/ViewConfirmation";
import ConfirmationAttachments from "./pages/ConfirmationAttachments";
import SavedData from "./pages/SavedData";
import AdminPanel from "./pages/AdminPanel";
import FinancesPage from "./pages/FinancesPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CreateBookingRequest from "./pages/CreateBookingRequest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/new" element={<ProtectedRoute><EditableRoute><NewConfirmation /></EditableRoute></ProtectedRoute>} />
          <Route path="/saved-data" element={<ProtectedRoute><BookingRoute><SavedData /></BookingRoute></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          <Route path="/finances" element={<ProtectedRoute><AccountantRoute><FinancesPage /></AccountantRoute></ProtectedRoute>} />
          <Route path="/confirmation/:id" element={<ProtectedRoute><ViewConfirmation /></ProtectedRoute>} />
          <Route path="/confirmation/:id/edit" element={<ProtectedRoute><EditableRoute><EditConfirmation /></EditableRoute></ProtectedRoute>} />
          <Route path="/confirmation/:id/attachments" element={<ProtectedRoute><BookingRoute><ConfirmationAttachments /></BookingRoute></ProtectedRoute>} />
          <Route path="/create-booking-request" element={<ProtectedRoute><BookingRoute><CreateBookingRequest /></BookingRoute></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
