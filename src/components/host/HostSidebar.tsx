import { Home, LayoutGrid, Inbox, Calendar, DollarSign, TrendingUp, LogOut, Building2, Menu, Users, Mail, Globe, Euro, SprayCan, Star, BarChart3 } from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { LucideIcon } from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const defaultNavigation: NavigationItem[] = [
  { name: "Tableau de bord", href: "/host/dashboard", icon: LayoutGrid },
  { name: "Mes biens", href: "/host/listings", icon: Home },
  { name: "Calendrier", href: "/host/availability", icon: Calendar },
  { name: "Messages", href: "/host/inbox", icon: Inbox },
  { name: "Réservations", href: "/host/bookings", icon: Calendar },
  { name: "Tarifs", href: "/host/pricing", icon: Euro },
  { name: "Ménage", href: "/host/cleaning", icon: SprayCan },
  { name: "Locataires", href: "/host/tenants", icon: Users },
  { name: "Avis", href: "/host/reviews", icon: Star },
  { name: "Paiements", href: "/host/payouts", icon: DollarSign },
  { name: "E-mails auto", href: "/host/email-automations", icon: Mail },
  { name: "Revenus", href: "/host/earnings-report", icon: TrendingUp },
  { name: "Portail client", href: "/host/portal-settings", icon: Globe },
];

interface SidebarContentProps {
  onNavigate?: () => void;
  navigationItems?: NavigationItem[];
  logoText?: string;
}

const SidebarContent = ({ 
  onNavigate, 
  navigationItems = defaultNavigation,
  logoText = "Rentely"
}: SidebarContentProps) => {
  const { signOut } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    onNavigate?.();
  };

  /**
   * Determines which navigation item should be active based on URL and state
   * Handles special cases like edit-listing and create-listing pages
   */
  const getActiveNavItem = (currentPath: string, locationState: any): string => {
    // Host routes: edit-listing and create-listing pages
    if (currentPath.startsWith("/host/edit-listing/") || currentPath === "/host/create-listing") {
      if (locationState?.from) {
        return locationState.from;
      }
      return "/host/listings";
    }
    
    // Admin routes: review-listing pages
    if (currentPath.startsWith("/admin/review-listing/")) {
      if (locationState?.from) {
        return locationState.from;
      }
      return "/admin/listings";
    }
    
    // For all other routes, return the current path
    return currentPath;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 mb-8 cursor-pointer hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-5 w-5 text-foreground" />
        </div>
        <span className="text-lg font-semibold">{logoText}</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navigationItems.map((item) => {
          const activeNavPath = getActiveNavItem(location.pathname, location.state);
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end
              onClick={onNavigate}
              className={({ isActive }) => {
                // Check if this nav item should be highlighted
                // Either it's the active route, or it matches the contextual route
                const shouldHighlight = isActive || item.href === activeNavPath;
                
                return `flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-colors ${
                  shouldHighlight
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent/50"
                }`;
              }}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Log Out */}
      <Button
        variant="outline"
        onClick={handleLogout}
        className="w-full justify-center gap-3 mt-auto rounded-full border-border bg-transparent text-foreground hover:bg-accent/30"
      >
        <LogOut className="h-5 w-5" />
        <span>Déconnexion</span>
      </Button>
    </div>
  );
};

interface SidebarProps {
  navigationItems?: NavigationItem[];
  logoText?: string;
}

export const HostSidebar = ({ navigationItems, logoText }: SidebarProps) => {
  return (
    <aside className="hidden lg:flex lg:flex-col w-[275px] flex-shrink-0 h-screen border-r border-border bg-card p-7 sticky top-0">
      <SidebarContent 
        navigationItems={navigationItems}
        logoText={logoText}
      />
    </aside>
  );
};

export const MobileHostSidebar = ({ navigationItems, logoText }: SidebarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[275px] p-7 bg-card">
          <SidebarContent 
            onNavigate={() => setOpen(false)}
            navigationItems={navigationItems}
            logoText={logoText}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};
