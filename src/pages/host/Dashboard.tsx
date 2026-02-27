import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextLinkButton } from "@/components/ui/text-link-button";
import DashboardEarningsSummary from "@/components/host/DashboardEarningsSummary";
import DashboardRecentListings from "@/components/host/DashboardRecentListings";
import DashboardInbox from "@/components/host/DashboardInbox";
import DashboardRecentBookings from "@/components/host/DashboardRecentBookings";
import DashboardRecentPayouts from "@/components/host/DashboardRecentPayouts";

const HostDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 pb-8 lg:px-8">
      {/* Earnings Overview Panel */}
      <Card className="bg-card">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl font-bold">Earnings Overview</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Key performance metrics across all time
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {user ? (
            <DashboardEarningsSummary userId={user.id} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Please log in to view your dashboard
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Listings and Inbox Row */}
      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Recent Listings - 2/3 width */}
          <div className="lg:col-span-2">
            <Card className="bg-card h-full flex flex-col">
              <CardHeader className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold">Recent Listings</CardTitle>
                  <Button onClick={() => navigate("/host/create-listing", { state: { from: "/host/dashboard" } })}>
                    + Add New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-1">
                <DashboardRecentListings userId={user.id} />
              </CardContent>
            </Card>
          </div>

          {/* Inbox - 1/3 width */}
          <div className="lg:col-span-1">
            <Card className="bg-card h-full flex flex-col">
              <CardHeader className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold">Inbox</CardTitle>
                  <TextLinkButton href="/host/inbox">
                    View All
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

      {/* Recent Bookings and Recent Payouts Row */}
      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Recent Bookings - Left Column */}
          <Card className="bg-card h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold">Bookings</CardTitle>
                <TextLinkButton href="/host/bookings">
                  Manage Bookings
                </TextLinkButton>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              <DashboardRecentBookings userId={user.id} />
            </CardContent>
          </Card>

          {/* Recent Payouts - Right Column */}
          <Card className="bg-card h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold">Payouts</CardTitle>
                <TextLinkButton href="/host/payouts">
                  Review
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
