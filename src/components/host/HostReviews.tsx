import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { HostReviewResponseDialog } from "./HostReviewResponseDialog";

const CRITERIA_LABELS: Record<string, string> = {
  rating_cleanliness: "Propreté",
  rating_location: "Emplacement",
  rating_communication: "Communication",
  rating_value: "Qualité/prix",
  rating_maintenance: "État",
};

interface HostReview {
  id: string;
  rating: number;
  text: string | null;
  status: string;
  created_at: string;
  host_response: string | null;
  host_response_at: string | null;
  listing_id: string;
  listing_title: string;
  booking_id: string;
  author_user_id: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_avatar_url: string | null;
  rating_cleanliness: number | null;
  rating_location: number | null;
  rating_communication: number | null;
  rating_value: number | null;
  rating_maintenance: number | null;
}

const HostReviews = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<HostReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingFilter, setListingFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [respondingReview, setRespondingReview] = useState<HostReview | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const { data: criteriaList } = useHostReviewCriteria(user?.id);

  const fetchReviews = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_host_reviews", {
      _host_user_id: user.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setReviews((data as HostReview[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [user]);

  const listings = useMemo(() => {
    const map = new Map<string, string>();
    reviews.forEach((r) => map.set(r.listing_id, r.listing_title));
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (listingFilter !== "all" && r.listing_id !== listingFilter) return false;
      if (ratingFilter !== "all" && r.rating !== Number(ratingFilter)) return false;
      return true;
    });
  }, [reviews, listingFilter, ratingFilter]);

  const avgRating = useMemo(() => {
    if (!filtered.length) return 0;
    return filtered.reduce((sum, r) => sum + r.rating, 0) / filtered.length;
  }, [filtered]);

  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    filtered.forEach((r) => {
      const idx = Math.min(Math.max(Math.round(r.rating) - 1, 0), 4);
      dist[idx]++;
    });
    return dist;
  }, [filtered]);

  const handleRespond = async (response: string) => {
    if (!respondingReview) return;
    const { error } = await supabase
      .from("reviews")
      .update({
        host_response: response,
        host_response_at: new Date().toISOString(),
      } as any)
      .eq("id", respondingReview.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Réponse publiée" });
      fetchReviews();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Note moyenne</p>
              <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total avis</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-2">Répartition</p>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star - 1];
                const pct = filtered.length ? (count / filtered.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3">{star}</span>
                    <Star className="h-3 w-3 text-primary fill-primary" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={listingFilter} onValueChange={setListingFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Tous les biens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les biens</SelectItem>
            {listings.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Toutes les notes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les notes</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => (
              <SelectItem key={n} value={String(n)}>{n} étoile{n > 1 ? "s" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun avis pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => {
            const guestName = `${review.guest_first_name || "Anonyme"} ${review.guest_last_name || ""}`.trim();
            const initials = `${(review.guest_first_name || "A")[0]}${(review.guest_last_name || "")[0] || ""}`.toUpperCase();
            return (
              <Card key={review.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={review.guest_avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{guestName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{review.listing_title}</Badge>
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {review.rating.toFixed(1)}
                      </Badge>
                    </div>
                  </div>

                  {review.text && (
                    <p className="text-foreground leading-relaxed">{review.text}</p>
                  )}

                  {/* Criteria breakdown */}
                  {review.rating_cleanliness != null && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {(Object.keys(CRITERIA_LABELS) as (keyof typeof CRITERIA_LABELS)[]).map((key) => {
                        const val = review[key as keyof HostReview] as number | null;
                        if (val == null) return null;
                        return (
                          <div key={key} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                            <Star className="h-3 w-3 fill-primary text-primary flex-shrink-0" />
                            <span className="font-medium">{val}</span>
                            <span className="text-muted-foreground truncate">{CRITERIA_LABELS[key]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Host response */}
                  {review.host_response ? (
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">Votre réponse</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRespondingReview(review)}
                        >
                          Modifier
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.host_response}</p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRespondingReview(review)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Répondre
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Response dialog */}
      {respondingReview && (
        <HostReviewResponseDialog
          open={!!respondingReview}
          onOpenChange={(open) => !open && setRespondingReview(null)}
          existingResponse={respondingReview.host_response}
          onSubmit={handleRespond}
        />
      )}
    </div>
  );
};

export default HostReviews;
