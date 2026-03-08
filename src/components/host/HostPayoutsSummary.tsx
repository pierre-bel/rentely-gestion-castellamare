import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpCircle, Clock, AlertCircle, Wallet } from "lucide-react";
import { HostPayout } from "./types/financial";

interface HostPayoutsSummaryProps {
  payouts: HostPayout[];
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);

export function HostPayoutsSummary({ payouts }: HostPayoutsSummaryProps) {
  const grossRevenue = payouts
    .reduce((sum, p) => {
      if (p.transaction_type === 'booking_payout') {
        return sum + (p.gross_revenue || 0);
      }
      if (['cancelled', 'debt_collection'].includes(p.transaction_type)) {
        return sum + p.amount;
      }
      return sum;
    }, 0);

  const pendingPayouts = payouts
    .filter(p => {
      if (['booking_payout', 'cancelled'].includes(p.transaction_type)) {
        return p.status === 'pending';
      }
      if (p.transaction_type === 'debt_collection') {
        return p.status === 'pending_guest_payment';
      }
      return false;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingDebts = payouts
    .filter(p => p.amount < 0 && !['settled', 'applied_to_debt', 'cancelled'].includes(p.status))
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);

  const netRevenue = payouts
    .filter(p => ['cancelled', 'booking_payout', 'debt_collection'].includes(p.transaction_type))
    .reduce((sum, p) => sum + p.amount, 0);

  const summaryCards = [
    {
      title: "Revenus bruts",
      value: grossRevenue,
      icon: ArrowUpCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Versements en attente",
      value: pendingPayouts,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Dettes en cours",
      value: outstandingDebts,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Revenus nets",
      value: netRevenue,
      icon: Wallet,
      color: netRevenue >= 0 ? "text-emerald-600" : "text-red-600",
      bgColor: netRevenue >= 0 ? "bg-emerald-50" : "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {summaryCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatPrice(card.value)}
                  </p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-full`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
