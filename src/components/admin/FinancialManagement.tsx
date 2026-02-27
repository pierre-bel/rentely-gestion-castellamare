import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionsManagement from "./TransactionsManagement";
import PayoutsManagement from "./PayoutsManagement";
import GuestDebtsManagement from "./GuestDebtsManagement";

const FinancialManagement = () => {
  return (
    <Card className="w-full">
      <CardContent className="py-6">
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="guest-debts">Guest Debts</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionsManagement />
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutsManagement />
          </TabsContent>

          <TabsContent value="guest-debts">
            <GuestDebtsManagement />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FinancialManagement;
