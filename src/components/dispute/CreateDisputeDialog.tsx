import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import FormSelect from "@/components/listing/FormSelect";
import FormInput from "@/components/listing/FormInput";
import FormTextarea from "@/components/listing/FormTextarea";
import { useDemoData } from "@/hooks/useDemoData";

interface CreateDisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  listingTitle: string;
}

const DISPUTE_CATEGORIES = [
  { value: "refund_request", label: "Refund Request" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "property_damage", label: "Property Damage" },
  { value: "cleanliness_issue", label: "Cleanliness Issue" },
  { value: "amenity_issue", label: "Amenity Issue" },
  { value: "safety_concern", label: "Safety Concern" },
  { value: "billing_dispute", label: "Billing Dispute" },
  { value: "other", label: "Other" },
];

export const CreateDisputeDialog = ({
  open,
  onOpenChange,
  bookingId,
  listingTitle,
}: CreateDisputeDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDemoMode, getBooking, createDisputeWithSupportThread } = useDemoData();
  
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [requestedRefund, setRequestedRefund] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (attachmentFiles.length + files.length > 5) {
        toast({
          title: "Too many files",
          description: "You can upload a maximum of 5 images",
          variant: "destructive",
        });
        return;
      }
      
      // Create preview URLs for new images
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setAttachmentFiles([...attachmentFiles, ...files]);
      setPreviewUrls([...previewUrls, ...newPreviews]);
    }
  };

  const handleRemoveFile = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setAttachmentFiles(attachmentFiles.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachmentFiles.length === 0) return [];

    const uploadedUrls: string[] = [];
    setUploadingFiles(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const file of attachmentFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("dispute-attachments")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Store the file path rather than a public URL since the bucket is private
        uploadedUrls.push(fileName);
      }
    } finally {
      setUploadingFiles(false);
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!category || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");
      
      const attachmentUrls = await uploadAttachments();
      const categoryLabel = DISPUTE_CATEGORIES.find(cat => cat.value === category)?.label || "Support Request";
      
      // Demo mode: use localStorage
      if (isDemoMode) {
        // Get listing ID from booking
        const booking = getBooking(bookingId);
        if (!booking) throw new Error("Booking not found");
        
        const result = createDisputeWithSupportThread(
          bookingId,
          booking.listing_id,
          category,
          categoryLabel,
          description,
          requestedRefund ? parseFloat(requestedRefund) : null,
          attachmentUrls
        );
        
        if (!result?.success) {
          throw new Error("Failed to create dispute");
        }

        toast({
          title: "Dispute submitted",
          description: "Our support team will review your case shortly.",
        });

        onOpenChange(false);
        
        // Use same path detection as real mode
        const inboxPath = location.pathname.startsWith("/host") 
          ? "/host/inbox" 
          : location.pathname.startsWith("/admin")
          ? "/host/inbox"
          : "/guest/inbox";
        
        navigate(inboxPath, {
          state: { threadId: result.thread_id },
        });
        return;
      }
      
      // Real mode: call RPC
      const { data: result, error } = await supabase.rpc(
        "create_dispute_with_support_thread",
        {
          p_booking_id: bookingId,
          p_category: category as any,
          p_subject: categoryLabel,
          p_description: description,
          p_requested_refund_amount: requestedRefund ? parseFloat(requestedRefund) : null,
          p_attachment_urls: attachmentUrls,
        }
      );

      if (error) throw error;

      const response = result as { success: boolean; error?: string; thread_id?: string };

      if (!response?.success) {
        throw new Error(response?.error || "Failed to create dispute");
      }

      toast({
        title: "Dispute submitted",
        description: "Our support team will review your case shortly.",
      });

      onOpenChange(false);

      const inboxPath = location.pathname.startsWith("/host") 
        ? "/host/inbox" 
        : location.pathname.startsWith("/admin")
        ? "/host/inbox"
        : "/guest/inbox";
      
      navigate(inboxPath, {
        state: { threadId: response.thread_id },
      });
    } catch (error: any) {
      console.error("Error creating dispute:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit dispute. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Report an Issue or Contact Support</DialogTitle>
          <DialogDescription>
            Submit a dispute or issue regarding your booking for <strong>{listingTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto -mx-2 px-2"
          style={{ maxHeight: 'calc(90vh - 200px)' }}
        >
          <FormSelect
            label="Issue Category *"
            value={category}
            onChange={setCategory}
            options={DISPUTE_CATEGORIES}
            required
          />

          <FormTextarea
            label="Description *"
            value={description}
            onChange={setDescription}
            required
            rows={6}
          />
          <p className="text-xs text-muted-foreground -mt-4">
            {description.length}/2000 characters
          </p>

          <div className="relative">
            <input
              type="number"
              placeholder=" "
              value={requestedRefund}
              onChange={(e) => setRequestedRefund(e.target.value)}
              min="0"
              step="0.01"
              className="peer h-14 w-full rounded-full pl-10 pr-6 border border-[#D5DAE7] bg-white text-base placeholder-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:border-primary"
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-base text-foreground pointer-events-none z-10">
              $
            </span>
            <label className="absolute left-10 top-1/2 -translate-y-1/2 text-base text-muted-foreground transition-all duration-200 pointer-events-none peer-focus:top-0 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-white peer-focus:px-2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-2">
              Requested Refund Amount (Optional)
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Image Attachments (Optional, max 5 images)</p>
            <div className="border-2 border-dashed border-[#D5DAE7] rounded-2xl p-6 bg-white">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload images
                </p>
              </label>
            </div>

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      className="absolute top-1 right-1 h-7 w-7 p-0 opacity-90 group-hover:opacity-100 transition-opacity"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || uploadingFiles}>
            {loading || uploadingFiles ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadingFiles ? "Uploading..." : "Submitting..."}
              </>
            ) : (
              "Submit Dispute"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
