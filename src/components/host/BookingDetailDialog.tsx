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
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Users, Home, Euro, FileText, Pencil } from "lucide-react";

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
  if (!booking) return null;

  const checkin = parseISO(booking.checkin_date);
  const checkout = parseISO(booking.checkout_date);
  const nights = differenceInCalendarDays(checkout, checkin);
  const bd = booking.pricing_breakdown;
  const deposit = bd?.deposit;
  const remaining = bd?.remaining;
  const canEdit = booking.status === "confirmed" || booking.status === "pending_payment";

  // Extract clean notes (remove tenant + deposit lines)
  const cleanNotes = booking.notes
    ? booking.notes
        .split(" | ")
        .filter((p) => !p.startsWith("Locataire:") && !p.startsWith("Acompte:"))
        .join(" | ")
        .trim()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détails de la réservation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status} />
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

          {/* Guest */}
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Locataire</p>
              <p className="text-sm font-medium">{booking.guest_name}</p>
              {booking.guest_email && (
                <p className="text-xs text-muted-foreground">{booking.guest_email}</p>
              )}
              {booking.guest_phone && (
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
                <div className="flex justify-between text-sm">
                  <span>Prix total</span>
                  <span className="font-semibold">{formatPrice(booking.total_price)}</span>
                </div>
                {booking.cleaning_fee != null && booking.cleaning_fee > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>dont frais de ménage</span>
                    <span>{formatPrice(booking.cleaning_fee)}</span>
                  </div>
                )}
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
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
