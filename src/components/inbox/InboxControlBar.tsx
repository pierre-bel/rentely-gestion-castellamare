import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InboxControlBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export const InboxControlBar = ({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
}: InboxControlBarProps) => {
  return (
    <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-4 border-b bg-white">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 sm:pl-9 bg-white h-8 sm:h-9 text-xs sm:text-sm"
        />
      </div>

      {/* Sort Dropdown */}
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-[110px] sm:w-[160px] bg-white h-8 sm:h-9 text-xs sm:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white z-50">
          <SelectItem value="recent">Récent → Ancien</SelectItem>
          <SelectItem value="oldest">Ancien → Récent</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
