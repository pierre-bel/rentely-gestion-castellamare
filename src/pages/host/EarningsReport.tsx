import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HostEarningsReport from "@/components/host/HostEarningsReport";
import HostStatistics from "@/components/host/HostStatistics";

export default function EarningsReport() {
  return (
    <div className="container mx-auto px-4 pb-8 lg:px-8">
      <Tabs defaultValue="earnings" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="earnings">Revenus</TabsTrigger>
          <TabsTrigger value="statistics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings">
          <HostEarningsReport />
        </TabsContent>

        <TabsContent value="statistics">
          <HostStatistics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
