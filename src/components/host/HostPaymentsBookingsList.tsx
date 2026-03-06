import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eye, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { BookingPaymentDetailDialog } from "./BookingPaymentDetailDialog";

interface BookingWithPayments {
  id: string;
  listing_id: string;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
  currency: string | null;
  status: string | null;
  notes: string | null;
  pricing_breakdown: any;
  listing_title: string;
  tenant_name: string;
  payment_items: PaymentItem[];
}

export interface PaymentItem {
  id: string;
  booking_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
  sort_order: number;
}

type PaymentStatus = "unpaid" | "partial" | "paid" | "late";

function getPaymentStatus(items: PaymentItem[], totalPrice: number): PaymentStatus {
  if (items.length === 0) return "unpaid";
  const today = new Date().toISOString().split("T")[0];
  const paidCount = items.filter(i => i.is_paid).length;
  if (paidCount === items.length) return "paid";
  
  // Check overdue
  const hasLate = items.some(i => !i.is_paid && i.due_date && i.due_date < today);
  if (hasLate) return "late";
  
  if (paidCount > 0) return "partial";
  return "unpaid";
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Payé</Badge>;
    case "partial":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Acompte payé</Badge>;
    case "late":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 animate-pulse gap-1"><AlertTriangle className="h-3 w-3" />En retard</Badge>;
    case "unpaid":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Non payé</Badge>;
  }
}

export function HostPaymentsBookingsList() {
  const { user } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithPayments | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["host-payments-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch bookings for host's listings + manual bookings (guest_user_id = host)
      const { data: bookingsData, error: bErr } = await supabase
        .from("bookings")
        .select(`
          id, listing_id, checkin_date, checkout_date, total_price, currency, status, notes, pricing_breakdown,
          listings!inner(title, host_user_id)
        `)
        .eq("listings.host_user_id", user.id)
        .in("status", ["confirmed", "completed", "pending_payment"])
        .order("checkin_date", { ascending: false });

      if (bErr) throw bErr;

      const bookingIds = (bookingsData || []).map(b => b.id);

      // Fetch payment items for all bookings
      let paymentItemsMap: Record<string, PaymentItem[]> = {};
      if (bookingIds.length > 0) {
        const { data: items, error: pErr } = await supabase
          .from("booking_payment_items")
          .select("*")
          .in("booking_id", bookingIds)
          .order("sort_order");
        if (pErr) throw pErr;
        for (const item of (items || [])) {
          if (!paymentItemsMap[item.booking_id]) paymentItemsMap[item.booking_id] = [];
          paymentItemsMap[item.booking_id].push(item as PaymentItem);
        }
      }

      // Fetch tenant names
      const tenantIds = (bookingsData || [])
        .map(b => {
          const pb = b.pricing_breakdown as any;
          return pb?.tenant_id;
        })
        .filter(Boolean);

      let tenantMap: Record<string, string> = {};
      if (tenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from("tenants")
          .select("id, first_name, last_name")
          .in("id", tenantIds);
        for (const t of (tenants || [])) {
          tenantMap[t.id] = `${t.first_name} ${t.last_name || ""}`.trim();
        }
      }

      return (bookingsData || []).map(b => {
        const pb = b.pricing_breakdown as any;
        const listing = b.listings as any;
        return {
          id: b.id,
          listing_id: b.listing_id,
          checkin_date: b.checkin_date,
          checkout_date: b.checkout_date,
          total_price: b.total_price,
          currency: b.currency,
          status: b.status,
          notes: b.notes,
          pricing_breakdown: pb,
          listing_title: listing?.title || "—",
          tenant_name: pb?.tenant_id ? (tenantMap[pb.tenant_id] || "—") : "—",
          payment_items: paymentItemsMap[b.id] || [],
        } as BookingWithPayments;
      });
    },
    enabled: !!user?.id,
  });

  const handleView = (booking: BookingWithPayments) => {
    setSelectedBooking(booking);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Aucune réservation trouvée</p>
        </CardContent>
      </Card>
    );
  }

  // Summary cards
  const totalRevenue = bookings.reduce((s, b) => s + b.total_price, 0);
  const paidTotal = bookings
    .filter(b => getPaymentStatus(b.payment_items, b.total_price) === "paid")
    .reduce((s, b) => s + b.total_price, 0);
  const pendingTotal = totalRevenue - paidTotal;

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total attendu</p>
            <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Encaissé</p>
            <p className="text-2xl font-bold text-green-600">{paidTotal.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="text-2xl font-bold text-amber-600">{pendingTotal.toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Bien</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Statut paiement</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map(booking => {
                  const status = getPaymentStatus(booking.payment_items, booking.total_price);
                  return (
                    <TableRow key={booking.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium max-w-[200px] truncate">{booking.listing_title}</TableCell>
                      <TableCell>{booking.tenant_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(booking.checkin_date), "dd/MM/yyyy")}</div>
                          <div className="text-muted-foreground">{format(new Date(booking.checkout_date), "dd/MM/yyyy")}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {booking.total_price.toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={status} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleView(booking)} className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <BookingPaymentDetailDialog
        booking={selectedBooking}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
