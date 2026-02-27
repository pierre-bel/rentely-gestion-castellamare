import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDemoData } from "@/hooks/useDemoData";

interface PaymentSummary {
  id: string;
  amount: number;
  created_at: string;
  bookings: {
    listings: {
      title: string;
    };
  };
}

const DashboardPaymentsSummary = ({ userId }: { userId: string }) => {
  const { isDemoMode, migrationComplete, getTransactions } = useDemoData();

  const { data: dbPayments, isLoading: dbLoading } = useQuery({
    queryKey: ["dashboard-payments-summary", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          created_at,
          bookings!inner(
            listings!inner(
              title
            )
          )
        `)
        .eq("type", "capture")
        .eq("status", "succeeded")
        .is("dispute_id", null)
        .eq("bookings.guest_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as unknown as PaymentSummary[];
    },
    enabled: !isDemoMode,
  });

  const { data: demoPayments, isLoading: demoLoading } = useQuery({
    queryKey: ["demo-dashboard-payments-summary", userId, migrationComplete],
    queryFn: async () => {
      const transactions = getTransactions({ type: 'capture', status: 'succeeded' });
      return transactions
        .filter((t: any) => !t.dispute_id)
        .slice(0, 5)
        .map((t: any) => ({
          id: t.id,
          amount: t.amount,
          created_at: t.created_at,
          bookings: {
            listings: {
              title: t.bookings?.listings?.title || 'Unknown Listing'
            }
          }
        }));
    },
    enabled: isDemoMode && migrationComplete,
  });

  const payments = isDemoMode ? demoPayments : dbPayments;
  const isLoading = isDemoMode ? demoLoading : dbLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Payments & Receipts</CardTitle>
          <TextLinkButton href="/guest/payments">View All</TextLinkButton>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Payments & Receipts</CardTitle>
          <TextLinkButton href="/guest/payments">View All</TextLinkButton>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <p className="text-muted-foreground">No payment history yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Payments & Receipts</CardTitle>
        <TextLinkButton href="/guest/payments">View All</TextLinkButton>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="truncate max-w-[150px] min-w-0">
                    {payment.bookings.listings.title}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(payment.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${payment.amount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardPaymentsSummary;
