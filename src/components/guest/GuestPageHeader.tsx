import { useState } from "react";
import { MessageSquare, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { MobileGuestSidebar } from "./GuestSidebar";
import { ChatSidebar } from "@/components/inbox/ChatSidebar";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface GuestPageHeaderProps {
  title: string;
  navigationItems?: any[];
  logoText?: string;
}

export const GuestPageHeader = ({ 
  title,
  navigationItems,
  logoText
}: GuestPageHeaderProps) => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = useUnreadMessages(user?.id);

  const handleLogout = async () => {
    await signOut();
    setIsOpen(false);
  };

  const getUserInitials = () => {
    if (!user?.email) return "G";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <MobileGuestSidebar 
          navigationItems={navigationItems}
          logoText={logoText}
        />
        <h1 className="text-2xl lg:text-3xl font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {/* Message Icon with Sidebar */}
        <ChatSidebar
          userRole="guest"
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

        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
