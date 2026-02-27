import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, ArrowUpCircle, Wallet } from "lucide-react";

interface EarningsSummaryCardsProps {
  totalGrossRevenue: number;
  averageRate: number;
  actualNetRevenue: number;
  occupancyRate: number;
  isLoading: boolean;
}

const EarningsSummaryCards = ({
  totalGrossRevenue,
  averageRate,
  actualNetRevenue,
  occupancyRate,
  isLoading,
}: EarningsSummaryCardsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const cards = [
    {
      label: "Occupancy Rate",
      value: occupancyRate,
      format: "percentage",
      icon: TrendingUp,
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Average Rate",
      value: averageRate,
      format: "currency",
      icon: DollarSign,
      bgColor: "bg-green-500/10",
      iconColor: "text-green-600",
    },
    {
      label: "Total Gross Revenue",
      value: totalGrossRevenue,
      format: "currency",
      icon: ArrowUpCircle,
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-600",
    },
    {
      label: "Actual Net Revenue",
      value: actualNetRevenue,
      format: "currency",
      icon: Wallet,
      bgColor: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <Card key={card.label} className="border-b bg-gray-50/50 hover:bg-muted/50 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-9 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold">
                    {card.format === "currency"
                      ? formatCurrency(card.value)
                      : `${card.value.toFixed(1)}%`}
                  </p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-full`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default EarningsSummaryCards;
