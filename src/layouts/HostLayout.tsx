import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { HostSidebar } from "@/components/host/HostSidebar";
import { HostPageHeader } from "@/components/host/HostPageHeader";
import { Loader2, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  if (pathname === "/host/dashboard") return "Dashboard";
  if (pathname === "/host/listings") return "Listings & Availability";
  if (pathname === "/host/bookings") return "Bookings";
  if (pathname === "/host/payouts") return "Payouts";
  if (pathname === "/host/earnings-report") return "Earnings Report";
  if (pathname === "/host/inbox") return "Messages";
  if (pathname.startsWith("/host/edit-listing/")) return "Edit Listing";
  if (pathname === "/host/create-listing") return "Create Listing";
  return "Dashboard";
};

// Check if current route should hide the header (create/edit pages)
const shouldHideHeader = (pathname: string): boolean => {
  return pathname === "/host/create-listing" || pathname.startsWith("/host/edit-listing/");
};

const HostLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isHost, isGuest, requestHostRole, loading: roleLoading } = useUserRole();
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();
  
  const pageTitle = getPageTitle(location.pathname);
  const hideHeader = shouldHideHeader(location.pathname);

  useEffect(() => {
    if (!roleLoading) {
      if (!user) {
        navigate("/");
      } else if (!isHost && !isGuest) {
        // If user has no roles at all, redirect to home
        navigate("/");
      }
    }
  }, [user, isHost, isGuest, roleLoading, navigate]);

  const handleRequestHost = async () => {
    setRequesting(true);
    const { error } = await requestHostRole();
    
    if (error) {
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "You are now a host. Start creating your first listing!",
      });
    }
    setRequesting(false);
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isGuest && !isHost) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <Home className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Become a Host</h2>
              <p className="text-muted-foreground mb-6">
                Start earning by sharing your space with travelers from around the world.
              </p>
            </div>
            <Button onClick={handleRequestHost} className="w-full" disabled={requesting} size="lg">
              {requesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Home className="h-4 w-4 mr-2" />
                  Become a Host
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <HostSidebar logoText="Rentely" />
      <div className="flex-1">
        {!hideHeader && (
          <div className="container mx-auto px-4 pt-8 lg:px-8">
            <HostPageHeader 
              title={pageTitle}
            />
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
};

export default HostLayout;
