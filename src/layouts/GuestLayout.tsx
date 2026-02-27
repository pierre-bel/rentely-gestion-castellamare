import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GuestSidebar } from "@/components/guest/GuestSidebar";
import { GuestPageHeader } from "@/components/guest/GuestPageHeader";
import { Loader2 } from "lucide-react";

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  if (pathname === "/guest/dashboard") return "Dashboard";
  if (pathname === "/guest/bookings") return "My Bookings";
  if (pathname === "/guest/payments") return "Payments & Receipts";
  if (pathname === "/guest/inbox") return "Messages";
  if (pathname === "/guest/profile") return "My Profile";
  if (pathname === "/guest/settings") return "Settings";
  return "Dashboard";
};

const GuestLayout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <GuestSidebar logoText="Rentely" />
      <div className="flex-1">
        <div className="container mx-auto px-4 pt-8 lg:px-8">
          <GuestPageHeader 
            title={pageTitle}
          />
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default GuestLayout;
