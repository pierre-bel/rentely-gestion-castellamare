import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEuro } from "@/lib/utils";
import { format } from "date-fns";

interface OverdueItem {
  id: string;
  label: string;
  amount: number;
  due_date: string;
  tenant_name: string;
  listing_title: string;
}

interface DashboardOverduePaymentsProps {
  userId: string;
}

export default function DashboardOverduePayments({ userId }: DashboardOverduePaymentsProps) {
  const today = new Date().toISOString().split("T")[0];

  const { data: overdueItems, isLoading } = useQuery({
    queryKey: ["dashboard-overdue-payments", userId],
    queryFn: async () => {
      // Get all unpaid payment items with due_date < today for this host's bookings
      const { data, error } = await supabase
        .from("booking_payment_items")
        .select(`
          id, label, amount, due_date,
          bookings!inner (
            id, checkin_date, checkout_date, pricing_breakdown, guest_user_id,
            listings!inner ( id, title, host_user_id )
          )
        `)
        .eq("is_paid", false)
        .lt("due_date", today)
        .eq("bookings.listings.host_user_id", userId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      if (!data) return [];

      // Collect tenant info
      const results: OverdueItem[] = [];
      for (const item of data as any[]) {
        const booking = item.bookings;
        const listing = booking?.listings;
        const pricingBreakdown = booking?.pricing_breakdown as Record<string, unknown> | null;
        const tenantId = pricingBreakdown?.tenant_id as string | undefined;

        let tenantName = "Locataire";
        if (tenantId) {
          const { data: tenant } = await supabase
            .from("tenants" as any)
            .select("first_name, last_name")
            .eq("id", tenantId)
            .single();
          if (tenant) {
            tenantName = `${(tenant as any).first_name || ""} ${(tenant as any).last_name || ""}`.trim();
          }
        }
        if (tenantName === "Locataire") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", booking.guest_user_id)
            .single();
          if (profile) {
            tenantName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Locataire";
          }
        }

        results.push({
          id: item.id,
          label: item.label,
          amount: item.amount,
          due_date: item.due_date,
          tenant_name: tenantName,
          listing_title: listing?.title || "",
        });
      }
      return results;
    },
  });

  if (isLoading || !overdueItems || overdueItems.length === 0) return null;

  const total = overdueItems.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="mb-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Paiements en retard
          <Badge variant="destructive">{overdueItems.length}</Badge>
        </h4>
        <span className="text-sm font-bold text-destructive">{formatEuro(total)}</span>
      </div>
      <div className="space-y-1.5">
        {overdueItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2.5 rounded-lg border border-destructive/20 bg-background"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{item.tenant_name}</p>
                <span className="text-xs text-muted-foreground">·</span>
                <p className="text-xs text-muted-foreground truncate">{item.listing_title}</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs text-destructive font-medium">
                  Dû le {format(new Date(item.due_date), "dd/MM/yyyy")}
                </span>
              </div>
            </div>
            <span className="text-sm font-bold text-destructive whitespace-nowrap">
              {formatEuro(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
