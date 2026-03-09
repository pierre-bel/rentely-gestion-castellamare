import { Bed, Bath, Sofa, ChefHat, LayoutGrid, DoorOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BedData {
  type: string;
  count: number;
}

interface RoomData {
  id: string;
  room_type: string;
  name: string;
  beds: BedData[] | null;
  features: string[] | null;
  sort_order: number;
}

interface RoomDetailDisplayProps {
  rooms: RoomData[];
  variant?: "card" | "inline";
}

const BED_TYPE_LABELS: Record<string, string> = {
  simple_90: "Lit simple (90 cm)",
  double_140: "Lit double (140 cm)",
  queen_160: "Lit Queen (160 cm)",
  king_180: "Lit King (180 cm)",
  bunk: "Lit superposé",
  sofa_bed: "Canapé-lit",
};

const ROOM_TYPE_CONFIG: Record<string, { label: string; icon: typeof Bed }> = {
  bedroom: { label: "Chambre", icon: Bed },
  bathroom: { label: "Salle de bain", icon: Bath },
  living_room: { label: "Salon", icon: Sofa },
  kitchen: { label: "Cuisine", icon: ChefHat },
  other: { label: "Autre", icon: LayoutGrid },
};

const getRoomLabel = (room: RoomData) => {
  const config = ROOM_TYPE_CONFIG[room.room_type] || ROOM_TYPE_CONFIG.other;
  return room.name || config.label;
};

const getRoomIcon = (type: string) => {
  return (ROOM_TYPE_CONFIG[type] || ROOM_TYPE_CONFIG.other).icon;
};

export const RoomDetailDisplay = ({ rooms, variant = "card" }: RoomDetailDisplayProps) => {
  if (!rooms || rooms.length === 0) return null;

  const sorted = [...rooms].sort((a, b) => a.sort_order - b.sort_order);
  const bedrooms = sorted.filter((r) => r.room_type === "bedroom");
  const bathrooms = sorted.filter((r) => r.room_type === "bathroom");
  const others = sorted.filter((r) => !["bedroom", "bathroom"].includes(r.room_type));

  // Summary counts
  const totalBeds = bedrooms.reduce((sum, r) => {
    return sum + (r.beds || []).reduce((s, b) => s + b.count, 0);
  }, 0);

  if (variant === "inline") {
    return (
      <div className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-3">
          {bedrooms.length > 0 && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
              <DoorOpen className="h-3.5 w-3.5" /> {bedrooms.length} chambre{bedrooms.length > 1 ? "s" : ""}
            </Badge>
          )}
          {totalBeds > 0 && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
              <Bed className="h-3.5 w-3.5" /> {totalBeds} lit{totalBeds > 1 ? "s" : ""}
            </Badge>
          )}
          {bathrooms.length > 0 && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
              <Bath className="h-3.5 w-3.5" /> {bathrooms.length} sdb
            </Badge>
          )}
        </div>

        {/* Detail per room */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map((room) => {
            const Icon = getRoomIcon(room.room_type);
            return (
              <div key={room.id} className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-card">
                <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{getRoomLabel(room)}</p>
                  {room.room_type === "bedroom" && room.beds && room.beds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {room.beds
                        .map((b) => `${b.count}× ${BED_TYPE_LABELS[b.type] || b.type}`)
                        .join(", ")}
                    </p>
                  )}
                  {room.room_type === "bathroom" && room.features && room.features.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {room.features.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Card variant (for portal)
  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Le logement</p>
        
        {/* Summary badges */}
        <div className="flex flex-wrap gap-3">
          {bedrooms.length > 0 && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
              <DoorOpen className="h-3.5 w-3.5" /> {bedrooms.length} chambre{bedrooms.length > 1 ? "s" : ""}
            </Badge>
          )}
          {totalBeds > 0 && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
              <Bed className="h-3.5 w-3.5" /> {totalBeds} lit{totalBeds > 1 ? "s" : ""}
            </Badge>
          )}
          {bathrooms.length > 0 && (
            <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
              <Bath className="h-3.5 w-3.5" /> {bathrooms.length} sdb
            </Badge>
          )}
        </div>

        {/* Detail per room */}
        <div className="space-y-2">
          {sorted.map((room) => {
            const Icon = getRoomIcon(room.room_type);
            return (
              <div key={room.id} className="flex items-start gap-2.5 py-2">
                <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{getRoomLabel(room)}</p>
                  {room.room_type === "bedroom" && room.beds && room.beds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {room.beds
                        .map((b) => `${b.count}× ${BED_TYPE_LABELS[b.type] || b.type}`)
                        .join(", ")}
                    </p>
                  )}
                  {room.room_type === "bathroom" && room.features && room.features.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {room.features.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomDetailDisplay;
