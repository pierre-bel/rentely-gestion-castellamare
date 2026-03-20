import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Mail, Phone, MapPin, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tenant } from "./HostTenants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmée", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  completed: { label: "Terminée", className: "bg-muted/50 text-muted-foreground border-muted-foreground/20" },
  pending_payment: { label: "En attente", className: "bg-amber-100 text-amber-700 border-amber-200" },
  pre_reservation: { label: "Pré-résa", className: "bg-blue-100 text-blue-700 border-blue-200" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function TenantDetailDialog({ open, onOpenChange, tenant }: Props) {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["tenant-bookings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, checkin_date, checkout_date, nights, total_price, status, listing_id, pricing_breakdown, listings!bookings_listing_id_fkey(title)")
        .not("status", "eq", "owner_blocked");

      if (error) throw error;

      // Filter client-side by tenant_id in pricing_breakdown
      return (data || [])
        .filter((b: any) => {
          const pb = b.pricing_breakdown as any;
          return pb?.tenant_id === tenant.id;
        })
        .sort((a: any, b: any) => b.checkin_date.localeCompare(a.checkin_date));
    },
    enabled: !!tenant?.id && open,
  });

  if (!tenant) return null;

  const fullAddress = [
    tenant.street_number,
    tenant.street,
    tenant.postal_code,
    tenant.city,
    tenant.country,
  ].filter(Boolean).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {tenant.first_name} {tenant.last_name}
          </DialogTitle>
        </DialogHeader>

        {/* Tenant Info */}
        <div className="space-y-2 text-sm">
          {tenant.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              {tenant.email}
            </div>
          )}
          {tenant.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              {tenant.phone}
            </div>
          )}
          {fullAddress && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {fullAddress}
            </div>
          )}
          {tenant.notes && (
            <p className="text-muted-foreground italic mt-1">{tenant.notes}</p>
          )}
        </div>

        {/* Bookings */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Réservations ({bookings.length})
          </h3>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune réservation trouvée</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background">
                    <TableHead className="font-semibold">Bien</TableHead>
                    <TableHead className="font-semibold">Dates</TableHead>
                    <TableHead className="font-semibold">Nuits</TableHead>
                    <TableHead className="font-semibold">Montant</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking: any, i: number) => {
                    const listing = booking.listings;
                    const st = statusLabels[booking.status] || { label: booking.status, className: "" };
                    return (
                      <TableRow key={booking.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium text-sm">{listing?.title || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(booking.checkin_date), "dd MMM yyyy", { locale: fr })} → {format(new Date(booking.checkout_date), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-sm">{booking.nights}</TableCell>
                        <TableCell className="text-sm tabular-nums">{Number(booking.total_price).toFixed(2)} €</TableCell>
                        <TableCell>
                          <Badge className={`${st.className} hover:${st.className} text-[11px]`}>{st.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
