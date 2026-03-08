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
        .select("id, checkin_date, checkout_date, nights, total_price, guests, listing_id, guest_user_id, beach_cabin, listings(title, address), profiles:guest_user_id(first_name, last_name, email, phone)")
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

    let html = template.body_html;
    const replacements: Record<string, string> = {
      "{{guest_name}}": `${guest?.first_name || ""} ${guest?.last_name || ""}`.trim() || "N/A",
      "{{guest_email}}": guest?.email || "N/A",
      "{{guest_phone}}": guest?.phone || "N/A",
      "{{checkin_date}}": format(new Date(booking.checkin_date), "d MMMM yyyy", { locale: fr }),
      "{{checkout_date}}": format(new Date(booking.checkout_date), "d MMMM yyyy", { locale: fr }),
      "{{nights}}": String(booking.nights),
      "{{total_price}}": `${Number(booking.total_price).toFixed(2)} €`,
      "{{listing_title}}": listing?.title || "N/A",
      "{{listing_address}}": listing?.address || "N/A",
      "{{booking_id}}": booking.id,
    };

    Object.entries(replacements).forEach(([key, value]) => {
      html = html.split(key).join(value);
    });

    // Handle beach_cabin: if true, remove only the tag (keep surrounding text), if false, remove the entire element containing it
    if (booking.beach_cabin) {
      html = html.split("{{beach_cabin}}").join("Cabine de plage");
    } else {
      // Remove any HTML element (p, li, tr, div, span) that contains {{beach_cabin}}
      html = html.replace(/<(p|li|tr|div|span)[^>]*>(?:[^<]*|\s)*\{\{beach_cabin\}\}(?:[^<]*|\s)*<\/\1>/gi, "");
      // Fallback: remove raw text line
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
