import { useState } from "react";
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
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Users, Home, Euro, FileText, Pencil, Mail, Link2, Check, CreditCard, Phone, MapPin } from "lucide-react";
import BookingEmailsTab from "./BookingEmailsTab";
import { BookingPaymentSection } from "./BookingPaymentSection";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  
  const tenantId = booking?.pricing_breakdown?.tenant_id;
  
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

  if (!booking) return null;

  const checkin = parseISO(booking.checkin_date);
  const checkout = parseISO(booking.checkout_date);
  const nights = differenceInCalendarDays(checkout, checkin);
  const bd = booking.pricing_breakdown;
  const deposit = bd?.deposit;
  const remaining = bd?.remaining;
  const canEdit = booking.status === "confirmed" || booking.status === "pending_payment";

  const cleanNotes = booking.notes
    ? booking.notes
        .split(" | ")
        .filter((p) => !p.startsWith("Locataire:") && !p.startsWith("Acompte:"))
        .join(" | ")
        .trim()
    : null;

  const tenantAddress = tenant
    ? [tenant.street_number, tenant.street, tenant.postal_code, tenant.city, tenant.country]
        .filter(Boolean)
        .join(", ")
    : null;

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

            {/* Guest / Tenant */}
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Locataire</p>
                <p className="text-sm font-medium">{booking.guest_name}</p>
                {(tenant?.email || booking.guest_email) && (
                  <p className="text-xs text-muted-foreground">{tenant?.email || booking.guest_email}</p>
                )}
                {(tenant?.phone || booking.guest_phone) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {tenant?.phone || booking.guest_phone}
                  </p>
                )}
                {tenant?.gender && (
                  <p className="text-xs text-muted-foreground">
                    {tenant.gender === "male" ? "Homme" : tenant.gender === "female" ? "Femme" : tenant.gender}
                  </p>
                )}
                {tenantAddress && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {tenantAddress}
                  </p>
                )}
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
                  {deposit != null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Acompte ({bd?.deposit_percentage || 30}%)</span>
                      <span>{formatPrice(deposit)}</span>
                    </div>
                  )}
                  {remaining != null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Solde restant</span>
                      <span>{formatPrice(remaining)}</span>
                    </div>
                  )}
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

          <TabsContent value="payments" className="mt-4">
            <BookingPaymentSection bookingId={booking.id} totalPrice={booking.total_price} />
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
