import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2, User, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { TenantDetailDialog } from "./TenantDetailDialog";
import { BookingDetailDialog, type BookingDetailData } from "./BookingDetailDialog";
import type { Tenant } from "./HostTenants";

interface SearchResult {
  type: "booking" | "tenant";
  id: string;
  title: string;
  subtitle: string;
  raw?: any;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailData | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !user?.id) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [bookingsRes, tenantsRes] = await Promise.all([
        supabase.rpc("host_search_bookings", {
          host_id: user.id,
          search_query: q,
          status_filter: null,
          min_price: null,
          max_price: null,
          checkin_start: null,
          checkin_end: null,
          checkout_start: null,
          checkout_end: null,
          sort_by: "checkin_date",
          sort_order: "desc",
        }),
        supabase
          .from("tenants")
          .select("id, first_name, last_name, email, phone, gender, street, street_number, postal_code, city, country, notes")
          .eq("host_user_id", user.id)
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(5),
      ]);

      const items: SearchResult[] = [];

      if (tenantsRes.data) {
        tenantsRes.data.forEach((t: any) => {
          items.push({
            type: "tenant",
            id: t.id,
            title: `${t.first_name || ""} ${t.last_name || ""}`.trim() || t.email || "Locataire",
            subtitle: t.email || t.phone || "",
            raw: t,
          });
        });
      }

      if (bookingsRes.data) {
        (bookingsRes.data as any[]).slice(0, 5).forEach((b: any) => {
          items.push({
            type: "booking",
            id: b.id,
            title: `${b.guest_name || b.guest_email || "Réservation"}`,
            subtitle: `${b.listing_title} · ${format(parseISO(b.checkin_date), "d MMM yyyy", { locale: fr })} → ${format(parseISO(b.checkout_date), "d MMM yyyy", { locale: fr })}`,
            raw: b,
          });
        });
      }

      setResults(items);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, open, search]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    if (result.type === "tenant") {
      setSelectedTenant(result.raw as Tenant);
      setTenantDialogOpen(true);
    } else {
      // Build BookingDetailData from search result
      const b = result.raw;
      const bookingData: BookingDetailData = {
        id: b.id,
        listing_id: b.listing_id,
        listing_title: b.listing_title,
        checkin_date: b.checkin_date,
        checkout_date: b.checkout_date,
        checkin_time: null,
        checkout_time: null,
        nights: b.nights,
        guests: b.guests,
        total_price: Number(b.host_payout_gross) || 0,
        cleaning_fee: null,
        notes: null,
        status: b.status,
        pricing_breakdown: null,
        guest_name: b.guest_name || "",
        guest_email: b.guest_email || "",
        guest_phone: null,
      };
      setSelectedBooking(bookingData);
      setBookingDialogOpen(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechercher</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, e-mail, téléphone..."
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && query.trim() && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun résultat</p>
            )}
            {!loading && results.length > 0 && (
              <div className="space-y-1">
                {results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 text-left transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {r.type === "tenant" ? (
                        <User className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TenantDetailDialog
        open={tenantDialogOpen}
        onOpenChange={setTenantDialogOpen}
        tenant={selectedTenant}
      />

      <BookingDetailDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        booking={selectedBooking}
        onEdit={() => {}}
      />
    </>
  );
}
