import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RevenueManagement from "./RevenueManagement";
import ReviewsReportManagement from "./ReviewsReportManagement";
import AdminDashboardReportsAnalytics from "./AdminDashboardReportsAnalytics";

export default function ReportsManagement() {
  return (
    <Tabs defaultValue="statistics" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="statistics">Statistics</TabsTrigger>
        <TabsTrigger value="revenue">Revenue</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>

      <TabsContent value="statistics" className="space-y-6">
        <AdminDashboardReportsAnalytics />
      </TabsContent>
      
      <TabsContent value="revenue" className="space-y-6">
        <RevenueManagement />
      </TabsContent>
      
      <TabsContent value="reviews" className="space-y-6">
        <ReviewsReportManagement />
      </TabsContent>
    </Tabs>
  );
}
