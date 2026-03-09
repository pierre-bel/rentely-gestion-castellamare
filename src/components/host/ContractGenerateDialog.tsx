import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateQRDataUrl, buildTransferReference, type PaymentQRCodeProps } from "@/components/portal/PaymentQRCode";

interface Template {
  id: string;
  name: string;
  body_html: string;
}

interface ContractGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  onGenerated: () => void;
}

export const ContractGenerateDialog = ({ open, onOpenChange, templates, onGenerated }: ContractGenerateDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedBooking, setSelectedBooking] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (open && user) {
      setLoadingBookings(true);
      supabase
        .from("bookings")
        .select("id, checkin_date, checkout_date, nights, total_price, subtotal, cleaning_fee, service_fee, taxes, guests, listing_id, guest_user_id, beach_cabin, created_at, listings(title, address, city, country, type, security_deposit), profiles:guest_user_id(first_name, last_name, email, phone)")
        .in("status", ["confirmed", "pending_payment"])
        .order("checkin_date", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          setBookings(data || []);
          setLoadingBookings(false);
        });
    }
  }, [open, user]);

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedBooking) return;
    setGenerating(true);

    const template = templates.find((t) => t.id === selectedTemplate);
    const booking = bookings.find((b: any) => b.id === selectedBooking);
    if (!template || !booking) return;

    const listing = booking.listings as any;
    const guest = booking.profiles as any;

    // Fetch tenant info from pricing_breakdown.tenant_id
    let tenantGender: string | null = null;
    const pricingBreakdown = booking.pricing_breakdown as any;
    const tenantId = pricingBreakdown?.tenant_id;
    if (tenantId) {
      const { data: tenantData } = await supabase
        .from("tenants" as any)
        .select("gender, first_name, last_name")
        .eq("id", tenantId)
        .maybeSingle();
      if (tenantData) {
        tenantGender = (tenantData as any).gender;
      }
    }

    // Resolve civility from tenant gender
    const getCivility = (gender: string | null): string => {
      if (!gender) return "Madame, Monsieur";
      const g = gender.toLowerCase().trim();
      if (["f", "female", "femme"].includes(g)) return "Madame";
      if (["h", "m", "male", "homme"].includes(g)) return "Monsieur";
      return "Madame, Monsieur";
    };

    // Fetch payment items for this booking
    const { data: paymentItems } = await supabase
      .from("booking_payment_items")
      .select("*")
      .eq("booking_id", booking.id)
      .order("sort_order", { ascending: true });

    const items = paymentItems || [];
    const deposit = items.find((i: any) => i.label?.toLowerCase().includes("acompte")) || items[0];
    const balance = items.find((i: any) => i.label?.toLowerCase().includes("solde") || i.label?.toLowerCase().includes("décompte")) || items[items.length - 1];

    const formatCurrency = (val: number | null) => val != null ? `${Number(val).toFixed(2)} €` : "N/A";
    const formatDate = (d: string | null) => d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "N/A";
    const formatStatus = (item: any) => {
      if (!item) return "N/A";
      return item.is_paid ? "Payé" : "Non payé";
    };

    // Build payment schedule table HTML
    const scheduleRows = items.map((item: any) =>
      `<tr><td style="border:1px solid #ddd;padding:6px">${item.label}</td><td style="border:1px solid #ddd;padding:6px">${formatCurrency(item.amount)}</td><td style="border:1px solid #ddd;padding:6px">${item.due_date ? formatDate(item.due_date) : "—"}</td><td style="border:1px solid #ddd;padding:6px">${formatStatus(item)}</td></tr>`
    ).join("");
    const scheduleTable = items.length > 0
      ? `<table style="border-collapse:collapse;width:100%"><thead><tr><th style="border:1px solid #ddd;padding:6px;background:#f5f5f5">Échéance</th><th style="border:1px solid #ddd;padding:6px;background:#f5f5f5">Montant</th><th style="border:1px solid #ddd;padding:6px;background:#f5f5f5">Date limite</th><th style="border:1px solid #ddd;padding:6px;background:#f5f5f5">Statut</th></tr></thead><tbody>${scheduleRows}</tbody></table>`
      : "Aucun échéancier défini";

    const propertyTypeLabels: Record<string, string> = {
      apartment: "Appartement", house: "Maison", villa: "Villa", cabin: "Chalet",
      studio: "Studio", loft: "Loft", room: "Chambre", other: "Autre",
    };

    let html = template.body_html;
    const replacements: Record<string, string> = {
      // Guest
      "{{guest_name}}": `${guest?.first_name || ""} ${guest?.last_name || ""}`.trim() || "N/A",
      "{{guest_first_name}}": guest?.first_name || "N/A",
      "{{guest_last_name}}": guest?.last_name || "N/A",
      "{{guest_email}}": guest?.email || "N/A",
      "{{guest_phone}}": guest?.phone || "N/A",
      "{{guest_civility}}": getCivility(tenantGender),
      // Booking
      "{{booking_id}}": booking.id,
      "{{checkin_date}}": formatDate(booking.checkin_date),
      "{{checkout_date}}": formatDate(booking.checkout_date),
      "{{nights}}": String(booking.nights),
      "{{guests}}": String(booking.guests),
      // Listing
      "{{listing_title}}": listing?.title || "N/A",
      "{{listing_address}}": listing?.address || "N/A",
      "{{listing_city}}": listing?.city || "N/A",
      "{{listing_country}}": listing?.country || "N/A",
      "{{listing_type}}": propertyTypeLabels[listing?.type] || listing?.type || "N/A",
      // Pricing
      "{{total_price}}": formatCurrency(booking.total_price),
      "{{subtotal}}": formatCurrency(booking.subtotal),
      "{{cleaning_fee}}": formatCurrency(booking.cleaning_fee),
      "{{service_fee}}": formatCurrency(booking.service_fee),
      "{{taxes}}": formatCurrency(booking.taxes),
      "{{security_deposit}}": formatCurrency(listing?.security_deposit),
      // Payment schedule
      "{{deposit_amount}}": deposit ? formatCurrency(deposit.amount) : "N/A",
      "{{deposit_due_date}}": deposit?.due_date ? formatDate(deposit.due_date) : "N/A",
      "{{deposit_status}}": formatStatus(deposit),
      "{{balance_amount}}": balance && balance !== deposit ? formatCurrency(balance.amount) : formatCurrency((booking.total_price || 0) - (deposit?.amount || 0)),
      "{{balance_due_date}}": balance?.due_date ? formatDate(balance.due_date) : "N/A",
      "{{balance_status}}": balance ? formatStatus(balance) : "N/A",
      "{{payment_schedule}}": scheduleTable,
      // Dates
      "{{today_date}}": format(new Date(), "d MMMM yyyy", { locale: fr }),
      "{{booking_created_date}}": formatDate(booking.created_at),
    };

    // Generate QR code if bank info available and template uses {{qr_paiement}}
    if (template.body_html.includes("{{qr_paiement}}")) {
      const { data: bankSettings } = await supabase
        .from("portal_settings")
        .select("bank_beneficiary_name, bank_iban, bank_bic, bank_transfer_reference_template")
        .eq("host_user_id", user!.id)
        .maybeSingle();

      if (bankSettings?.bank_beneficiary_name && bankSettings?.bank_iban && bankSettings?.bank_bic) {
        const refTemplate = bankSettings.bank_transfer_reference_template || "{{guest_last_name}} - {{listing_title}} - {{checkin_date}} au {{checkout_date}}";
        const refVars: Record<string, string> = {
          guest_last_name: guest?.last_name || "",
          guest_full_name: `${guest?.first_name || ""} ${guest?.last_name || ""}`.trim(),
          listing_title: listing?.title || "",
          checkin_date: format(new Date(booking.checkin_date), "dd/MM/yyyy"),
          checkout_date: format(new Date(booking.checkout_date), "dd/MM/yyyy"),
        };
        const reference = buildTransferReference(refTemplate, refVars);
        const totalUnpaid = items.filter((i: any) => !i.is_paid).reduce((s: number, i: any) => s + Number(i.amount), 0);
        const amount = totalUnpaid > 0 ? totalUnpaid : Number(booking.total_price);

        try {
          const qrDataUrl = await generateQRDataUrl({
            beneficiary: bankSettings.bank_beneficiary_name,
            iban: bankSettings.bank_iban,
            bic: bankSettings.bank_bic,
            amount,
            reference,
          });
          replacements["{{qr_paiement}}"] = `<div style="text-align:center;margin:16px 0"><img src="${qrDataUrl}" width="200" height="200" alt="QR code de paiement SEPA" style="display:inline-block" /><br/><span style="font-size:11px;color:#666">Scannez pour payer par virement</span></div>`;
        } catch (e) {
          console.error("QR generation failed", e);
          replacements["{{qr_paiement}}"] = "";
        }
      } else {
        replacements["{{qr_paiement}}"] = "";
      }
    }

    Object.entries(replacements).forEach(([key, value]) => {
      html = html.split(key).join(value);
    });

    // Handle beach_cabin
    if (booking.beach_cabin) {
      html = html.split("{{beach_cabin}}").join("Cabine de plage");
    } else {
      html = html.replace(/<(p|li|tr|div|span)[^>]*>(?:[^<]*|\s)*\{\{beach_cabin\}\}(?:[^<]*|\s)*<\/\1>/gi, "");
      html = html.split("{{beach_cabin}}").join("");
    }

    const { error } = await supabase.from("booking_contracts").insert({
      booking_id: booking.id,
      template_id: template.id,
      generated_html: html,
    } as any);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contrat généré avec succès" });
      onGenerated();
      onOpenChange(false);
    }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Générer un contrat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Réservation</Label>
            {loadingBookings ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
              </div>
            ) : (
              <Select value={selectedBooking} onValueChange={setSelectedBooking}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une réservation" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((b: any) => {
                    const guest = b.profiles as any;
                    const listing = b.listings as any;
                    return (
                      <SelectItem key={b.id} value={b.id}>
                        {guest?.first_name || "?"} {guest?.last_name || ""} — {listing?.title || "?"} ({format(new Date(b.checkin_date), "dd/MM/yy")})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleGenerate} disabled={generating || !selectedTemplate || !selectedBooking}>
            {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Générer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
