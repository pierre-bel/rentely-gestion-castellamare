import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  userName: string;
  listingTitle: string;
  listingAddress: string;
  onCreateBooking?: () => void;
  extracting?: boolean;
}

export const ChatHeader = ({
  userName,
  listingTitle,
  listingAddress,
  onCreateBooking,
  extracting,
}: ChatHeaderProps) => {
  return (
    <div className="sticky top-0 bg-white border-b border-border p-4 z-10 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{userName}</h2>
        <p className="text-sm text-muted-foreground truncate">
          {listingTitle} • {listingAddress}
        </p>
      </div>
      {onCreateBooking && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateBooking}
          disabled={extracting}
          className="gap-1.5 shrink-0 text-xs sm:text-sm"
        >
          <CalendarPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{extracting ? "Extraction…" : "Créer réservation"}</span>
          <span className="sm:hidden">{extracting ? "…" : "Réserver"}</span>
        </Button>
      )}
    </div>
  );
};
