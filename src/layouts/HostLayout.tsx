import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { HostSidebar } from "@/components/host/HostSidebar";
import { HostPageHeader } from "@/components/host/HostPageHeader";
import { Loader2, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import DemoBanner from "@/components/DemoBanner";

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  if (pathname === "/host/dashboard") return "Tableau de bord";
  if (pathname === "/host/listings") return "Mes biens";
  if (pathname === "/host/tenants") return "Locataires";
  if (pathname === "/host/reviews") return "Avis";
  if (pathname === "/host/availability") return "Calendrier des disponibilités";
  if (pathname === "/host/bookings") return "Réservations";
  if (pathname === "/host/pricing") return "Tarifs";
  if (pathname === "/host/cleaning") return "Ménage";
  if (pathname === "/host/payouts") return "Paiements";
  if (pathname === "/host/earnings-report") return "Rapport de revenus";
  if (pathname === "/host/statistics") return "Statistiques";
  if (pathname === "/host/contracts") return "Contrats";
  if (pathname === "/host/email-automations") return "E-mails automatiques";
  if (pathname === "/host/inbox") return "Messages";
  if (pathname === "/host/portal-settings") return "Portail client";
  if (pathname.startsWith("/host/edit-listing/")) return "Modifier le bien";
  if (pathname === "/host/create-listing") return "Créer un bien";
  return "Tableau de bord";
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
  const { isTeamMember, loading: teamLoading } = useTeamAccess();
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();
  
  const pageTitle = getPageTitle(location.pathname);
  const hideHeader = shouldHideHeader(location.pathname);

  const isLoading = roleLoading || teamLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/");
      } else if (!isHost && !isGuest && !isTeamMember) {
        navigate("/");
      }
    }
  }, [user, isHost, isGuest, isTeamMember, isLoading, navigate]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Team members can access directly, skip the "become host" screen
  if (isGuest && !isHost && !isTeamMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="max-w-md border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent-warm to-accent-cool flex items-center justify-center mx-auto mb-4">
                <Home className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Devenir hôte</h2>
              <p className="text-muted-foreground mb-6">
                Commencez à gagner de l'argent en partageant votre espace avec des voyageurs du monde entier.
              </p>
            </div>
            <Button onClick={handleRequestHost} className="w-full" disabled={requesting} size="lg">
              {requesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <Home className="h-4 w-4 mr-2" />
                  Devenir hôte
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
      <div className="flex-1 flex flex-col">
        <DemoBanner />
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
