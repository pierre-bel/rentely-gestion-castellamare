import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Users, ArrowLeftRight, BarChart2 } from "lucide-react";

export default function AdminQuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Review Listings",
      icon: Home,
      onClick: () => navigate("/admin/listings"),
    },
    {
      label: "Manage Users",
      icon: Users,
      onClick: () => navigate("/admin/users"),
    },
    {
      label: "Process Refunds",
      icon: ArrowLeftRight,
      onClick: () => navigate("/admin/disputes?filter=refund_pending"),
    },
    {
      label: "Run Reports",
      icon: BarChart2,
      onClick: () => navigate("/admin/reports"),
    },
  ];

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="justify-start rounded-full"
          onClick={action.onClick}
        >
          <action.icon className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
