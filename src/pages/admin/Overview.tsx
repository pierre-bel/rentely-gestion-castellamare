import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextLinkButton } from "@/components/ui/text-link-button";
import AdminDashboardOverview from "@/components/admin/AdminDashboardOverview";
import AdminQuickActions from "@/components/admin/AdminQuickActions";
import AdminDashboardRecentListings from "@/components/admin/AdminDashboardRecentListings";
import AdminDashboardSupportInbox from "@/components/admin/AdminDashboardSupportInbox";
import AdminDashboardRecentPayouts from "@/components/admin/AdminDashboardRecentPayouts";
import AdminDashboardReportsAnalytics from "@/components/admin/AdminDashboardReportsAnalytics";

export default function Overview() {
  return (
    <div className="pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Overview (2/3 width) */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              <AdminDashboardOverview />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions (1/3 width) */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              <AdminQuickActions />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Listings and Support Inbox Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Recent Listings - 2/3 width */}
        <div className="lg:col-span-2">
          <Card className="bg-card h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">Listings</CardTitle>
                <TextLinkButton href="/admin/listings">
                  View All
                </TextLinkButton>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              <AdminDashboardRecentListings />
            </CardContent>
          </Card>
        </div>

        {/* Support Inbox - 1/3 width */}
        <div className="lg:col-span-1">
          <Card className="bg-card h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">Support</CardTitle>
                <TextLinkButton href="/admin/support">
                  View All
                </TextLinkButton>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <AdminDashboardSupportInbox />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payouts and Reports Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Payouts - Left side (1/2 width) */}
        <div className="lg:col-span-1">
          <Card className="bg-card h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">Payouts</CardTitle>
                <TextLinkButton href="/admin/transactions">
                  View All
                </TextLinkButton>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              <AdminDashboardRecentPayouts />
            </CardContent>
          </Card>
        </div>

        {/* Reports & Analytics - Right side (1/2 width) */}
        <div className="lg:col-span-1">
          <Card className="bg-card h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">Reports & Analytics</CardTitle>
                <TextLinkButton href="/admin/reports">
                  View All
                </TextLinkButton>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <AdminDashboardReportsAnalytics />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
