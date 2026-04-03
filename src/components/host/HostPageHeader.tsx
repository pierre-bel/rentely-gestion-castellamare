import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { MobileHostSidebar } from "./HostSidebar";
import { CreateManualBookingDialog } from "./CreateManualBookingDialog";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

interface HostPageHeaderProps {
  title: string;
}

export const HostPageHeader = ({ title }: HostPageHeaderProps) => {
  const { signOut, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [createBookingOpen, setCreateBookingOpen] = useState(false);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await signOut();
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user?.email) return "H";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between mb-8">
      {/* Left Side - Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <MobileHostSidebar />
        <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{title}</h1>
      </div>

      {/* Right Side - Icons and Avatar */}
      <div className="flex items-center gap-3">
        {/* Add Booking Button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 bg-white hover:bg-white/90"
          onClick={() => setCreateBookingOpen(true)}
          title="Ajouter une réservation"
        >
          <Plus className="h-5 w-5" />
        </Button>

        <CreateManualBookingDialog
          open={createBookingOpen}
          onOpenChange={setCreateBookingOpen}
        />

        {/* User Avatar with Dropdown */}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 p-0"
            >
              <Avatar className="w-10 h-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <AvatarImage src="" alt={user?.email || "Host"} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent-cool text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card">
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
