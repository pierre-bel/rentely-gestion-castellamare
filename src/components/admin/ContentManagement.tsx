import { Card, CardContent } from "@/components/ui/card";
import FAQManagement from "./FAQManagement";

export default function ContentManagement() {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <FAQManagement />
      </CardContent>
    </Card>
  );
}
