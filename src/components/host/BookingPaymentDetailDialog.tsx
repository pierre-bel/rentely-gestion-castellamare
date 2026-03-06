import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { PaymentItem } from "./HostPaymentsBookingsList";

interface BookingInfo {
  id: string;
  listing_title: string;
  tenant_name: string;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
  currency: string | null;
  pricing_breakdown: any;
  payment_items: PaymentItem[];
}

interface Props {
  booking: BookingInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingPaymentDetailDialog({ booking, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  if (!booking) return null;

  const paidTotal = booking.payment_items.filter(i => i.is_paid).reduce((s, i) => s + i.amount, 0);
  const remaining = booking.total_price - paidTotal;

  const handleTogglePaid = async (item: PaymentItem) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("booking_payment_items")
        .update({
          is_paid: !item.is_paid,
          paid_at: !item.is_paid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["host-payments-bookings"] });
      toast({ title: item.is_paid ? "Marqué comme non payé" : "Marqué comme payé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détail des paiements</DialogTitle>
        </DialogHeader>

        {/* Booking info */}
        <div className="space-y-1 text-sm">
          <p><span className="font-medium">Bien :</span> {booking.listing_title}</p>
          <p><span className="font-medium">Locataire :</span> {booking.tenant_name}</p>
          <p><span className="font-medium">Dates :</span> {format(new Date(booking.checkin_date), "dd/MM/yyyy")} → {format(new Date(booking.checkout_date), "dd/MM/yyyy")}</p>
          <p><span className="font-medium">Total :</span> {booking.total_price.toFixed(2)} €</p>
        </div>

        <Separator />

        {/* Payment summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Encaissé</p>
            <p className="text-lg font-bold text-green-600">{paidTotal.toFixed(2)} €</p>
          </div>
          <div>
            <p className="text-muted-foreground">Restant</p>
            <p className="text-lg font-bold text-amber-600">{remaining.toFixed(2)} €</p>
          </div>
        </div>

        <Separator />

        {/* Payment items list */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Échéances de paiement</p>
          {booking.payment_items.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune échéance configurée</p>
          )}
          {booking.payment_items.map(item => {
            const isLate = !item.is_paid && item.due_date && item.due_date < today;
            return (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isLate ? "border-destructive/50 bg-destructive/5" : "bg-card"}`}>
                <Checkbox
                  checked={item.is_paid}
                  onCheckedChange={() => handleTogglePaid(item)}
                  disabled={saving}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${item.is_paid ? "line-through text-muted-foreground" : ""}`}>
                      {item.label}
                    </p>
                    <span className="text-sm font-semibold ml-auto">{item.amount.toFixed(2)} €</span>
                  </div>
                  {item.due_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Échéance : {format(new Date(item.due_date + "T00:00:00"), "dd/MM/yyyy")}
                    </p>
                  )}
                  {isLate && (
                    <span className="text-xs text-destructive flex items-center gap-0.5 mt-0.5">
                      <AlertTriangle className="h-3 w-3" /> En retard
                    </span>
                  )}
                  {item.is_paid && item.paid_at && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Payé le {format(new Date(item.paid_at), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
