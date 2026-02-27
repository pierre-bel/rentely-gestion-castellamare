import { useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useGuestDebt } from "@/hooks/useGuestDebt";
import GuestDebtPaymentDialog from "./GuestDebtPaymentDialog";

const AccountRestrictionBanner = () => {
  const { debts, hasOutstandingDebt, loading, refetch } = useGuestDebt();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading || !hasOutstandingDebt) return null;

  const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
  const debtCount = debts.length;

  return (
    <>
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Account Restricted</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            You have {debtCount} outstanding {debtCount === 1 ? "debt" : "debts"} totaling ${totalDebt.toFixed(2)}.
            You must pay {debtCount === 1 ? "this" : "these"} before making new bookings.
          </span>
          <div className="flex gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
              View Details
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              Pay Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <GuestDebtPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onPaymentSuccess={refetch}
      />
    </>
  );
};

export default AccountRestrictionBanner;
