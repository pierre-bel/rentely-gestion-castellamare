import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Bed, Bath, Sofa, ChefHat, LayoutGrid, DoorOpen } from "lucide-react";

export interface BedData {
  type: string;
  count: number;
}

export interface RoomData {
  id: string;
  room_type: string;
  name: string;
  beds: BedData[];
  features: string[];
  sort_order: number;
}

interface StepRoomsProps {
  rooms: RoomData[];
  onRoomsChange: (rooms: RoomData[]) => void;
}

const ROOM_TYPES = [
  { value: "bedroom", label: "Chambre", icon: Bed },
  { value: "bathroom", label: "Salle de bain", icon: Bath },
  { value: "wc", label: "WC", icon: Bath },
  { value: "living_room", label: "Living", icon: Sofa },
  { value: "kitchen", label: "Cuisine", icon: ChefHat },
  { value: "entrance_hall", label: "Hall d'entrée", icon: DoorOpen },
  { value: "night_hall", label: "Hall de nuit", icon: DoorOpen },
  { value: "other", label: "Autre", icon: LayoutGrid },
];

const BED_TYPES = [
  { value: "simple_90", label: "Lit simple (90 cm)" },
  { value: "double_140", label: "Lit double (140 cm)" },
  { value: "queen_160", label: "Lit Queen (160 cm)" },
  { value: "king_180", label: "Lit King (180 cm)" },
  { value: "bunk", label: "Lit superposé" },
  { value: "sofa_bed", label: "Canapé-lit" },
  { value: "baby_crib", label: "Lit bébé" },
];

const BATHROOM_FEATURES = [
  "Douche",
  "Baignoire",
  "WC séparé",
  "Double vasque",
  "Sèche-cheveux",
  "Lave-linge",
];

const StepRooms = ({ rooms, onRoomsChange }: StepRoomsProps) => {
  const addRoom = () => {
    const newRoom: RoomData = {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      room_type: "bedroom",
      name: "",
      beds: [],
      features: [],
      sort_order: rooms.length,
    };
    onRoomsChange([...rooms, newRoom]);
  };

  const updateRoom = (index: number, updates: Partial<RoomData>) => {
    const updated = rooms.map((r, i) => (i === index ? { ...r, ...updates } : r));
    onRoomsChange(updated);
  };

  const removeRoom = (index: number) => {
    onRoomsChange(rooms.filter((_, i) => i !== index));
  };

  const addBed = (roomIndex: number) => {
    const room = rooms[roomIndex];
    const updatedBeds = [...room.beds, { type: "simple_90", count: 1 }];
    updateRoom(roomIndex, { beds: updatedBeds });
  };

  const updateBed = (roomIndex: number, bedIndex: number, updates: Partial<BedData>) => {
    const room = rooms[roomIndex];
    const updatedBeds = room.beds.map((b, i) => (i === bedIndex ? { ...b, ...updates } : b));
    updateRoom(roomIndex, { beds: updatedBeds });
  };

  const removeBed = (roomIndex: number, bedIndex: number) => {
    const room = rooms[roomIndex];
    updateRoom(roomIndex, { beds: room.beds.filter((_, i) => i !== bedIndex) });
  };

  const toggleFeature = (roomIndex: number, feature: string) => {
    const room = rooms[roomIndex];
    const features = room.features.includes(feature)
      ? room.features.filter((f) => f !== feature)
      : [...room.features, feature];
    updateRoom(roomIndex, { features });
  };

  const getRoomIcon = (type: string) => {
    const found = ROOM_TYPES.find((r) => r.value === type);
    return found ? found.icon : LayoutGrid;
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-base text-foreground">
          Détaillez les pièces de votre logement. Pour chaque chambre, précisez les lits disponibles.
        </p>
      </div>

      {rooms.map((room, roomIndex) => {
        const Icon = getRoomIcon(room.room_type);
        return (
          <Card key={room.id} className="relative">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">
                    {ROOM_TYPES.find((r) => r.value === room.room_type)?.label || "Pièce"}
                    {room.name ? ` — ${room.name}` : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRoom(roomIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Type de pièce</Label>
                  <Select
                    value={room.room_type}
                    onValueChange={(val) => updateRoom(roomIndex, { room_type: val, beds: val !== "bedroom" ? [] : room.beds })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Nom (optionnel)</Label>
                  <Input
                    placeholder="Ex : Chambre parentale"
                    value={room.name}
                    onChange={(e) => updateRoom(roomIndex, { name: e.target.value })}
                  />
                </div>
              </div>

              {/* Beds section for bedrooms */}
              {room.room_type === "bedroom" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Lits</Label>
                  {room.beds.map((bed, bedIndex) => (
                    <div key={bedIndex} className="flex items-center gap-3">
                      <Select
                        value={bed.type}
                        onValueChange={(val) => updateBed(roomIndex, bedIndex, { type: val })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BED_TYPES.map((bt) => (
                            <SelectItem key={bt.value} value={bt.value}>
                              {bt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(bed.count)}
                        onValueChange={(val) => updateBed(roomIndex, bedIndex, { count: parseInt(val) })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => removeBed(roomIndex, bedIndex)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addBed(roomIndex)}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un lit
                  </Button>
                </div>
              )}

              {/* Features for bathrooms */}
              {room.room_type === "bathroom" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Équipements</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BATHROOM_FEATURES.map((feature) => (
                      <label
                        key={feature}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={room.features.includes(feature)}
                          onCheckedChange={() => toggleFeature(roomIndex, feature)}
                        />
                        {feature}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button variant="outline" onClick={addRoom} className="w-full gap-2">
        <Plus className="h-4 w-4" />
        Ajouter une pièce
      </Button>
    </div>
  );
};

export default StepRooms;
