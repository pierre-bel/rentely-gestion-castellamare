import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import FormInput from "@/components/listing/FormInput";
import FormSelect from "@/components/listing/FormSelect";
import { Loader2, AlertCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GuestDebt } from "@/hooks/useGuestDebt";
import { format } from "date-fns";

interface GuestDebtPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess?: () => void;
}

const GuestDebtPaymentDialog = ({ open, onOpenChange, onPaymentSuccess }: GuestDebtPaymentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [debts, setDebts] = useState<GuestDebt[]>([]);
  const [selectedDebtId, setSelectedDebtId] = useState<string>("");

  // Payment form fields
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [billingCountry, setBillingCountry] = useState("United States");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [billingState, setBillingState] = useState("");

  useEffect(() => {
    if (open && user) {
      fetchDebts();
    }
  }, [open, user]);

  const fetchDebts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("guest_debts")
        .select(`
          *,
          disputes (
            id,
            category,
            description,
            subject
          ),
          bookings (
            id,
            checkin_date,
            checkout_date,
            listings (
              title
            )
          )
        `)
        .eq("guest_user_id", user?.id)
        .eq("status", "outstanding")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDebts(data || []);
      if (data && data.length > 0) {
        setSelectedDebtId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching debts:", error);
      toast({
        title: "Error",
        description: "Failed to load debt information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const limited = cleaned.substring(0, 16);
    const formatted = limited.match(/.{1,4}/g)?.join(" ") || limited;
    return formatted;
  };

  const formatExpirationDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + (cleaned.length > 2 ? "/" + cleaned.substring(2, 4) : "");
    }
    return cleaned;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDebtId) {
      toast({
        title: "Error",
        description: "Please select a debt to pay",
        variant: "destructive",
      });
      return;
    }

    const selectedDebt = debts.find((d) => d.id === selectedDebtId);
    if (!selectedDebt) return;

    setSubmitting(true);

    try {
      const { data: result, error } = await supabase.rpc("process_guest_debt_payment", {
        p_guest_debt_id: selectedDebtId,
        p_payment_amount: selectedDebt.amount,
        p_payment_currency: selectedDebt.currency,
        p_payment_provider: "stripe",
      });

      if (error) throw error;

      const typedResult = result as { success: boolean; error?: string };
      if (!typedResult?.success) {
        throw new Error(typedResult?.error || "Failed to process payment");
      }

      toast({
        title: "Payment Successful",
        description: "Your debt has been paid. You can now make new bookings.",
      });

      onOpenChange(false);
      onPaymentSuccess?.();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDebt = debts.find((d) => d.id === selectedDebtId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Pay Outstanding Debt</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : debts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Outstanding Debts</p>
            <p className="text-sm text-muted-foreground mt-2">
              You don't have any outstanding debts at the moment.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Debt Information */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <h3 className="text-lg font-semibold">Account Restriction</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Your account is restricted due to outstanding debt. You must pay this debt before making new bookings.
                </p>

                {debts.length > 1 && (
                  <div className="mb-4">
                    <FormSelect
                      label="Select Debt to Pay"
                      value={selectedDebtId}
                      onChange={setSelectedDebtId}
                      options={debts.map((debt) => ({
                        value: debt.id,
                        label: `$${debt.amount.toFixed(2)} - ${debt.disputes?.subject || 'Booking'}`
                      }))}
                      required
                    />
                  </div>
                )}

                {selectedDebt && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount Due</span>
                        <span className="font-semibold text-lg text-destructive">
                          ${selectedDebt.amount.toFixed(2)} {selectedDebt.currency}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reason</span>
                        <span className="font-medium">{selectedDebt.disputes?.category?.replace(/_/g, " ") || selectedDebt.reason}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Booking</span>
                        <span className="font-medium">{selectedDebt.bookings?.id.substring(0, 8) || "N/A"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Property</span>
                        <span className="font-medium">{selectedDebt.bookings?.listings?.title || "N/A"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Created</span>
                        <span>{format(new Date(selectedDebt.created_at), "MMM dd, yyyy")}</span>
                      </div>
                      {selectedDebt.expires_at && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Expires</span>
                          <span className="text-destructive">
                            {format(new Date(selectedDebt.expires_at), "MMM dd, yyyy")}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedDebt.disputes?.description && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <p className="text-sm font-medium mb-2">Dispute Details</p>
                          <p className="text-sm text-muted-foreground">{selectedDebt.disputes.description}</p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </Card>
            </div>

            {/* Right Column - Payment Form */}
            <div>
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Payment Information</h3>
                </div>

                <form onSubmit={handlePayment} className="space-y-6">
                  <FormInput
                    label="Cardholder Name"
                    value={cardholderName}
                    onChange={setCardholderName}
                    required
                  />

                  <FormInput
                    label="Card Number"
                    value={cardNumber}
                    onChange={(value) => setCardNumber(formatCardNumber(value))}
                    pattern="[0-9 ]*"
                    maxLength={19}
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormInput
                      label="Expiration Date"
                      placeholder="MM/YY"
                      value={expirationDate}
                      onChange={(value) => setExpirationDate(formatExpirationDate(value))}
                      pattern="[0-9/]*"
                      maxLength={5}
                      required
                    />

                    <FormInput
                      label="CVC"
                      type="password"
                      value={cvc}
                      onChange={(value) => {
                        const cleaned = value.replace(/\D/g, "");
                        if (cleaned.length <= 4) {
                          setCvc(cleaned);
                        }
                      }}
                      pattern="[0-9]*"
                      maxLength={4}
                      required
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Billing Address</h4>

                    <FormSelect
                      label="Country/Region"
                      value={billingCountry}
                      onChange={setBillingCountry}
                      options={[
                        { value: "United States", label: "United States" },
                        { value: "Canada", label: "Canada" },
                        { value: "United Kingdom", label: "United Kingdom" },
                        { value: "Australia", label: "Australia" }
                      ]}
                      required
                    />

                    <FormInput label="Address Line 1" value={addressLine1} onChange={setAddressLine1} required />

                    <FormInput label="Address Line 2 (Optional)" value={addressLine2} onChange={setAddressLine2} />

                    <div className="grid grid-cols-2 gap-4">
                      <FormInput label="City" value={city} onChange={setCity} required />
                      <FormInput label="State/Province" value={billingState} onChange={setBillingState} required />
                    </div>

                    <FormInput label="Postal Code" value={postalCode} onChange={setPostalCode} required />
                  </div>

                  <Button type="submit" className="w-full h-12 text-base rounded-full" disabled={submitting || !selectedDebt}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      `Pay $${selectedDebt?.amount.toFixed(2) || "0.00"} Now`
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Your payment will be processed securely. Once paid, your account restriction will be lifted immediately.
                  </p>
                </form>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GuestDebtPaymentDialog;
