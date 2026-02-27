import { Card, CardContent } from "@/components/ui/card";
import ReportsManagement from "@/components/admin/ReportsManagement";

export default function Reports() {
  return (
    <div className="pb-8">
      <Card className="w-full">
        <CardContent className="p-6">
          <ReportsManagement />
        </CardContent>
      </Card>
    </div>
  );
}
