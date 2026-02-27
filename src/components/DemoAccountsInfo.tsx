import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, UserCog, Shield } from "lucide-react";

export const DemoAccountsInfo = () => {
  const accounts = [
    {
      role: "Admin",
      email: "demo.admin@example.com",
      password: "demo123",
      icon: Shield,
      description: "Full access to admin dashboard, user management, and all features"
    },
    {
      role: "Host",
      email: "demo.host@example.com",
      password: "demo123",
      icon: UserCog,
      description: "Access to host dashboard, listings, bookings, and earnings"
    },
    {
      role: "Guest",
      email: "demo.guest@example.com",
      password: "demo123",
      icon: User,
      description: "Access to guest dashboard, bookings, messages, and payments"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">Demo Accounts</h3>
        <p className="text-muted-foreground">
          Try our platform with pre-configured demo accounts. All changes reset on logout.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {accounts.map((account) => {
          const Icon = account.icon;
          return (
            <Card key={account.role} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-8 w-8 text-primary" />
                  <Badge variant="secondary">Demo</Badge>
                </div>
                <CardTitle>{account.role}</CardTitle>
                <CardDescription className="min-h-[3rem]">
                  {account.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-semibold">Email:</span>
                  <p className="text-muted-foreground break-all">{account.email}</p>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Password:</span>
                  <p className="text-muted-foreground">{account.password}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-center text-muted-foreground">
            ℹ️ Demo accounts provide full functionality, but all changes are temporary and will be cleared when you log out.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
