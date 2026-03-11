import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Search } from "lucide-react";
import { format } from "date-fns";
import { formatEuro } from "@/lib/utils";
import { BookingPaymentDetailDialog } from "./BookingPaymentDetailDialog";
import { OverduePaymentsList } from "./OverduePaymentsList";

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

type PaymentStatus = "overdue" | "unpaid" | "partial" | "paid";

function getPaymentStatus(items: PaymentItem[]): PaymentStatus {
  if (items.length === 0) return "unpaid";
  const today = new Date().toISOString().split("T")[0];
  const hasOverdue = items.some(i => !i.is_paid && i.due_date && i.due_date < today);
  const paidCount = items.filter(i => i.is_paid).length;
  if (hasOverdue) return "overdue";
  if (paidCount === 0) return "unpaid";
  if (paidCount === items.length) return "paid";
  return "partial";
}

function getOverdueAmount(items: PaymentItem[]): number {
  const today = new Date().toISOString().split("T")[0];
  return items
    .filter(i => !i.is_paid && i.due_date && i.due_date < today)
    .reduce((s, i) => s + i.amount, 0);
}

const STATUS_ORDER: Record<PaymentStatus, number> = { overdue: 0, unpaid: 1, partial: 2, paid: 3 };

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Payé</Badge>;
    case "partial":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Acompte payé</Badge>;
    case "unpaid":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Non payé</Badge>;
    case "overdue":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 animate-pulse">En retard</Badge>;
  }
}

export function HostPaymentsBookingsList() {
  const { user } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithPayments | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOverdue, setFilterOverdue] = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["host-payments-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

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

      const tenantIds = (bookingsData || [])
        .map(b => (b.pricing_breakdown as any)?.tenant_id)
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

  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    let filtered = q
      ? bookings.filter(b =>
          b.tenant_name.toLowerCase().includes(q) ||
          b.listing_title.toLowerCase().includes(q)
        )
      : bookings;

    if (filterOverdue) {
      filtered = filtered.filter(b => getPaymentStatus(b.payment_items) === "overdue");
    }

    return [...filtered].sort((a, b) => {
      const sa = STATUS_ORDER[getPaymentStatus(a.payment_items)];
      const sb = STATUS_ORDER[getPaymentStatus(b.payment_items)];
      return sa - sb;
    });
  }, [bookings, search, filterOverdue]);

  // Keep selectedBooking in sync after data refetch
  const selectedId = selectedBooking?.id;
  const syncedBooking = selectedId ? bookings.find(b => b.id === selectedId) ?? selectedBooking : selectedBooking;
  if (syncedBooking !== selectedBooking && syncedBooking) {
    setSelectedBooking(syncedBooking);
  }

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

  const totalRevenue = bookings.reduce((s, b) => s + b.total_price, 0);
  const paidTotal = bookings
    .flatMap(b => b.payment_items)
    .filter(i => i.is_paid)
    .reduce((s, i) => s + i.amount, 0);
  const overdueTotal = bookings.reduce((s, b) => s + getOverdueAmount(b.payment_items), 0);
  const pendingTotal = totalRevenue - paidTotal;

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-muted-foreground">Total attendu</p>
            <p className="text-lg md:text-2xl font-bold">{formatEuro(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-muted-foreground">Encaissé</p>
            <p className="text-lg md:text-2xl font-bold text-green-600">{formatEuro(paidTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-muted-foreground">En attente</p>
            <p className="text-lg md:text-2xl font-bold text-amber-600">{formatEuro(pendingTotal)}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:ring-2 hover:ring-destructive/50 ${filterOverdue ? "ring-2 ring-destructive" : ""}`}
          onClick={() => {
            if (overdueTotal > 0) setFilterOverdue(prev => !prev);
          }}
        >
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-muted-foreground">En retard</p>
            <p className={`text-lg md:text-2xl font-bold ${overdueTotal > 0 ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
              {formatEuro(overdueTotal)}
            </p>
            {filterOverdue && (
              <p className="text-xs text-destructive mt-1">Filtre actif — cliquer pour retirer</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue payments list */}
      <OverduePaymentsList bookings={bookings} onViewBooking={handleView} />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par locataire ou bien..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {filteredAndSorted.map(booking => {
          const status = getPaymentStatus(booking.payment_items);
          return (
            <div
              key={booking.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${status === "overdue" ? "border-destructive/30 bg-destructive/5" : "border-border"} hover:bg-muted/50`}
              onClick={() => handleView(booking)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-medium text-sm truncate">{booking.listing_title}</p>
                <PaymentStatusBadge status={status} />
              </div>
              <p className="text-xs text-muted-foreground">{booking.tenant_name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(booking.checkin_date), "dd/MM/yyyy")} - {format(new Date(booking.checkout_date), "dd/MM/yyyy")}
                </span>
                <span className="text-sm font-semibold">{formatEuro(booking.total_price)}</span>
              </div>
            </div>
          );
        })}
        {filteredAndSorted.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucun résultat pour « {search} »
          </div>
        )}
      </div>

      {/* Desktop: table layout */}
      <Card className="hidden md:block">
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
                {filteredAndSorted.map(booking => {
                  const status = getPaymentStatus(booking.payment_items);
                  return (
                    <TableRow key={booking.id} className={`hover:bg-muted/30 ${status === "overdue" ? "bg-destructive/5" : ""}`}>
                      <TableCell className="font-medium max-w-[200px] truncate">{booking.listing_title}</TableCell>
                      <TableCell>{booking.tenant_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(booking.checkin_date), "dd/MM/yyyy")}</div>
                          <div className="text-muted-foreground">{format(new Date(booking.checkout_date), "dd/MM/yyyy")}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatEuro(booking.total_price)}
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
                {filteredAndSorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun résultat pour « {search} »
                    </TableCell>
                  </TableRow>
                )}
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
