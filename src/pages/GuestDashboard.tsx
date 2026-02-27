import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, CreditCard, MessageSquare, Settings, ArrowLeft } from "lucide-react";
import { AuthDialog } from "@/components/AuthDialog";
import GuestBookings from "@/pages/guest/Bookings";
import GuestPayments from "@/components/guest/GuestPayments";
import GuestProfile from "@/components/guest/GuestProfile";

const GuestDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("bookings");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Login Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Please login to access your dashboard
              </p>
              <Button onClick={() => setAuthDialogOpen(true)}>
                Login
              </Button>
            </CardContent>
          </Card>
        </div>
        <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Guest Dashboard</h1>
          <p className="text-muted-foreground">Manage your bookings, payments, and profile</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <GuestBookings />
          </TabsContent>

          <TabsContent value="payments">
            <GuestPayments />
          </TabsContent>

          <TabsContent value="profile">
            <GuestProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GuestDashboard;
