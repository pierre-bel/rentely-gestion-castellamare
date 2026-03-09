import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CriterionDef {
  criterion_key: string;
  label: string;
  description: string;
  sort_order: number;
}

const DEFAULT_CRITERIA: CriterionDef[] = [
  { criterion_key: "rating_cleanliness", label: "Propreté", description: "État de propreté du logement", sort_order: 0 },
  { criterion_key: "rating_location", label: "Emplacement", description: "Localisation et accessibilité", sort_order: 1 },
  { criterion_key: "rating_communication", label: "Communication", description: "Réactivité et clarté de l'hôte", sort_order: 2 },
  { criterion_key: "rating_value", label: "Rapport qualité/prix", description: "Adéquation prix / prestation", sort_order: 3 },
  { criterion_key: "rating_maintenance", label: "État du logement", description: "Travaux, équipements à réparer", sort_order: 4 },
];

// Known DB columns for default criteria
const DB_CRITERION_COLUMNS = [
  "rating_cleanliness", "rating_location", "rating_communication", "rating_value", "rating_maintenance",
];

interface PortalReviewFormProps {
  bookingId: string;
  listingId: string;
  guestUserId: string;
  hostUserId?: string;
  existingReview?: {
    id: string;
    rating: number;
    text: string | null;
    rating_cleanliness: number | null;
    rating_location: number | null;
    rating_communication: number | null;
    rating_value: number | null;
    rating_maintenance: number | null;
    custom_ratings?: Record<string, number> | null;
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
  hostUserId: propHostUserId,
  existingReview,
  onReviewSubmitted,
}: PortalReviewFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [listingId, setListingId] = useState(propListingId);
  const [guestUserId, setGuestUserId] = useState(propGuestUserId);
  const [criteria, setCriteria] = useState<CriterionDef[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(true);

  // Resolve listing_id, guest_user_id, and host_user_id from booking if needed
  useEffect(() => {
    (async () => {
      let hostId = propHostUserId;

      if (!listingId || !guestUserId || !hostId) {
        const { data } = await supabase
          .from("bookings")
          .select("listing_id, guest_user_id, listings(host_user_id)")
          .eq("id", bookingId)
          .maybeSingle();
        if (data) {
          if (!listingId) setListingId(data.listing_id);
          if (!guestUserId) setGuestUserId(data.guest_user_id);
          hostId = (data as any)?.listings?.host_user_id;
        }
      }

      // Load host criteria
      if (hostId) {
        const { data: critData } = await supabase
          .from("public_host_review_criteria")
          .select("*")
          .eq("host_user_id", hostId)
          .order("sort_order");

        if (critData && critData.length > 0) {
          setCriteria(critData.map((d: any) => ({
            criterion_key: d.criterion_key,
            label: d.label,
            description: d.description || "",
            sort_order: d.sort_order,
          })));
        } else {
          setCriteria(DEFAULT_CRITERIA);
        }
      } else {
        setCriteria(DEFAULT_CRITERIA);
      }
      setCriteriaLoading(false);
    })();
  }, [bookingId, listingId, guestUserId, propHostUserId]);

  // Ratings state - initialized from existing review
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (existingReview) {
      DB_CRITERION_COLUMNS.forEach((key) => {
        const val = (existingReview as any)[key];
        if (val != null) init[key] = val;
      });
      if (existingReview.custom_ratings) {
        Object.entries(existingReview.custom_ratings).forEach(([k, v]) => {
          init[k] = v;
        });
      }
    }
    return init;
  });

  const [reviewText, setReviewText] = useState(existingReview?.text || "");

  const overallRating = (() => {
    const activeCriteria = criteria.length > 0 ? criteria : DEFAULT_CRITERIA;
    const filled = activeCriteria.map((c) => ratings[c.criterion_key]).filter((v) => v && v > 0);
    if (filled.length === 0) return 0;
    return Math.round((filled.reduce((a, b) => a + b, 0) / filled.length) * 10) / 10;
  })();

  const allRated = criteria.length > 0
    ? criteria.every((c) => (ratings[c.criterion_key] || 0) > 0)
    : false;

  const handleSubmit = async () => {
    if (!allRated) {
      toast({ title: "Veuillez noter tous les critères", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Separate DB column ratings from custom ratings
      const dbRatings: Record<string, number> = {};
      const customRatings: Record<string, number> = {};

      criteria.forEach((c) => {
        const val = ratings[c.criterion_key];
        if (val) {
          if (DB_CRITERION_COLUMNS.includes(c.criterion_key)) {
            dbRatings[c.criterion_key] = val;
          } else {
            customRatings[c.criterion_key] = val;
          }
        }
      });

      const reviewData = {
        rating: overallRating,
        text: reviewText || null,
        ...dbRatings,
        custom_ratings: Object.keys(customRatings).length > 0 ? customRatings : {},
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

  if (criteriaLoading) {
    return (
      <Card key="review">
        <CardContent className="pt-5 flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
          {criteria.map((c) => (
            <div key={c.criterion_key} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                {c.description && (
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                )}
              </div>
              <StarRating
                value={ratings[c.criterion_key] || 0}
                onChange={(v) => setRatings((prev) => ({ ...prev, [c.criterion_key]: v }))}
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
