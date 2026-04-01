import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EditableRoute } from "@/components/EditableRoute";
import { BookingRoute } from "@/components/BookingRoute";
import { AccountantRoute } from "@/components/AccountantRoute";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const Index = lazy(() => import("./pages/Index"));
const NewConfirmation = lazy(() => import("./pages/NewConfirmation"));
const EditConfirmation = lazy(() => import("./pages/EditConfirmation"));
const ViewConfirmation = lazy(() => import("./pages/ViewConfirmation"));
const ConfirmationAttachments = lazy(() => import("./pages/ConfirmationAttachments"));
const SavedData = lazy(() => import("./pages/SavedData"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const FinancesPage = lazy(() => import("./pages/FinancesPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const CreateBookingRequest = lazy(() => import("./pages/CreateBookingRequest"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CurrencyProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Index />} />
                <Route path="new" element={<EditableRoute><NewConfirmation /></EditableRoute>} />
                <Route path="saved-data" element={<BookingRoute><SavedData /></BookingRoute>} />
                <Route path="admin" element={<AdminPanel />} />
                <Route path="finances" element={<AccountantRoute><FinancesPage /></AccountantRoute>} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="confirmation/:id" element={<ViewConfirmation />} />
                <Route path="confirmation/:id/edit" element={<EditableRoute><EditConfirmation /></EditableRoute>} />
                <Route path="confirmation/:id/attachments" element={<BookingRoute><ConfirmationAttachments /></BookingRoute>} />
                <Route path="create-booking-request" element={<BookingRoute><CreateBookingRequest /></BookingRoute>} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </CurrencyProvider>
  </QueryClientProvider>
);

export default App;
