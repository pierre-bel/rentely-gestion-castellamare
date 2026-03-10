import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatEuro } from "@/lib/utils";
import type { PaymentItem } from "./HostPaymentsBookingsList";

interface BookingWithPayments {
  id: string;
  listing_title: string;
  tenant_name: string;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
  pricing_breakdown: any;
  payment_items: PaymentItem[];
}

interface OverdueItem {
  bookingId: string;
  listingTitle: string;
  tenantName: string;
  checkinDate: string;
  checkoutDate: string;
  label: string;
  amount: number;
  dueDate: string;
  type: "deposit" | "balance";
  pricingBreakdown: any;
}

function classifyOverdueItems(bookings: BookingWithPayments[]): OverdueItem[] {
  const today = new Date().toISOString().split("T")[0];
  const items: OverdueItem[] = [];

  for (const booking of bookings) {
    for (const item of booking.payment_items) {
      if (!item.is_paid && item.due_date && item.due_date < today) {
        const labelLower = item.label.toLowerCase();
        const isDeposit = labelLower.includes("acompte") || labelLower.includes("dépôt") || item.sort_order === 0;
        items.push({
          bookingId: booking.id,
          listingTitle: booking.listing_title,
          tenantName: booking.tenant_name,
          checkinDate: booking.checkin_date,
          checkoutDate: booking.checkout_date,
          label: item.label,
          amount: item.amount,
          dueDate: item.due_date,
          type: isDeposit ? "deposit" : "balance",
          pricingBreakdown: booking.pricing_breakdown,
        });
      }
    }
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

interface Props {
  bookings: BookingWithPayments[];
  onViewBooking: (booking: BookingWithPayments) => void;
}

export function OverduePaymentsList({ bookings, onViewBooking }: Props) {
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const overdueItems = classifyOverdueItems(bookings);
  const overdueDeposits = overdueItems.filter(i => i.type === "deposit");
  const overdueBalances = overdueItems.filter(i => i.type === "balance");

  if (overdueItems.length === 0) return null;

  const handleSendReminder = async (item: OverdueItem) => {
    const key = `${item.bookingId}-${item.label}`;
    setSendingId(key);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          action: "send_reminder",
          booking_id: item.bookingId,
          payment_label: item.label,
          payment_amount: item.amount,
          due_date: item.dueDate,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Rappel envoyé", description: `E-mail de rappel envoyé pour "${item.label}"` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible d'envoyer le rappel", variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  const findBooking = (bookingId: string) => bookings.find(b => b.id === bookingId);

  const renderSection = (title: string, items: OverdueItem[], badgeColor: string) => {
    if (items.length === 0) return null;
    const total = items.reduce((s, i) => s + i.amount, 0);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {title}
            <Badge variant="outline" className={badgeColor}>{items.length}</Badge>
          </h4>
          <span className="text-sm font-bold text-destructive">{formatEuro(total)}</span>
        </div>
        <div className="space-y-1.5">
          {items.map((item) => {
            const key = `${item.bookingId}-${item.label}`;
            const isSending = sendingId === key;
            const booking = findBooking(item.bookingId);
            return (
              <div
                key={key}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors"
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => booking && onViewBooking(booking)}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.tenantName}</p>
                    <span className="text-xs text-muted-foreground">·</span>
                    <p className="text-xs text-muted-foreground truncate">{item.listingTitle}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs text-destructive font-medium">
                      Dû le {format(new Date(item.dueDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Séjour : {format(new Date(item.checkinDate), "dd/MM/yyyy")} → {format(new Date(item.checkoutDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-destructive whitespace-nowrap">{formatEuro(item.amount)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
                  onClick={() => handleSendReminder(item)}
                  disabled={isSending}
                >
                  {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Rappel</span>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-destructive/30 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Paiements en retard
          <Badge variant="destructive" className="animate-pulse">{overdueItems.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSection("Acomptes en retard", overdueDeposits, "bg-amber-100 text-amber-700 border-amber-200")}
        {renderSection("Soldes en retard", overdueBalances, "bg-red-100 text-red-700 border-red-200")}
      </CardContent>
    </Card>
  );
}
