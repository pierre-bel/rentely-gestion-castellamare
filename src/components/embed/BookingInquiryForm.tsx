import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const inquirySchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().min(1, "Le téléphone est requis").max(30),
  message: z.string().max(2000).optional(),
});

interface BookingInquiryFormProps {
  hostId: string;
  listingTitle: string;
  checkinDate: string;
  checkoutDate: string;
  nights: number;
  price: number | null;
  onClose: () => void;
}

export default function BookingInquiryForm({
  hostId,
  listingTitle,
  checkinDate,
  checkoutDate,
  nights,
  price,
  onClose,
}: BookingInquiryFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = inquirySchema.safeParse({ name, email, phone, message });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-booking-inquiry", {
        body: {
          hostId,
          listingTitle,
          checkinDate,
          checkoutDate,
          nights,
          price,
          guestName: parsed.data.name,
          guestEmail: parsed.data.email,
          guestPhone: parsed.data.phone,
          guestMessage: parsed.data.message || "",
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      console.error("Inquiry send error:", err);
      setErrors({ form: "Une erreur est survenue. Réessayez." });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="font-semibold text-sm">Demande envoyée !</p>
        <p className="text-xs text-muted-foreground">
          Nous avons bien reçu votre demande et reviendrons vers vous rapidement.
        </p>
        <Button variant="ghost" size="sm" onClick={onClose} className="mt-2">
          Fermer
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <p className="text-xs text-muted-foreground">
        Remplissez vos coordonnées pour envoyer une demande de réservation pour <strong>{listingTitle}</strong>.
      </p>

      <div>
        <Input
          placeholder="Nom complet *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 text-sm"
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>

      <div>
        <Input
          type="email"
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 text-sm"
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
      </div>

      <div>
        <Input
          type="tel"
          placeholder="Téléphone *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-9 text-sm"
        />
        {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
      </div>

      <div>
        <Textarea
          placeholder="Message (optionnel)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      {errors.form && <p className="text-xs text-destructive">{errors.form}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1" />
          )}
          Envoyer
        </Button>
      </div>
    </form>
  );
}
