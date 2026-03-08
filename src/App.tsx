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
import Home from "./pages/Home";
import Search from "./pages/Search";
import ForgotPassword from "./pages/ForgotPassword";
import BecomeHost from "./pages/BecomeHost";
import FAQ from "./pages/FAQ";
import HelpCenter from "./pages/HelpCenter";
import Support from "./pages/Support";
import HostDashboard from "./pages/host/Dashboard";
import CreateListing from "./pages/host/CreateListing";
import EditListing from "./pages/host/EditListing";
import ListingsManagement from "./pages/host/ListingsManagement";
import HostBookings from "./pages/host/Bookings";
import HostTenants from "./pages/host/Tenants";
import HostReviews from "./pages/host/Reviews";
import HostAvailability from "./pages/host/Availability";
import PublicAvailability from "./pages/PublicAvailability";
import EmbedAvailability from "./pages/EmbedAvailability";
import EmbedAllAvailability from "./pages/EmbedAllAvailability";
import HostPayouts from "./pages/host/Payouts";
import EarningsReport from "./pages/host/EarningsReport";
import HostStatistics from "./pages/host/Statistics";
import HostContracts from "./pages/host/Contracts";
import HostPricingPage from "./pages/host/Pricing";
import HostCleaningPage from "./pages/host/Cleaning";
import EmailAutomations from "./pages/host/EmailAutomations";
import PortalSettings from "./pages/host/PortalSettings";
import ListingDetail from "./pages/ListingDetail";
import BookingConfirmation from "./pages/BookingConfirmation";
import Checkout from "./pages/Checkout";
import AdminLayout from "./layouts/AdminLayout";
import HostLayout from "./layouts/HostLayout";
import GuestLayout from "./layouts/GuestLayout";
import Overview from "./pages/admin/Overview";
import GuestDashboard from "./pages/guest/Dashboard";
import GuestBookings from "./pages/guest/Bookings";
import GuestPayments from "./pages/guest/Payments";
import GuestInbox from "./pages/guest/Inbox";
import HostInbox from "./pages/host/Inbox";
import GuestProfile from "./pages/guest/Profile";
import GuestSettings from "./pages/guest/Settings";
import AdminListingsManagement from "./pages/admin/ListingsManagement";
import ReviewListing from "./pages/admin/ReviewListing";
import UsersManagement from "./pages/admin/UsersManagement";
import Transactions from "./pages/admin/Transactions";
import Commissions from "./pages/admin/Commissions";
import Reports from "./pages/admin/Reports";
import AdminBookingsManagement from "./pages/admin/BookingsManagement";
import AdminDisputesManagement from "./pages/admin/DisputesManagement";
import AdminSupport from "./pages/admin/Support";
import ContentManagementPage from "./pages/admin/ContentManagement";
import NotFound from "./pages/NotFound";
import BookingPortal from "./pages/BookingPortal";
import CleaningPortal from "./pages/CleaningPortal";

const queryClient = new QueryClient();

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
            <Routes>
            <Route path="/" element={<><Navbar /><Home /></>} />
            <Route path="/search" element={<Search />} />
            <Route path="/faq" element={<><Navbar /><FAQ /></>} />
            <Route path="/help-center" element={<><Navbar /><HelpCenter /></>} />
            <Route path="/support" element={<><Navbar /><Support /></>} />
            <Route path="/forgot-password" element={<><Navbar /><ForgotPassword /></>} />
            <Route path="/become-host" element={<><Navbar /><BecomeHost /></>} />
            <Route path="/disponibilites" element={<PublicAvailability />} />
            <Route path="/embed/availability/all/:hostId" element={<EmbedAllAvailability />} />
            <Route path="/embed/availability/:listingId" element={<EmbedAvailability />} />
            <Route path="/portal/:token" element={<BookingPortal />} />
            <Route path="/cleaning-portal/:token" element={<CleaningPortal />} />
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
          </DemoProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
