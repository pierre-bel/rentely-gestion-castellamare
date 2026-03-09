import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { DemoProvider } from "./contexts/DemoContext";
import { SuspendedUserListener } from "./components/SuspendedUserListener";
import ScrollToTop from "./components/ScrollToTop";
import Navbar from "./components/Navbar";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Search = lazy(() => import("./pages/Search"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const BecomeHost = lazy(() => import("./pages/BecomeHost"));
const FAQ = lazy(() => import("./pages/FAQ"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Support = lazy(() => import("./pages/Support"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PublicAvailability = lazy(() => import("./pages/PublicAvailability"));
const EmbedAvailability = lazy(() => import("./pages/EmbedAvailability"));
const EmbedAllAvailability = lazy(() => import("./pages/EmbedAllAvailability"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const BookingPortal = lazy(() => import("./pages/BookingPortal"));
const CleaningPortal = lazy(() => import("./pages/CleaningPortal"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Feature pages
const CalendarFeature = lazy(() => import("./pages/features/CalendarFeature"));
const BookingsFeature = lazy(() => import("./pages/features/BookingsFeature"));
const AutomationFeature = lazy(() => import("./pages/features/AutomationFeature"));
const ToolsFeature = lazy(() => import("./pages/features/ToolsFeature"));

// Layouts
const HostLayout = lazy(() => import("./layouts/HostLayout"));
const GuestLayout = lazy(() => import("./layouts/GuestLayout"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));

// Host pages
const HostDashboard = lazy(() => import("./pages/host/Dashboard"));
const CreateListing = lazy(() => import("./pages/host/CreateListing"));
const EditListing = lazy(() => import("./pages/host/EditListing"));
const ListingsManagement = lazy(() => import("./pages/host/ListingsManagement"));
const HostBookings = lazy(() => import("./pages/host/Bookings"));
const HostTenants = lazy(() => import("./pages/host/Tenants"));
const HostReviews = lazy(() => import("./pages/host/Reviews"));
const HostAvailability = lazy(() => import("./pages/host/Availability"));
const HostPayouts = lazy(() => import("./pages/host/Payouts"));
const EarningsReport = lazy(() => import("./pages/host/EarningsReport"));

const HostContracts = lazy(() => import("./pages/host/Contracts"));
const HostPricingPage = lazy(() => import("./pages/host/Pricing"));
const HostCleaningPage = lazy(() => import("./pages/host/Cleaning"));
const EmailAutomations = lazy(() => import("./pages/host/EmailAutomations"));
const PortalSettings = lazy(() => import("./pages/host/PortalSettings"));
const HostInbox = lazy(() => import("./pages/host/Inbox"));

// Guest pages
const GuestDashboard = lazy(() => import("./pages/guest/Dashboard"));
const GuestBookings = lazy(() => import("./pages/guest/Bookings"));
const GuestPayments = lazy(() => import("./pages/guest/Payments"));
const GuestInbox = lazy(() => import("./pages/guest/Inbox"));
const GuestProfile = lazy(() => import("./pages/guest/Profile"));
const GuestSettings = lazy(() => import("./pages/guest/Settings"));

// Admin pages
const Overview = lazy(() => import("./pages/admin/Overview"));
const AdminListingsManagement = lazy(() => import("./pages/admin/ListingsManagement"));
const ReviewListing = lazy(() => import("./pages/admin/ReviewListing"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));
const Transactions = lazy(() => import("./pages/admin/Transactions"));
const Commissions = lazy(() => import("./pages/admin/Commissions"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const AdminBookingsManagement = lazy(() => import("./pages/admin/BookingsManagement"));
const AdminDisputesManagement = lazy(() => import("./pages/admin/DisputesManagement"));
const AdminSupport = lazy(() => import("./pages/admin/Support"));
const ContentManagementPage = lazy(() => import("./pages/admin/ContentManagement"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min
      gcTime: 1000 * 60 * 10, // 10 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DemoProvider>
            <SuspendedUserListener />
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<><Navbar /><Home /></>} />
              <Route path="/search" element={<Search />} />
              <Route path="/faq" element={<><Navbar /><FAQ /></>} />
              <Route path="/help-center" element={<><Navbar /><HelpCenter /></>} />
              <Route path="/support" element={<><Navbar /><Support /></>} />
              <Route path="/forgot-password" element={<><Navbar /><ForgotPassword /></>} />
              <Route path="/become-host" element={<><Navbar /><BecomeHost /></>} />
              <Route path="/features/calendar" element={<CalendarFeature />} />
              <Route path="/features/bookings" element={<BookingsFeature />} />
              <Route path="/features/automation" element={<AutomationFeature />} />
              <Route path="/features/tools" element={<ToolsFeature />} />
              <Route path="/disponibilites" element={<PublicAvailability />} />
              <Route path="/embed/availability/all/:hostId" element={<EmbedAllAvailability />} />
              <Route path="/embed/availability/:listingId" element={<EmbedAvailability />} />
              <Route path="/portal/:token" element={<BookingPortal />} />
              <Route path="/cleaning-portal/:token" element={<CleaningPortal />} />
              <Route path="/accept-invitation" element={<><Navbar /><AcceptInvitation /></>} />
              <Route path="/host" element={<HostLayout />}>
                <Route path="dashboard" element={<HostDashboard />} />
                <Route path="listings" element={<ListingsManagement />} />
                <Route path="availability" element={<HostAvailability />} />
                <Route path="bookings" element={<HostBookings />} />
                <Route path="tenants" element={<HostTenants />} />
                <Route path="reviews" element={<HostReviews />} />
                <Route path="pricing" element={<HostPricingPage />} />
                <Route path="cleaning" element={<HostCleaningPage />} />
                <Route path="payouts" element={<HostPayouts />} />
                <Route path="earnings-report" element={<EarningsReport />} />
                <Route path="statistics" element={<HostStatistics />} />
                <Route path="contracts" element={<HostContracts />} />
                <Route path="inbox" element={<HostInbox />} />
                <Route path="email-automations" element={<EmailAutomations />} />
                <Route path="portal-settings" element={<PortalSettings />} />
                <Route path="create-listing" element={<CreateListing />} />
                <Route path="edit-listing/:id" element={<EditListing />} />
              </Route>
              <Route path="/listing/:id" element={<><Navbar /><ListingDetail /></>} />
              <Route path="/checkout" element={<><Navbar /><Checkout /></>} />
              <Route path="/booking-confirmation/:id" element={<><Navbar /><BookingConfirmation /></>} />
              <Route path="/guest" element={<GuestLayout />}>
                <Route path="dashboard" element={<GuestDashboard />} />
                <Route path="bookings" element={<GuestBookings />} />
                <Route path="payments" element={<GuestPayments />} />
                <Route path="inbox" element={<GuestInbox />} />
                <Route path="profile" element={<GuestProfile />} />
                <Route path="settings" element={<GuestSettings />} />
              </Route>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Overview />} />
                <Route path="listings" element={<AdminListingsManagement />} />
                <Route path="bookings" element={<AdminBookingsManagement />} />
                <Route path="disputes" element={<AdminDisputesManagement />} />
                <Route path="review-listing/:id" element={<ReviewListing />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="commissions" element={<Commissions />} />
                <Route path="reports" element={<Reports />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="content" element={<ContentManagementPage />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<><Navbar /><NotFound /></>} />
              </Routes>
            </Suspense>
          </DemoProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
