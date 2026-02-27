import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoData } from "@/hooks/useDemoData";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PriceSummaryTable from "@/components/shared/PriceSummaryTable";
import LocationMap from "@/components/listing/LocationMap";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  city: string;
  host_user_id: string;
  cover_image: string | null;
  images: string[];
  base_price: number;
  cleaning_fee: number;
  house_rules: string | null;
  check_in_time: string;
  check_out_time: string;
  min_nights: number;
  max_nights: number | null;
  address: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
}

type Section = "photos" | "title" | "price" | "rules" | "cancellation" | "map" | "final";

interface SectionFeedback {
  status: "approved" | "rejected";
  comment: string | null;
}

interface FeedbackState {
  photos?: SectionFeedback;
  title_description?: SectionFeedback;
  price_summary?: SectionFeedback;
  rules?: SectionFeedback;
  map?: SectionFeedback;
}

const sections = [
  { id: "photos" as Section, label: "Photos" },
  { id: "title" as Section, label: "Title & Description" },
  { id: "price" as Section, label: "Price Summary" },
  { id: "rules" as Section, label: "Rules" },
  { id: "map" as Section, label: "Map" },
  { id: "final" as Section, label: "Final Review" },
];

export default function ReviewListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDemoMode, getAdminListing, updateAdminListingStatus, getModerationFeedback } = useDemoData();
  const [listing, setListing] = useState<Listing | null>(null);
  const [hostProfile, setHostProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("photos");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Local state for all feedback
  const [feedback, setFeedback] = useState<FeedbackState>({});
  
  // Completed sections tracking
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set());
  
  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [currentRejectionKey, setCurrentRejectionKey] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      if (isDemoMode) {
        // DEMO MODE: Get from localStorage
        const listingData = getAdminListing(id);
        
        if (!listingData) {
          toast.error("Listing not found");
          navigate("/admin/listings");
          return;
        }
        
        setListing(listingData.listing);
        setHostProfile(listingData.host);
        
        // Get existing moderation feedback
        const existingFeedback = getModerationFeedback(id);
        if (existingFeedback.length > 0) {
          const feedbackMap: FeedbackState = {};
          existingFeedback.forEach((f: any) => {
            feedbackMap[f.section_key] = {
              status: f.status,
              comment: f.comment,
            };
          });
          setFeedback(feedbackMap);
        }
      } else {
        // REAL MODE: Fetch from Supabase
        const { data: listingData, error: listingError } = await supabase
          .from("listings")
          .select("id, title, description, city, host_user_id, cover_image, images, base_price, cleaning_fee, house_rules, checkin_from, checkout_until, min_nights, max_nights, address, state, postal_code, country, latitude, longitude")
          .eq("id", id)
          .maybeSingle();

        if (listingError || !listingData) {
          toast.error("Failed to load listing");
          navigate("/admin/listings");
          return;
        }

        // Map database fields to component state
        setListing({
          ...listingData,
          check_in_time: listingData.checkin_from || "15:00",
          check_out_time: listingData.checkout_until || "11:00",
        });

        // Fetch host profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", listingData.host_user_id)
          .maybeSingle();

        if (profileData) {
          setHostProfile(profileData);
        }

        // Fetch existing moderation feedback
        const { data: existingFeedback } = await supabase
          .from("listing_moderation_feedback")
          .select("*")
          .eq("listing_id", id);

        if (existingFeedback && existingFeedback.length > 0) {
          const feedbackMap: FeedbackState = {};
          existingFeedback.forEach((f) => {
            feedbackMap[f.section_key] = {
              status: f.status as "approved" | "rejected",
              comment: f.comment,
            };
          });
          setFeedback(feedbackMap);
        }
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
      toast.error("Failed to load listing");
      navigate("/admin/listings");
    } finally {
      setLoading(false);
    }
  };

  const updateFeedback = (key: string, status: "approved" | "rejected") => {
    setFeedback((prev) => ({
      ...prev,
      [key]: {
        status,
        comment: prev[key]?.comment || null,
      },
    }));
  };

  const handleNext = () => {
    // Get current section keys
    const currentSectionKeys = getSectionKeys(activeSection);
    
    // Initialize any missing section with default "approved" status
    const updatedFeedback = { ...feedback };
    let needsUpdate = false;
    
    currentSectionKeys.forEach((key) => {
      if (!updatedFeedback[key]) {
        updatedFeedback[key] = {
          status: "approved",
          comment: null,
        };
        needsUpdate = true;
      }
    });
    
    // Update state if any sections were initialized
    if (needsUpdate) {
      setFeedback(updatedFeedback);
    }
    
    // Check current section for rejected items without comments
    const missingComments = currentSectionKeys.filter(
      (key) => updatedFeedback[key]?.status === "rejected" && !updatedFeedback[key]?.comment
    );

    if (missingComments.length > 0) {
      // Show modal for the first missing comment
      setCurrentRejectionKey(missingComments[0]);
      setRejectionComment("");
      setShowRejectionModal(true);
      return;
    }

    // Mark current section as completed
    setCompletedSections((prev) => new Set(prev).add(activeSection));

    // Navigate to next section
    const currentIndex = sections.findIndex((s) => s.id === activeSection);
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = sections.findIndex((s) => s.id === activeSection);
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1].id);
    }
  };

  const getSectionKeys = (section: Section): string[] => {
    switch (section) {
      case "photos":
        return ["photos"];
      case "title":
        return ["title_description"];
      case "price":
        return ["price_summary"];
      case "rules":
        return ["rules"];
      case "map":
        return ["map"];
      default:
        return [];
    }
  };

  const confirmRejection = () => {
    if (!currentRejectionKey || !rejectionComment.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    // Save the comment to local state
    setFeedback((prev) => ({
      ...prev,
      [currentRejectionKey]: {
        status: "rejected",
        comment: rejectionComment.trim(),
      },
    }));

    // Close the modal and clear state
    setShowRejectionModal(false);
    setRejectionComment("");
    
    // Check if there are more rejected items without comments in current section
    const currentSectionKeys = getSectionKeys(activeSection);
    const remainingMissingComments = currentSectionKeys.filter(
      (key) => {
        // Skip the one we just added a comment to
        if (key === currentRejectionKey) return false;
        // Check if it's rejected without a comment
        return feedback[key]?.status === "rejected" && !feedback[key]?.comment;
      }
    );

    setCurrentRejectionKey(null);

    if (remainingMissingComments.length > 0) {
      // Show modal for the next missing comment
      setCurrentRejectionKey(remainingMissingComments[0]);
      setRejectionComment("");
      setShowRejectionModal(true);
    } else {
      // All comments are provided, mark section as complete and navigate
      setCompletedSections((prev) => new Set(prev).add(activeSection));
      
      // Navigate to next section
      const currentIndex = sections.findIndex((s) => s.id === activeSection);
      if (currentIndex < sections.length - 1) {
        setActiveSection(sections[currentIndex + 1].id);
      }
    }
  };

  const getSectionLabel = (key: string): string => {
    const labels: Record<string, string> = {
      photos: "Photos",
      title_description: "Title & Description",
      price_summary: "Price Summary",
      rules: "Rules",
      map: "Map",
    };
    return labels[key] || key;
  };

  const hasAnyRejection = Object.values(feedback).some((item) => item?.status === "rejected");
  const allSectionsReviewed = ["photos", "title_description", "price_summary", "rules", "map"].every(
    (key) => feedback[key]?.status
  );

  const handleApproveListing = async () => {
    if (!id || !listing) return;
    
    // Pre-save validation
    const requiredSections = ["photos", "title_description", "price_summary", "rules", "map"];
    const missingReviews = requiredSections.filter((key) => !feedback[key]?.status);
    
    if (missingReviews.length > 0) {
      toast.error("Please review all sections before approving");
      return;
    }
    
    setSaving(true);
    
    try {
      if (isDemoMode) {
        // DEMO MODE: Update localStorage
        updateAdminListingStatus(id, "approved");
        
        // Invalidate queries to refresh the listings
        await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-recent-listings"] });
        
        toast.success("Listing approved successfully");
        navigate("/admin/listings");
        return;
      }
      
      // REAL MODE: Step 1: Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("Authentication error:", authError);
        toast.error("Not authenticated. Please log in again.");
        setSaving(false);
        return;
      }

      // Step 2: Transform feedback state into database records
      const feedbackRecords = Object.entries(feedback).map(([sectionKey, sectionFeedback]) => ({
        listing_id: id,
        admin_user_id: user.id,
        section_key: sectionKey,
        status: sectionFeedback.status,
        comment: sectionFeedback.comment,
        is_resolved: false,
      }));

      // Step 3.1: Persist feedback FIRST (critical operation)
      const { error: feedbackError } = await supabase
        .from("listing_moderation_feedback")
        .insert(feedbackRecords);

      if (feedbackError) {
        console.error("Error saving feedback:", feedbackError);
        toast.error("Failed to save moderation feedback. Please try again.");
        setSaving(false);
        return;
      }

      // Step 3.2: Update listing status SECOND (only after feedback is saved)
      const { error: updateError } = await supabase
        .from("listings")
        .update({ 
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating listing status:", updateError);
        toast.error("Feedback saved, but failed to update listing status. Please contact support.");
        setSaving(false);
        return;
      }

      toast.success("Listing approved successfully");
      navigate("/admin/listings");
    } catch (error) {
      console.error("Unexpected error during approval:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setSaving(false);
    }
  };

  const handleRejectListing = async () => {
    if (!id || !listing) return;
    
    // Pre-save validation
    const requiredSections = ["photos", "title_description", "price_summary", "rules", "map"];
    const missingReviews = requiredSections.filter((key) => !feedback[key]?.status);
    
    if (missingReviews.length > 0) {
      toast.error("Please review all sections before rejecting");
      return;
    }
    
    // Validate that all rejected items have comments
    const rejectedWithoutComments = Object.entries(feedback).filter(
      ([_, sectionFeedback]) => sectionFeedback.status === "rejected" && !sectionFeedback.comment?.trim()
    );
    
    if (rejectedWithoutComments.length > 0) {
      toast.error("All rejected sections must have comments explaining the issues");
      return;
    }
    
    setSaving(true);
    
    try {
      const rejectionComments = Object.entries(feedback)
        .filter(([_, value]) => value.status === "rejected" && value.comment)
        .map(([key, value]) => ({
          section_key: key,
          status: "rejected",
          comment: value.comment,
        }));

      if (isDemoMode) {
        // DEMO MODE: Save to localStorage
        updateAdminListingStatus(id, "rejected", rejectionComments);
        
        // Invalidate queries to refresh the listings
        await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-recent-listings"] });
        
        toast.success("Listing rejected with feedback");
        navigate("/admin/listings");
        return;
      }
      
      // REAL MODE: Step 1: Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("Authentication error:", authError);
        toast.error("Not authenticated. Please log in again.");
        setSaving(false);
        return;
      }

      // Step 2: Transform feedback state into database records
      const feedbackRecords = Object.entries(feedback).map(([sectionKey, sectionFeedback]) => ({
        listing_id: id,
        admin_user_id: user.id,
        section_key: sectionKey,
        status: sectionFeedback.status,
        comment: sectionFeedback.comment,
        is_resolved: false,
      }));

      // Step 3.1: Persist feedback FIRST (critical operation)
      const { error: feedbackError } = await supabase
        .from("listing_moderation_feedback")
        .insert(feedbackRecords);

      if (feedbackError) {
        console.error("Error saving feedback:", feedbackError);
        toast.error("Failed to save moderation feedback. Please try again.");
        setSaving(false);
        return;
      }

      // Step 3.2: Update listing status SECOND (only after feedback is saved)
      const { error: updateError } = await supabase
        .from("listings")
        .update({ 
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating listing status:", updateError);
        toast.error("Feedback saved, but failed to update listing status. Please contact support.");
        setSaving(false);
        return;
      }

      toast.success("Listing rejected and returned to host with feedback");
      navigate("/admin/listings");
    } catch (error) {
      console.error("Unexpected error during rejection:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setSaving(false);
    }
  };

  const allImages = listing
    ? [listing.cover_image, ...(listing.images || [])].filter(Boolean)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  const hostName = hostProfile
    ? `${hostProfile.first_name || ""} ${hostProfile.last_name || ""}`.trim()
    : "Unknown";

  return (
    <div className="pb-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Go Back
      </Button>

      <div className="flex gap-6">
        {/* Left Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-card rounded-lg border border-border p-2">
            <h3 className="text-base font-semibold text-primary px-3 py-2">
              Sections for Review
            </h3>
            <nav className="space-y-1">
              {sections.map((section) => {
                const isCompleted = completedSections.has(section.id);
                const isActive = activeSection === section.id;
                const isAccessible = section.id === "photos" || section.id === "title" || section.id === "price" || section.id === "rules" || section.id === "map" || section.id === "final";
                
                // Check if section has any rejected items
                const sectionKeys = getSectionKeys(section.id);
                const hasRejection = sectionKeys.some(key => feedback[key]?.status === "rejected");

                return (
                  <button
                    key={section.id}
                    onClick={() => isAccessible && setActiveSection(section.id)}
                    disabled={!isAccessible}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-full text-sm transition-colors flex items-center gap-2",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground hover:bg-accent",
                      !isAccessible && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isCompleted && !hasRejection && <Check className="h-4 w-4 text-success" />}
                    {hasRejection && <X className="h-4 w-4 text-destructive" />}
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 bg-card rounded-lg border border-border p-6">
          {/* Persistent Header */}
          <div className="mb-6 pb-4 border-b border-border">
            <div className="grid grid-cols-3 gap-4">
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground mb-1">Listing</div>
                <div className="font-medium text-sm truncate">{listing.title}</div>
              </div>
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground mb-1">City</div>
                <div className="font-medium text-sm truncate">{listing.city}</div>
              </div>
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground mb-1">Host</div>
                <div className="font-medium text-sm truncate">{hostName}</div>
              </div>
            </div>
          </div>

          {/* Dynamic Content - Photos Section */}
          {activeSection === "photos" && (
            <div className="space-y-6">
              {/* Photo Gallery */}
              <div className="grid grid-cols-2 gap-4">
                {allImages.map((image, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedImage(image)}
                    className="relative aspect-video rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={image}
                      alt={`Listing photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Moderator Actions */}
              <div className="flex items-center justify-end gap-8 pt-4">
                <RadioGroup
                  value={feedback.photos?.status || "approved"}
                  onValueChange={(value) => updateFeedback("photos", value as "approved" | "rejected")}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rejected" id="photos-reject" />
                    <Label htmlFor="photos-reject" className="cursor-pointer">
                      Reject
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="approved" id="photos-approve" />
                    <Label htmlFor="photos-approve" className="cursor-pointer">
                      Approve
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Dynamic Content - Title & Description Section */}
          {activeSection === "title" && (
            <div className="space-y-8">
              {/* Combined Title & Description Block */}
              <div className="space-y-6">
                <div className="bg-[#F8FAFF] rounded-lg p-3">
                  <div className="text-sm text-muted-foreground mb-2">
                    Listing Title
                  </div>
                  <p className="text-sm leading-relaxed">{listing.title}</p>
                </div>

                <div className="bg-[#F8FAFF] rounded-lg p-3">
                  <div className="text-sm text-muted-foreground mb-2">
                    Listing Description
                  </div>
                  <p className="text-sm leading-relaxed">{listing.description || "No description provided"}</p>
                </div>
              </div>

              {/* Single Shared Approve/Reject for entire section */}
              <div className="flex items-center justify-end gap-8 pt-4">
                <RadioGroup
                  value={feedback.title_description?.status || "approved"}
                  onValueChange={(value) => updateFeedback("title_description", value as "approved" | "rejected")}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rejected" id="title-desc-reject" />
                    <Label htmlFor="title-desc-reject" className="cursor-pointer">
                      Reject
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="approved" id="title-desc-approve" />
                    <Label htmlFor="title-desc-approve" className="cursor-pointer">
                      Approve
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Dynamic Content - Price Summary Section */}
          {activeSection === "price" && (
            <div className="space-y-6">
              <PriceSummaryTable 
                base_price={listing.base_price} 
                cleaning_fee={listing.cleaning_fee} 
              />

              {/* Moderator Actions */}
              <div className="flex items-center justify-end gap-8 pt-4">
                <RadioGroup
                  value={feedback.price_summary?.status || "approved"}
                  onValueChange={(value) => updateFeedback("price_summary", value as "approved" | "rejected")}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rejected" id="price-reject" />
                    <Label htmlFor="price-reject" className="cursor-pointer">
                      Reject
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="approved" id="price-approve" />
                    <Label htmlFor="price-approve" className="cursor-pointer">
                      Approve
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Dynamic Content - Rules Section */}
          {activeSection === "rules" && (
            <div className="space-y-6">
              <div className="bg-[#F8FAFF] rounded-lg p-3">
                <div className="space-y-4">
                  {/* House Rules Header */}
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Rules</div>
                    <p className="text-base font-medium text-foreground mb-3">When staying at this property, please adhere to the following rules:</p>
                  </div>

                  {/* Rules List */}
                  {listing.house_rules && (
                    <ul className="list-decimal list-inside space-y-1 text-sm text-foreground">
                      {listing.house_rules.split('\n').map((rule, index) => (
                        rule.trim() && <li key={index}>{rule.trim()}</li>
                      ))}
                      <li>Check-in is at {listing.check_in_time} and check-out is at {listing.check_out_time}.</li>
                    </ul>
                  )}

                  {/* Stay Duration */}
                  <div className="text-sm text-foreground space-y-1">
                    <p>Minimum stay: {listing.min_nights} night(s)</p>
                    {listing.max_nights && <p>Maximum stay: {listing.max_nights} night(s)</p>}
                  </div>
                </div>
              </div>

              {/* Moderator Actions */}
              <div className="flex items-center justify-end gap-8 pt-4">
                <RadioGroup
                  value={feedback.rules?.status || "approved"}
                  onValueChange={(value) => updateFeedback("rules", value as "approved" | "rejected")}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rejected" id="rules-reject" />
                    <Label htmlFor="rules-reject" className="cursor-pointer">
                      Reject
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="approved" id="rules-approve" />
                    <Label htmlFor="rules-approve" className="cursor-pointer">
                      Approve
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Dynamic Content - Map Section */}
          {activeSection === "map" && (
            <div className="space-y-6 isolate">
              {/* Map Display */}
              {listing.latitude && listing.longitude && (
                <div className="w-full h-[300px] rounded-lg overflow-hidden">
                  <LocationMap 
                    latitude={listing.latitude} 
                    longitude={listing.longitude} 
                  />
                </div>
              )}

              {/* Address and Coordinates */}
              <div className="grid grid-cols-2 gap-6">
                {/* Full Address */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div className="text-sm text-foreground">
                    {listing.address}
                    {listing.city && `, ${listing.city}`}
                    {listing.state && `, ${listing.state}`}
                    {listing.postal_code && ` ${listing.postal_code}`}
                    {listing.country && `, ${listing.country}`}
                  </div>
                </div>

                {/* Coordinates - Latitude and Longitude as separate columns */}
                <div className="flex gap-8">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Latitude</div>
                    <div className="text-sm text-foreground">{listing.latitude}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Longitude</div>
                    <div className="text-sm text-foreground">{listing.longitude}</div>
                  </div>
                </div>
              </div>

              {/* Moderator Actions */}
              <div className="flex items-center justify-end gap-8 pt-4">
                <RadioGroup
                  value={feedback.map?.status || "approved"}
                  onValueChange={(value) => updateFeedback("map", value as "approved" | "rejected")}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rejected" id="map-reject" />
                    <Label htmlFor="map-reject" className="cursor-pointer">
                      Reject
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="approved" id="map-approve" />
                    <Label htmlFor="map-approve" className="cursor-pointer">
                      Approve
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Dynamic Content - Final Review Section */}
          {activeSection === "final" && (
            <div className="space-y-6">
              {/* Summary Table */}
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background hover:bg-background">
                      <TableHead className="font-semibold">Section</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(feedback).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{getSectionLabel(key)}</TableCell>
                        <TableCell>
                          <StatusBadge status={value.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {value.comment || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Final Action Buttons */}
              <div className="flex items-center justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="rounded-full px-8"
                  disabled={saving}
                >
                  Back
                </Button>
                
                <div className="flex gap-4">
                  {hasAnyRejection ? (
                    <Button
                      onClick={handleRejectListing}
                      disabled={!allSectionsReviewed || saving}
                      className="rounded-full px-8 bg-primary"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Reject & Return"
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleApproveListing}
                      disabled={!allSectionsReviewed || saving}
                      className="rounded-full px-8 bg-primary"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Approve Listing"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons - Only show on non-final sections */}
          {activeSection !== "final" && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={activeSection === "photos"}
                className="rounded-full px-8"
              >
                Back
              </Button>
              <Button onClick={handleNext} className="rounded-full px-8 bg-primary">
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full size preview"
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Modal */}
      <Dialog open={showRejectionModal} onOpenChange={(open) => {
        if (!open) {
          setShowRejectionModal(false);
          setRejectionComment("");
          setCurrentRejectionKey(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Reason for Rejection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please Describe why you're rejecting this section
            </p>
            <Textarea
              placeholder="Reason For Rejection"
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectionModal(false);
                setRejectionComment("");
                setCurrentRejectionKey(null);
              }}
              className="rounded-full px-8"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRejection}
              disabled={!rejectionComment.trim()}
              className="rounded-full px-8 bg-primary"
              type="button"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
