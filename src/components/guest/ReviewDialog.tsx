import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDemoData } from "@/hooks/useDemoData";

const CRITERIA = [
  { key: "rating_cleanliness", label: "Propreté" },
  { key: "rating_location", label: "Emplacement" },
  { key: "rating_communication", label: "Communication" },
  { key: "rating_value", label: "Rapport qualité/prix" },
  { key: "rating_maintenance", label: "État du logement" },
] as const;

type CriterionKey = typeof CRITERIA[number]["key"];

function StarRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Star
              className={`h-5 w-5 ${
                s <= (hovered || value)
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  listingTitle: string;
  existingReview?: {
    id: string;
    rating: number;
    text: string;
    created_at: string;
  } | null;
  onReviewSubmitted: () => void;
}

export const ReviewDialog = ({
  open,
  onOpenChange,
  bookingId,
  listingTitle,
  existingReview,
  onReviewSubmitted,
}: ReviewDialogProps) => {
  const [ratings, setRatings] = useState<Record<CriterionKey, number>>({
    rating_cleanliness: 0,
    rating_location: 0,
    rating_communication: 0,
    rating_value: 0,
    rating_maintenance: 0,
  });
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { isDemoMode, getBooking, addReview, updateReview } = useDemoData();

  const canEdit = existingReview
    ? new Date().getTime() - new Date(existingReview.created_at).getTime() <
      2 * 24 * 60 * 60 * 1000
    : true;

  const overallRating = (() => {
    const filled = Object.values(ratings).filter((v) => v > 0);
    if (filled.length === 0) return 0;
    return Math.round((filled.reduce((a, b) => a + b, 0) / filled.length) * 10) / 10;
  })();

  const allRated = Object.values(ratings).every((v) => v > 0);

  useEffect(() => {
    if (existingReview) {
      setReviewText(existingReview.text || "");
      // We don't have criteria from the existing review in this interface,
      // so derive overall rating
      const r = existingReview.rating || 5;
      setRatings({
        rating_cleanliness: r,
        rating_location: r,
        rating_communication: r,
        rating_value: r,
        rating_maintenance: r,
      });
    } else {
      setRatings({
        rating_cleanliness: 0,
        rating_location: 0,
        rating_communication: 0,
        rating_value: 0,
        rating_maintenance: 0,
      });
      setReviewText("");
    }
  }, [existingReview, open]);

  const handleSubmit = async () => {
    if (!allRated) {
      toast({ title: "Veuillez noter tous les critères", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      if (isDemoMode) {
        if (existingReview) {
          updateReview(existingReview.id, { rating: overallRating, text: reviewText });
          toast({ title: "Avis mis à jour" });
        } else {
          const booking = getBooking(bookingId);
          if (!booking) throw new Error("Réservation introuvable");
          addReview({ booking_id: bookingId, listing_id: booking.listing_id, rating: overallRating, text: reviewText });
          toast({ title: "Avis envoyé" });
        }
      } else {
        const reviewData = {
          rating: overallRating,
          text: reviewText,
          ...ratings,
        };

        if (existingReview) {
          const { error } = await supabase
            .from("reviews")
            .update(reviewData as any)
            .eq("id", existingReview.id);
          if (error) throw error;
          toast({ title: "Avis mis à jour" });
        } else {
          const { data: booking } = await supabase
            .from("bookings")
            .select("listing_id")
            .eq("id", bookingId)
            .single();
          if (!booking) throw new Error("Réservation introuvable");

          const { error } = await supabase.from("reviews").insert({
            booking_id: bookingId,
            listing_id: booking.listing_id,
            author_user_id: (await supabase.auth.getUser()).data.user?.id,
            status: "pending",
            ...reviewData,
          } as any);
          if (error) throw error;
          toast({ title: "Avis envoyé" });
        }
      }

      onReviewSubmitted();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? "Modifier votre avis" : "Laisser un avis"}
          </DialogTitle>
          <DialogDescription>
            {existingReview ? (
              <>
                Modifiez votre avis pour {listingTitle}
                {!canEdit && (
                  <span className="block mt-2 text-destructive">
                    Les avis ne peuvent être modifiés que dans les 2 jours suivant la publication
                  </span>
                )}
              </>
            ) : (
              `Merci d'avoir séjourné à ${listingTitle}. Votre avis aide les hôtes à s'améliorer.`
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Criteria grid */}
          <div className="space-y-3">
            {CRITERIA.map((c) => (
              <StarRow
                key={c.key}
                label={c.label}
                value={ratings[c.key]}
                onChange={(v) => setRatings((prev) => ({ ...prev, [c.key]: v }))}
                disabled={!canEdit}
              />
            ))}
          </div>

          {/* Overall */}
          {allRated && (
            <div className="flex items-center justify-between bg-primary/5 rounded-lg px-4 py-3">
              <span className="text-sm font-medium">Note globale</span>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-primary text-primary" />
                <span className="text-lg font-bold text-primary">{overallRating.toFixed(1)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Commentaire (optionnel)</label>
            <Textarea
              placeholder="Partagez ce que vous avez aimé, ce qui pourrait être amélioré…"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              disabled={!canEdit}
              rows={4}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{reviewText.length}/1000</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || !canEdit || !allRated}>
            {submitting ? "Envoi…" : existingReview ? "Mettre à jour" : "Envoyer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
