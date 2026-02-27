import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface DisputeResolutionPanelProps {
  refundAmount: string;
  setRefundAmount: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  decision: string;
  setDecision: (value: string) => void;
  disabled?: boolean;
  eligibleAmount?: number;
  bookingTotal?: number;
}

export const DisputeResolutionPanel = ({
  refundAmount,
  setRefundAmount,
  notes,
  setNotes,
  decision,
  setDecision,
  disabled = false,
  eligibleAmount,
  bookingTotal,
}: DisputeResolutionPanelProps) => {
  return (
    <Card className="bg-[#F8FAFF] border-[#D5DAE7] p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Resolution {disabled && <span className="text-sm text-muted-foreground ml-2">(Read-Only)</span>}
        </h3>
        {eligibleAmount !== undefined && bookingTotal !== undefined && (
          <div className="text-sm space-y-1 mt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking Total:</span>
              <span className="font-medium">${bookingTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previous Refunds:</span>
              <span className="font-medium text-destructive">-${(bookingTotal - eligibleAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold">Eligible for Refund:</span>
              <span className="font-semibold text-primary">${eligibleAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <input
            type="number"
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            disabled={disabled}
            className="peer h-14 w-full rounded-full px-6 border border-[#D5DAE7] bg-white text-base placeholder-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder=" "
          />
          <label className="absolute left-6 top-1/2 -translate-y-1/2 text-base text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-0 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
            Refund Amount ($)
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={disabled}
            className="peer min-h-[120px] w-full rounded-3xl px-6 py-4 border border-[#D5DAE7] bg-white text-base placeholder-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder=" "
          />
          <label className="absolute left-6 top-4 text-base text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-0 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
            Notes
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Decision</Label>
        <RadioGroup value={decision} onValueChange={setDecision} disabled={disabled}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="approved" id="approved" disabled={disabled} />
            <Label htmlFor="approved" className="font-normal cursor-pointer">Approve</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="on_hold" id="on_hold" disabled={disabled} />
            <Label htmlFor="on_hold" className="font-normal cursor-pointer">Hold</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="declined" id="declined" disabled={disabled} />
            <Label htmlFor="declined" className="font-normal cursor-pointer">Decline</Label>
          </div>
        </RadioGroup>
      </div>
    </Card>
  );
};
