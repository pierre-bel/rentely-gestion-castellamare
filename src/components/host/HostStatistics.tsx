import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Calendar, DollarSign, BarChart3 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface StatRow {
  month: number;
  listing_id: string;
  listing_title: string;
  booked_nights: number;
  available_nights: number;
  occupancy_rate: number;
  revenue: number;
  adr: number;
  revpar: number;
}

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const HostStatistics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<StatRow[]>([]);
  const [prevData, setPrevData] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingFilter, setListingFilter] = useState("all");
  const [showPrev, setShowPrev] = useState(false);

  const fetchStats = async (y: number) => {
    if (!user) return [];
    const { data: d, error } = await supabase.rpc("get_host_statistics", {
      _host_user_id: user.id,
      _year: y,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return [];
    }
    return (d as StatRow[]) || [];
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cur, prev] = await Promise.all([fetchStats(year), fetchStats(year - 1)]);
      setData(cur);
      setPrevData(prev);
      setLoading(false);
    })();
  }, [user, year]);

  const listings = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((r) => map.set(r.listing_id, r.listing_title));
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [data]);

  const filtered = useMemo(
    () => data.filter((r) => listingFilter === "all" || r.listing_id === listingFilter),
    [data, listingFilter]
  );
  const filteredPrev = useMemo(
    () => prevData.filter((r) => listingFilter === "all" || r.listing_id === listingFilter),
    [prevData, listingFilter]
  );

  // Aggregate by month
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const rows = filtered.filter((r) => r.month === month);
      const prevRows = filteredPrev.filter((r) => r.month === month);
      const totalBooked = rows.reduce((s, r) => s + Number(r.booked_nights), 0);
      const totalAvailable = rows.reduce((s, r) => s + Number(r.available_nights), 0);
      const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
      const prevBooked = prevRows.reduce((s, r) => s + Number(r.booked_nights), 0);
      const prevAvailable = prevRows.reduce((s, r) => s + Number(r.available_nights), 0);
      const prevRevenue = prevRows.reduce((s, r) => s + Number(r.revenue), 0);
      return {
        name: MONTH_LABELS[i],
        occupancy: totalAvailable > 0 ? Math.round((totalBooked / totalAvailable) * 1000) / 10 : 0,
        revenue: totalRevenue,
        adr: totalBooked > 0 ? Math.round((totalRevenue / totalBooked) * 100) / 100 : 0,
        revpar: totalAvailable > 0 ? Math.round((totalRevenue / totalAvailable) * 100) / 100 : 0,
        prevOccupancy: prevAvailable > 0 ? Math.round((prevBooked / prevAvailable) * 1000) / 10 : 0,
        prevRevenue: prevRevenue,
        bookedNights: totalBooked,
      };
    });
  }, [filtered, filteredPrev]);

  // KPIs
  const kpis = useMemo(() => {
    const totalBooked = monthlyData.reduce((s, m) => s + m.bookedNights, 0);
    const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
    const totalAvailable = filtered.reduce((s, r) => s + Number(r.available_nights), 0);
    const avgOccupancy = totalAvailable > 0 ? Math.round((totalBooked / totalAvailable) * 1000) / 10 : 0;
    const avgAdr = totalBooked > 0 ? Math.round((totalRevenue / totalBooked) * 100) / 100 : 0;
    const avgRevpar = totalAvailable > 0 ? Math.round((totalRevenue / totalAvailable) * 100) / 100 : 0;
    return { avgOccupancy, avgAdr, avgRevpar, totalBooked };
  }, [monthlyData, filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Taux d'occupation", value: `${kpis.avgOccupancy}%`, icon: BarChart3 },
          { label: "ADR", value: `${kpis.avgAdr.toFixed(0)} €`, icon: DollarSign },
          { label: "RevPAR", value: `${kpis.avgRevpar.toFixed(0)} €`, icon: TrendingUp },
          { label: "Nuits réservées", value: String(kpis.totalBooked), icon: Calendar },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <kpi.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={listingFilter} onValueChange={setListingFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Tous les biens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les biens</SelectItem>
            {listings.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={showPrev} onCheckedChange={setShowPrev} id="compare" />
          <Label htmlFor="compare" className="text-sm">Comparer N-1</Label>
        </div>
      </div>

      {/* Occupancy Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Taux d'occupation mensuel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis unit="%" className="text-xs" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="occupancy" name={String(year)} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              {showPrev && (
                <Line type="monotone" dataKey="prevOccupancy" name={String(year - 1)} stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenus mensuels</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(value: number) => `${value.toFixed(0)} €`} />
              <Legend />
              <Bar dataKey="revenue" name={String(year)} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              {showPrev && (
                <Bar dataKey="prevRevenue" name={String(year - 1)} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default HostStatistics;
