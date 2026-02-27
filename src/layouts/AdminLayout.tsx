import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { HostSidebar, NavigationItem } from "@/components/host/HostSidebar";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LayoutDashboard, Home, Users, DollarSign, FileText, Loader2, Percent, Calendar, MessageSquare, AlertTriangle, FilePenLine } from "lucide-react";

const adminNavigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Listings", href: "/admin/listings", icon: Home },
  { name: "Bookings", href: "/admin/bookings", icon: Calendar },
  { name: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { name: "Support Chat", href: "/admin/support", icon: MessageSquare },
  { name: "Users & Reviews", href: "/admin/users", icon: Users },
  { name: "Transactions", href: "/admin/transactions", icon: DollarSign },
  { name: "Commissions", href: "/admin/commissions", icon: Percent },
  { name: "Reports & Analytics", href: "/admin/reports", icon: FileText },
  { name: "Content", href: "/admin/content", icon: FilePenLine },
];

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  if (pathname === "/admin/dashboard") return "Dashboard";
  if (pathname === "/admin/listings") return "Listings";
  if (pathname === "/admin/bookings") return "Bookings Management";
  if (pathname === "/admin/disputes") return "Disputes Management";
  if (pathname.startsWith("/admin/review-listing")) return "Review Listing";
  if (pathname === "/admin/users") return "User Management";
  if (pathname === "/admin/transactions") return "Transactions";
  if (pathname === "/admin/commissions") return "Commission Management";
  if (pathname === "/admin/reports") return "Reports & Analytics";
  if (pathname === "/admin/support") return "Support Chat";
  if (pathname === "/admin/content") return "Content Management";
  return "Admin Panel";
};

export default function AdminLayout() {
  const { user } = useAuth();
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <HostSidebar 
        navigationItems={adminNavigationItems}
        logoText="Rentely Admin"
      />
      <div className="flex-1">
        <div className="container mx-auto pt-8">
          <AdminPageHeader 
            title={pageTitle}
            navigationItems={adminNavigationItems}
          />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
