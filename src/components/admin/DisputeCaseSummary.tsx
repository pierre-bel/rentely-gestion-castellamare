import { useState } from "react";
import { Card } from "@/components/ui/card";
import { User, Home, MapPin, DollarSign, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ImagePreviewDialog } from "./ImagePreviewDialog";

interface DisputeCaseSummaryProps {
  dispute: any;
  guest: any;
  host: any;
  listing: any;
  booking: any;
}

const getCategoryLabel = (category: string): string => {
  const labelMap: Record<string, string> = {
    refund_request: "Refund Request",
    policy_violation: "Policy Violation",
    property_damage: "Property Damage",
    cleanliness_issue: "Cleanliness Issue",
    amenity_issue: "Amenity Issue",
    safety_concern: "Safety Concern",
    billing_dispute: "Billing Dispute",
    other: "Other",
  };
  return labelMap[category] || category;
};

export const DisputeCaseSummary = ({ dispute, guest, host, listing, booking }: DisputeCaseSummaryProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const attachments = dispute.attachments || [];
  
  return (
    <>
      <Card className="bg-[#F8FAFF] border-[#D5DAE7] p-6 space-y-4">
        <h3 className="text-lg font-semibold">Case Summary</h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Category</div>
              <div className="text-sm font-medium mt-1">{getCategoryLabel(dispute.category)}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Guest</div>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={guest.avatar_url} />
                  <AvatarFallback>{guest.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{guest.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Home className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Host</div>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={host.avatar_url} />
                  <AvatarFallback>{host.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{host.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Location</div>
              <div className="text-sm font-medium mt-1">{listing.city}, {listing.country}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="text-sm font-medium mt-1">
                ${dispute.requested_refund_amount?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#D5DAE7]">
          <div className="text-xs text-muted-foreground mb-2">Reason</div>
          <p className="text-sm line-clamp-3">{dispute.description}</p>
        </div>

      </Card>

      {attachments.length > 0 && (
        <Card className="bg-[#F8FAFF] border-[#D5DAE7] p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="text-lg font-semibold">Attachments</span>
          </div>
          <div className="space-y-2">
            {attachments.map((url: string, index: number) => {
              const filename = url.split('/').pop() || `attachment-${index + 1}.png`;
              return (
                <div key={index} className="flex items-center justify-between text-sm py-1">
                  <span className="truncate flex-1">{filename}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setPreviewImage(url)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <ImagePreviewDialog 
        imageUrl={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />
    </>
  );
};
