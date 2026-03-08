import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CRITERIA = [
  { key: "rating_cleanliness", label: "Propreté", description: "État de propreté du logement" },
  { key: "rating_location", label: "Emplacement", description: "Localisation et accessibilité" },
  { key: "rating_communication", label: "Communication", description: "Réactivité et clarté de l'hôte" },
  { key: "rating_value", label: "Rapport qualité/prix", description: "Adéquation prix / prestation" },
  { key: "rating_maintenance", label: "État du logement", description: "Travaux, équipements à réparer" },
] as const;

type CriterionKey = typeof CRITERIA[number]["key"];

interface PortalReviewFormProps {
  bookingId: string;
  listingId: string;
  guestUserId: string;
  existingReview?: {
    id: string;
    rating: number;
    text: string | null;
    rating_cleanliness: number | null;
    rating_location: number | null;
    rating_communication: number | null;
    rating_value: number | null;
    rating_maintenance: number | null;
  } | null;
  onReviewSubmitted?: () => void;
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
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
            className={`h-6 w-6 transition-colors ${
              s <= (hovered || value)
                ? "fill-primary text-primary"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PortalReviewForm({
  bookingId,
  listingId: propListingId,
  guestUserId: propGuestUserId,
  existingReview,
  onReviewSubmitted,
}: PortalReviewFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [listingId, setListingId] = useState(propListingId);
  const [guestUserId, setGuestUserId] = useState(propGuestUserId);

  // Resolve listing_id and guest_user_id from booking if not provided
  useEffect(() => {
    if (listingId && guestUserId) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("listing_id, guest_user_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (data) {
        if (!listingId) setListingId(data.listing_id);
        if (!guestUserId) setGuestUserId(data.guest_user_id);
      }
    })();
  }, [bookingId, listingId, guestUserId]);

  const [ratings, setRatings] = useState<Record<CriterionKey, number>>({
    rating_cleanliness: existingReview?.rating_cleanliness || 0,
    rating_location: existingReview?.rating_location || 0,
    rating_communication: existingReview?.rating_communication || 0,
    rating_value: existingReview?.rating_value || 0,
    rating_maintenance: existingReview?.rating_maintenance || 0,
  });
  const [reviewText, setReviewText] = useState(existingReview?.text || "");

  const overallRating = (() => {
    const filled = Object.values(ratings).filter((v) => v > 0);
    if (filled.length === 0) return 0;
    return Math.round((filled.reduce((a, b) => a + b, 0) / filled.length) * 10) / 10;
  })();

  const allRated = Object.values(ratings).every((v) => v > 0);

  const handleSubmit = async () => {
    if (!allRated) {
      toast({ title: "Veuillez noter tous les critères", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const reviewData = {
        rating: overallRating,
        text: reviewText || null,
        ...ratings,
      };

      if (existingReview) {
        const { error } = await supabase
          .from("reviews")
          .update(reviewData as any)
          .eq("id", existingReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert({
          booking_id: bookingId,
          listing_id: listingId,
          author_user_id: guestUserId,
          status: "pending",
          ...reviewData,
        } as any);
        if (error) throw error;
      }

      toast({ title: existingReview ? "Avis mis à jour !" : "Merci pour votre avis !" });
      setSubmitted(true);
      onReviewSubmitted?.();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted && !existingReview) {
    return (
      <Card key="review">
        <CardContent className="pt-5 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-[hsl(var(--success))] mx-auto" />
          <p className="font-medium text-foreground">Merci pour votre avis !</p>
          <p className="text-sm text-muted-foreground">Votre évaluation a été envoyée et sera publiée après validation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card key="review">
      <CardContent className="pt-5 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {existingReview ? "Modifier votre avis" : "Donnez votre avis"}
          </p>
        </div>

        {/* Criteria grid */}
        <div className="space-y-4">
          {CRITERIA.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <StarRating
                value={ratings[c.key]}
                onChange={(v) => setRatings((prev) => ({ ...prev, [c.key]: v }))}
              />
            </div>
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

        {/* Comment */}
        <div>
          <label className="text-sm font-medium mb-2 block">Commentaire (optionnel)</label>
          <Textarea
            placeholder="Partagez votre expérience, ce que vous avez aimé, ce qui pourrait être amélioré…"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            maxLength={1000}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{reviewText.length}/1000</p>
        </div>

        <Button onClick={handleSubmit} disabled={submitting || !allRated} className="w-full">
          {submitting ? "Envoi…" : existingReview ? "Mettre à jour" : "Envoyer mon avis"}
        </Button>
      </CardContent>
    </Card>
  );
}
