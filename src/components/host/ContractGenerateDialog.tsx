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
import { generateQRDataUrl, buildTransferReference } from "@/components/portal/PaymentQRCode";

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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
  preselectedBookingId?: string | null;
}

export const ContractGenerateDialog = ({ open, onOpenChange, templates, onGenerated, preselectedBookingId }: ContractGenerateDialogProps) => {
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
      if (preselectedBookingId) setSelectedBooking(preselectedBookingId);
      if (templates.length === 1) setSelectedTemplate(templates[0].id);

      const fetchBookings = async () => {
        const { data: bookingsData, error } = await supabase
          .from("bookings")
          .select("id, checkin_date, checkout_date, checkin_time, checkout_time, nights, total_price, subtotal, cleaning_fee, service_fee, taxes, guests, listing_id, guest_user_id, beach_cabin, created_at, pricing_breakdown, igloohome_code, access_token, listings(title, address, city, country, type, security_deposit, checkin_from, checkout_until)")
          .in("status", ["confirmed", "pending_payment"])
          .order("checkin_date", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching bookings:", error);
          setBookings([]);
          setLoadingBookings(false);
          return;
        }

        const items = bookingsData || [];
        if (items.length === 0) { setBookings([]); setLoadingBookings(false); return; }

        const guestIds = [...new Set(items.map((b: any) => b.guest_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .in("id", guestIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        // Also fetch tenant info from tenants table
        const tenantIds = [...new Set(items.map((b: any) => (b.pricing_breakdown as any)?.tenant_id).filter(Boolean))];
        let tenantMap = new Map();
        if (tenantIds.length > 0) {
          const { data: tenants } = await supabase
            .from("tenants" as any)
            .select("id, first_name, last_name, email, phone, gender")
            .in("id", tenantIds);
          tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]));
        }

        const enriched = items.map((b: any) => {
          const tenantId = (b.pricing_breakdown as any)?.tenant_id;
          const tenant = tenantId ? tenantMap.get(tenantId) : null;
          return {
            ...b,
            profiles: profileMap.get(b.guest_user_id) || null,
            tenant,
          };
        });

        setBookings(enriched);
        setLoadingBookings(false);
      };
      fetchBookings();
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
    const tenant = booking.tenant as any;

    const getCivility = (gender: string | null): string => {
      if (!gender) return "Madame, Monsieur";
      const g = gender.toLowerCase().trim();
      if (["f", "female", "femme"].includes(g)) return "Madame";
      if (["h", "m", "male", "homme"].includes(g)) return "Monsieur";
      return "Madame, Monsieur";
    };

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
    const formatStatus = (item: any) => item ? (item.is_paid ? "Payé" : "Non payé") : "N/A";

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

    // Use tenant info when available, fallback to guest profile
    const guestName = tenant
      ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim()
      : `${guest?.first_name || ""} ${guest?.last_name || ""}`.trim();

    let html = template.body_html;
    const replacements: Record<string, string> = {
      "{{guest_name}}": escapeHtml(guestName || "N/A"),
      "{{guest_first_name}}": escapeHtml(tenant?.first_name || guest?.first_name || "N/A"),
      "{{guest_last_name}}": escapeHtml(tenant?.last_name || guest?.last_name || "N/A"),
      "{{guest_email}}": escapeHtml(tenant?.email || guest?.email || "N/A"),
      "{{guest_phone}}": escapeHtml(tenant?.phone || guest?.phone || "N/A"),
      "{{guest_civility}}": escapeHtml(getCivility(tenant?.gender || null)),
      "{{booking_id}}": booking.id,
      "{{checkin_date}}": formatDate(booking.checkin_date),
      "{{checkout_date}}": formatDate(booking.checkout_date),
      "{{nights}}": String(booking.nights),
      "{{guests}}": String(booking.guests),
      "{{listing_title}}": listing?.title || "N/A",
      "{{listing_address}}": listing?.address || "N/A",
      "{{listing_city}}": listing?.city || "N/A",
      "{{listing_country}}": listing?.country || "N/A",
      "{{listing_type}}": propertyTypeLabels[listing?.type] || listing?.type || "N/A",
      "{{total_price}}": formatCurrency(booking.total_price),
      "{{subtotal}}": formatCurrency(booking.subtotal),
      "{{cleaning_fee}}": formatCurrency(booking.cleaning_fee),
      "{{service_fee}}": formatCurrency(booking.service_fee),
      "{{taxes}}": formatCurrency(booking.taxes),
      "{{security_deposit}}": formatCurrency(listing?.security_deposit),
      "{{deposit_amount}}": deposit ? formatCurrency(deposit.amount) : "N/A",
      "{{deposit_due_date}}": deposit?.due_date ? formatDate(deposit.due_date) : "N/A",
      "{{deposit_status}}": formatStatus(deposit),
      "{{balance_amount}}": balance && balance !== deposit ? formatCurrency(balance.amount) : formatCurrency((booking.total_price || 0) - (deposit?.amount || 0)),
      "{{balance_due_date}}": balance?.due_date ? formatDate(balance.due_date) : "N/A",
      "{{balance_status}}": balance ? formatStatus(balance) : "N/A",
      "{{payment_schedule}}": scheduleTable,
      "{{today_date}}": format(new Date(), "d MMMM yyyy", { locale: fr }),
      "{{booking_created_date}}": formatDate(booking.created_at),
      "{{checkin_time}}": booking.checkin_time || listing?.checkin_from || "",
      "{{checkout_time}}": booking.checkout_time || listing?.checkout_until || "",
      "{{portal_link}}": `https://gestioncastellamare.lovable.app/portal/${booking.access_token || ""}`,
      "{{igloohome_code}}": booking.igloohome_code || "",
    };

    if (template.body_html.includes("{{qr_paiement}}")) {
      const { data: bankSettings } = await supabase
        .from("portal_settings")
        .select("bank_beneficiary_name, bank_iban, bank_bic, bank_transfer_reference_template")
        .eq("host_user_id", user!.id)
        .maybeSingle();

      if (bankSettings?.bank_beneficiary_name && bankSettings?.bank_iban && bankSettings?.bank_bic) {
        const refTemplate = bankSettings.bank_transfer_reference_template || "{{guest_last_name}} - {{listing_title}} - {{checkin_date}} au {{checkout_date}}";
        const refVars: Record<string, string> = {
          guest_last_name: tenant?.last_name || guest?.last_name || "",
          guest_full_name: guestName,
          listing_title: listing?.title || "",
          checkin_date: format(new Date(booking.checkin_date), "dd/MM/yyyy"),
          checkout_date: format(new Date(booking.checkout_date), "dd/MM/yyyy"),
        };
        const reference = buildTransferReference(refTemplate, refVars);
        const totalUnpaid = items.filter((i: any) => !i.is_paid).reduce((s: number, i: any) => s + Number(i.amount), 0);
        const amount = totalUnpaid > 0 ? totalUnpaid : Number(booking.total_price);

        try {
          const qrDataUrl = await generateQRDataUrl({ beneficiary: bankSettings.bank_beneficiary_name, iban: bankSettings.bank_iban, bic: bankSettings.bank_bic, amount, reference });
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

  const getBookingLabel = (b: any) => {
    const tenant = b.tenant;
    const guest = b.profiles;
    const listing = b.listings as any;
    const name = tenant
      ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim()
      : `${guest?.first_name || ""} ${guest?.last_name || ""}`.trim();
    return `${name || "?"} — ${listing?.title || "?"} (${format(new Date(b.checkin_date), "dd/MM/yy")} → ${format(new Date(b.checkout_date), "dd/MM/yy")})`;
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
              <SelectTrigger><SelectValue placeholder="Choisir un template" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Choisir une réservation" /></SelectTrigger>
                <SelectContent>
                  {bookings.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{getBookingLabel(b)}</SelectItem>
                  ))}
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
