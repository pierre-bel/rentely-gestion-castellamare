import { Card } from "@/components/ui/card";

interface DisputeOverviewTabProps {
  dispute: any;
  booking: any;
}

export const DisputeOverviewTab = ({ dispute, booking }: DisputeOverviewTabProps) => {
  return (
    <Card className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1">User Requested Amount</div>
            <div className="text-base md:text-lg font-semibold">
              ${dispute.requested_refund_amount?.toFixed(2) || '0.00'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Eligible Amount</div>
            <div className="text-base md:text-lg font-semibold">
              ${booking.total_price?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Cancellation Policy</div>
            <div className="text-sm font-medium">
              {booking.cancellation_policy_snapshot?.name || 'Standard'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Payment Method</div>
            <div className="text-sm font-medium">
              {booking.payment_method || 'Stripe'}
            </div>
          </div>
        </div>

        <div className="pt-3 md:pt-4 border-t">
          <div className="text-xs text-muted-foreground mb-2">Full Reason</div>
          <div className="max-h-[200px] overflow-auto">
            <p className="text-sm leading-relaxed whitespace-pre-wrap pr-2">{dispute.description}</p>
          </div>
        </div>

        <div className="pt-3 md:pt-4 border-t">
          <div className="text-xs text-muted-foreground mb-2">Booking Details</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Check-in:</span>{" "}
              <span className="font-medium">
                {new Date(booking.checkin_date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Check-out:</span>{" "}
              <span className="font-medium">
                {new Date(booking.checkout_date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Nights:</span>{" "}
              <span className="font-medium">{booking.nights}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Guests:</span>{" "}
              <span className="font-medium">{booking.guests}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
