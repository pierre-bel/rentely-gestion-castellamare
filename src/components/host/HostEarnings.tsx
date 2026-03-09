import { useEffect, useState } from "react";
import { selectByOwner, selectWhereIn } from "@/lib/supabase-helpers";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EarningsData {
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  averagePerBooking: number;
}

interface BookingEarning {
  id: string;
  total_price: number;
  checkin_date: string;
  listing_id: string;
  listing_title: string;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);

export default function HostEarnings() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    averagePerBooking: 0,
  });
  const [recentEarnings, setRecentEarnings] = useState<BookingEarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, [user]);

  const fetchEarnings = async () => {
    if (!user) return;

    const { data: listings } = await selectByOwner(
      "listings", "host_user_id", user.id,
      { select: "id, title" }
    );

    if (!listings || listings.length === 0) {
      setLoading(false);
      return;
    }

    const listingIds = listings.map((l: any) => l.id);

    const { data: bookings } = await selectWhereIn(
      "bookings", "listing_id", listingIds,
      { order: "checkin_date", ascending: false }
    );

    if (bookings) {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const totalEarnings = bookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
      const thisMonth = bookings
        .filter(b => new Date(b.checkin_date) >= thisMonthStart)
        .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
      const lastMonth = bookings
        .filter(b => {
          const date = new Date(b.checkin_date);
          return date >= lastMonthStart && date < thisMonthStart;
        })
        .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

      const avgPerBooking = bookings.length > 0 ? totalEarnings / bookings.length : 0;

      setEarnings({ totalEarnings, thisMonth, lastMonth, averagePerBooking: avgPerBooking });

      const recent = bookings.slice(0, 10).map(b => ({
        id: b.id,
        total_price: Number(b.total_price || 0),
        checkin_date: b.checkin_date,
        listing_id: b.listing_id,
        listing_title: listings.find(l => l.id === b.listing_id)?.title || "Inconnu",
      }));

      setRecentEarnings(recent);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenus totaux</p>
                <p className="text-2xl font-bold">{formatPrice(earnings.totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ce mois-ci</p>
                <p className="text-2xl font-bold">{formatPrice(earnings.thisMonth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mois précédent</p>
                <p className="text-2xl font-bold">{formatPrice(earnings.lastMonth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moy. par réservation</p>
                <p className="text-2xl font-bold">{formatPrice(earnings.averagePerBooking)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenus récents</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEarnings.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun revenu</h3>
              <p className="text-muted-foreground">Vos revenus apparaîtront ici une fois que vous aurez des réservations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEarnings.map(earning => (
                <div key={earning.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{earning.listing_title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(earning.checkin_date), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-success">
                    +{formatPrice(earning.total_price)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
