import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusValue } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Users, Home, Euro, FileText, Pencil, Mail, Link2, Check, CreditCard, Plus, Trash2, AlertTriangle, Phone, MapPin } from "lucide-react";
import BookingEmailsTab from "./BookingEmailsTab";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentStatusBadge, getPaymentStatusFromItems } from "./PaymentStatusBadge";

export interface BookingDetailData {
  id: string;
  listing_id: string;
  listing_title: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  guests: number;
  total_price: number;
  cleaning_fee: number | null;
  notes: string | null;
  status: string;
  pricing_breakdown: any;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  access_token?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDetailData | null;
  onEdit: (booking: BookingDetailData) => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price);

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmée",
  pending_payment: "En attente de paiement",
  completed: "Terminée",
  checked_in: "En cours",
  cancelled_guest: "Annulée (locataire)",
  cancelled_host: "Annulée (hôte)",
  expired: "Expirée",
};

export function BookingDetailDialog({ open, onOpenChange, booking, onEdit }: Props) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const queryClient = useQueryClient();

  const bd = booking?.pricing_breakdown;
  const tenantId = bd?.tenant_id;

  // Fetch tenant info — hooks must be called before any early return
  const { data: tenant } = useQuery({
    queryKey: ["tenant-detail", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && open,
  });

  // Fetch payment items
  const { data: paymentItems = [] } = useQuery({
    queryKey: ["booking-payment-items-detail", booking?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payment_items")
        .select("*")
        .eq("booking_id", booking!.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!booking && open,
  });

  if (!booking) return null;

  const checkin = parseISO(booking.checkin_date);
  const checkout = parseISO(booking.checkout_date);
  const nights = differenceInCalendarDays(checkout, checkin);
  const deposit = bd?.deposit;
  const remaining = bd?.remaining;
  const canEdit = booking.status === "confirmed" || booking.status === "pending_payment";

  const cleanNotes = booking.notes
    ? booking.notes
        .split(" | ")
        .filter((p: string) => !p.startsWith("Locataire:") && !p.startsWith("Acompte:"))
        .join(" | ")
        .trim()
    : null;

  const today = new Date().toISOString().split("T")[0];

  const handleTogglePaid = async (item: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("booking_payment_items")
        .update({
          is_paid: !item.is_paid,
          paid_at: !item.is_paid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["booking-payment-items-detail", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["host-bookings-payment-items"] });
      queryClient.invalidateQueries({ queryKey: ["host-payments-bookings"] });
      toast({ title: item.is_paid ? "Marqué comme non payé" : "Marqué comme payé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (itemId: string, field: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("booking_payment_items")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", itemId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["booking-payment-items-detail", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["host-bookings-payment-items"] });
      queryClient.invalidateQueries({ queryKey: ["host-payments-bookings"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newLabel.trim() || !newAmount) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("booking_payment_items").insert({
        booking_id: booking.id,
        label: newLabel.trim(),
        amount: parseFloat(newAmount),
        due_date: newDueDate || null,
        sort_order: paymentItems.length,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["booking-payment-items-detail", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["host-bookings-payment-items"] });
      queryClient.invalidateQueries({ queryKey: ["host-payments-bookings"] });
      setNewLabel("");
      setNewAmount("");
      setNewDueDate("");
      toast({ title: "Échéance ajoutée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("booking_payment_items").delete().eq("id", itemId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["booking-payment-items-detail", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["host-bookings-payment-items"] });
      queryClient.invalidateQueries({ queryKey: ["host-payments-bookings"] });
      toast({ title: "Échéance supprimée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const paidTotal = paymentItems.filter((i: any) => i.is_paid).reduce((s: number, i: any) => s + Number(i.amount), 0);
  const remainingPayment = booking.total_price - paidTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détails de la réservation
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Détails</TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Paiements
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex-1 gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              E-mails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <StatusBadge status={booking.status as StatusValue} />
              <span className="text-xs text-muted-foreground font-mono">
                {booking.id.slice(0, 8)}
              </span>
            </div>

            <Separator />

            {/* Property */}
            <div className="flex items-start gap-3">
              <Home className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Bien</p>
                <p className="text-sm font-medium">{booking.listing_title}</p>
              </div>
            </div>

            {/* Tenant / Guest info */}
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="w-full">
                <p className="text-xs text-muted-foreground">Locataire</p>
                <p className="text-sm font-medium">
                  {tenant ? `${tenant.first_name} ${tenant.last_name || ""}`.trim() : booking.guest_name}
                </p>
                {(tenant?.email || booking.guest_email) && (
                  <p className="text-xs text-muted-foreground">{tenant?.email || booking.guest_email}</p>
                )}
                {tenant?.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {tenant.phone}
                  </p>
                )}
                {tenant?.gender && (
                  <p className="text-xs text-muted-foreground">
                    {tenant.gender === "male" ? "Homme" : tenant.gender === "female" ? "Femme" : tenant.gender}
                  </p>
                )}
                {(tenant?.street || tenant?.city) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {[tenant?.street_number, tenant?.street, tenant?.postal_code, tenant?.city, tenant?.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {!tenant && booking.guest_phone && (
                  <p className="text-xs text-muted-foreground">{booking.guest_phone}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {booking.guests} voyageur{booking.guests > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-start gap-3">
              <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Dates</p>
                <p className="text-sm font-medium">
                  {format(checkin, "d MMMM yyyy", { locale: fr })} → {format(checkout, "d MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-xs text-muted-foreground">{nights} nuit{nights > 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Pricing */}
            <div className="flex items-start gap-3">
              <Euro className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="w-full">
                <p className="text-xs text-muted-foreground">Tarification</p>
                <div className="space-y-1 mt-1">
                  {bd?.rental_price != null && (
                    <div className="flex justify-between text-sm">
                      <span>Prix de location</span>
                      <span>{formatPrice(bd.rental_price)}</span>
                    </div>
                  )}
                  {booking.cleaning_fee != null && booking.cleaning_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Frais de ménage</span>
                      <span>{formatPrice(booking.cleaning_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Prix total</span>
                    <span>{formatPrice(booking.total_price)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {cleanNotes && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{cleanNotes}</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            {/* Payment status */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Statut</p>
              <PaymentStatusBadge status={getPaymentStatusFromItems(paymentItems.map((i: any) => ({ is_paid: i.is_paid, due_date: i.due_date })))} />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Encaissé</p>
                <p className="text-lg font-bold text-success-foreground">{formatPrice(paidTotal)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Restant</p>
                <p className="text-lg font-bold text-warning-foreground">{formatPrice(remainingPayment)}</p>
              </div>
            </div>

            <Separator />

            {/* Payment items */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Échéances de paiement</p>
              {paymentItems.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune échéance configurée</p>
              )}
              {paymentItems.map((item: any) => {
                const isLate = !item.is_paid && item.due_date && item.due_date < today;
                return (
                  <div key={item.id} className={`p-3 rounded-lg border ${isLate ? "border-destructive/50 bg-destructive/5" : "bg-card"}`}>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={item.is_paid}
                        onCheckedChange={() => handleTogglePaid(item)}
                        disabled={saving}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${item.is_paid ? "line-through text-muted-foreground" : ""}`}>
                            {item.label}
                          </p>
                          {isLate && (
                            <span className="text-xs text-destructive flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" /> En retard
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="date"
                            value={item.due_date || ""}
                            onChange={(e) => handleUpdateItem(item.id, "due_date", e.target.value || null)}
                            className="h-7 text-xs w-36"
                            disabled={saving}
                          />
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleUpdateItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs w-24"
                            step="0.01"
                            min="0"
                            disabled={saving}
                          />
                          <span className="text-xs text-muted-foreground">€</span>
                        </div>
                        {item.is_paid && item.paid_at && (
                          <p className="text-xs text-success-foreground mt-1">
                            Payé le {format(new Date(item.paid_at), "dd/MM/yyyy")}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(item.id)} disabled={saving}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Add new item */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Ajouter une échéance</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Libellé</Label>
                  <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Ex: Acompte" className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Montant (€)</Label>
                  <Input type="number" min="0" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" className="h-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Date d'échéance</Label>
                <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="h-8" />
              </div>
              <Button onClick={handleAddItem} disabled={saving || !newLabel.trim() || !newAmount} size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="emails" className="mt-4">
            <BookingEmailsTab
              bookingId={booking.id}
              checkinDate={booking.checkin_date}
              checkoutDate={booking.checkout_date}
              listingId={booking.listing_id}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
          {booking.access_token && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const url = `${window.location.origin}/portal/${booking.access_token}`;
                navigator.clipboard.writeText(url);
                setLinkCopied(true);
                toast({ title: "Lien du portail copié !" });
                setTimeout(() => setLinkCopied(false), 2000);
              }}
            >
              {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {linkCopied ? "Copié" : "Portail client"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {canEdit && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit(booking);
              }}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
