import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RevenueManagement from "./RevenueManagement";
import ReviewsReportManagement from "./ReviewsReportManagement";

export default function ReportsManagement() {
  return (
    <Tabs defaultValue="revenue" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="revenue">Revenue</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>
      
      <TabsContent value="revenue" className="space-y-6">
        <RevenueManagement />
      </TabsContent>
      
      <TabsContent value="reviews" className="space-y-6">
        <ReviewsReportManagement />
      </TabsContent>
    </Tabs>
  );
}
