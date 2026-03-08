import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextLinkButton } from "@/components/ui/text-link-button";
import DashboardEarningsSummary from "@/components/host/DashboardEarningsSummary";
import DashboardRecentListings from "@/components/host/DashboardRecentListings";
import DashboardInbox from "@/components/host/DashboardInbox";
import DashboardRecentBookings from "@/components/host/DashboardRecentBookings";
import DashboardUpcomingBookings from "@/components/host/DashboardUpcomingBookings";
import DashboardRecentPayouts from "@/components/host/DashboardRecentPayouts";

const HostDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-3 pb-8 sm:px-4 lg:px-8">
      {/* Aperçu des revenus */}
      <Card className="bg-card">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-xl sm:text-2xl font-bold">Aperçu des revenus</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Indicateurs de performance sur toute la période
          </p>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {user ? (
            <DashboardEarningsSummary userId={user.id} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Veuillez vous connecter pour voir votre tableau de bord
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prochaines locations et Messagerie */}
      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Prochaines locations - 2/3 */}
          <div className="lg:col-span-2">
            <Card className="bg-card h-full flex flex-col">
              <CardHeader className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold">Prochaines locations</CardTitle>
                  <TextLinkButton href="/host/bookings">
                    Voir tout
                  </TextLinkButton>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-1">
                <DashboardUpcomingBookings userId={user.id} />
              </CardContent>
            </Card>
          </div>

          {/* Messagerie - 1/3 */}
          <div className="lg:col-span-1">
            <Card className="bg-card h-full flex flex-col">
              <CardHeader className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold">Messagerie</CardTitle>
                  <TextLinkButton href="/host/inbox">
                    Voir tout
                  </TextLinkButton>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <DashboardInbox userId={user.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dernières réservations et Annonces */}
      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Dernières réservations encodées */}
          <Card className="bg-card h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold">Dernières réservations</CardTitle>
                <TextLinkButton href="/host/bookings">
                  Gérer
                </TextLinkButton>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              <DashboardRecentBookings userId={user.id} />
            </CardContent>
          </Card>

          {/* Annonces récentes */}
          <Card className="bg-card h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold">Annonces</CardTitle>
                <Button onClick={() => navigate("/host/create-listing", { state: { from: "/host/dashboard" } })}>
                  + Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              <DashboardRecentListings userId={user.id} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Versements */}
      {user && (
        <div className="mt-6">
          <Card className="bg-card h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold">Versements</CardTitle>
                <TextLinkButton href="/host/payouts">
                  Voir tout
                </TextLinkButton>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              <DashboardRecentPayouts userId={user.id} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;
