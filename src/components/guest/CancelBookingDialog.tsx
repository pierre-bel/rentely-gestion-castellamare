import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CancellationPolicySnapshot {
  policy_key: string;
  name: string;
  description: string;
  refund_percentage: number;
  days_before_checkin: number;
}

interface Booking {
  id: string;
  checkin_date: string;
  total_price: number;
  cancellation_policy_snapshot?: CancellationPolicySnapshot;
}

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onConfirm: () => void;
}

export const CancelBookingDialog = ({
  open,
  onOpenChange,
  booking,
  onConfirm,
}: CancelBookingDialogProps) => {
  if (!booking) return null;

  // Calculate days until check-in using timezone-agnostic approach
  const checkinDate = parseISO(booking.checkin_date);
  const today = startOfDay(new Date());
  const daysUntilCheckin = differenceInCalendarDays(checkinDate, today);

  // Handle missing cancellation policy
  if (!booking.cancellation_policy_snapshot) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              This booking does not have a cancellation policy configured. Please contact support for assistance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const policy = booking.cancellation_policy_snapshot;
  const isRefundEligible = daysUntilCheckin >= policy.days_before_checkin;
  const refundAmount = (booking.total_price * policy.refund_percentage) / 100;

  // Generate dynamic message
  const message = isRefundEligible
    ? `According to the ${policy.name}, you are cancelling ${daysUntilCheckin} days before check-in. If you proceed, a refund of $${refundAmount.toFixed(2)} (${policy.refund_percentage}%) will be issued. Are you sure you want to cancel?`
    : `According to the ${policy.name}, the cancellation window has passed as there are fewer than ${policy.days_before_checkin} days until check-in. No refund will be issued. Do you still wish to cancel?`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Booking</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, Cancel Booking
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
