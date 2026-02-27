import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { MobileHostSidebar, NavigationItem } from "@/components/host/HostSidebar";
import { ChatSidebar } from "@/components/inbox/ChatSidebar";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface AdminPageHeaderProps {
  title: string;
  navigationItems: NavigationItem[];
}

export const AdminPageHeader = ({ title, navigationItems }: AdminPageHeaderProps) => {
  const { signOut, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const unreadCount = useUnreadMessages(user?.id, true);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await signOut();
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user?.email) return "A";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between mb-8">
      {/* Left Side - Title */}
      <div className="flex items-center gap-3">
        <MobileHostSidebar 
          navigationItems={navigationItems}
          logoText="Admin Portal"
        />
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>

      {/* Right Side - Icons and Avatar */}
      <div className="flex items-center gap-3">
        {/* Message Icon with Sidebar */}
        <ChatSidebar
          userRole="admin"
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 bg-white hover:bg-white/90 relative"
            >
              <MessageSquare className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
              )}
            </Button>
          }
        />

        {/* User Avatar with Dropdown */}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 p-0"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src="" alt={user?.email || "Admin"} />
                <AvatarFallback className="bg-primary text-primary-foreground">
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
