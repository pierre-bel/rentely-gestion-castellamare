import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, DollarSign, Shield, Calendar, Loader2, Users2, TrendingUp, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { demoStorage } from "@/lib/demoStorage";
import Footer from "@/components/Footer";

const BecomeHost = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleBecomeHost = async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Check if user is logged in, logout if yes
      if (user) {
        await signOut();
        // Wait for logout to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Step 2: Login as demo host
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "host@demo.com",
        password: "demohost12345",
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to login");

      // Step 3: Wait for data migration to complete
      const waitForMigration = async (userId: string, maxAttempts = 20): Promise<boolean> => {
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            const snapshot = demoStorage.getSnapshot(userId);
            // Check if listings data exists (indicates migration complete)
            if (snapshot.listings && snapshot.listings.length > 0) {
              console.log('✅ Migration complete, listings found:', snapshot.listings.length);
              return true;
            }
          } catch (err) {
            console.log('⏳ Waiting for migration...', i + 1);
          }
        }
        return false;
      };

      // Show loading toast
      toast({
        title: "Loading Demo Data",
        description: "Please wait while we load your demo data...",
      });

      const migrationSuccess = await waitForMigration(data.user.id);

      if (migrationSuccess) {
        toast({
          title: "Demo Mode Activated",
          description: "You're now using demo host mode with sample data.",
        });

        // Step 4: Redirect to host dashboard
        navigate("/host/dashboard");
      } else {
        throw new Error("Data migration timeout. Please try again.");
      }
    } catch (error: any) {
      console.error("Demo login error:", error);
      toast({
        title: "Demo login failed",
        description: error.message || "Failed to activate demo mode",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Earn money as a Host</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Share your space and earn extra income by hosting guests from around the world. Join thousands of hosts making money on their terms.
            </p>
            <Button 
              size="lg" 
              onClick={handleBecomeHost}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading demo...
                </>
              ) : (
                "Become a Host"
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Why Host with Rentely?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Easy Setup</h3>
              <p className="text-sm text-muted-foreground">
                List your space in minutes with our simple setup process
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Earn Money</h3>
              <p className="text-sm text-muted-foreground">
                Set your own prices and earn extra income on your terms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Secure Platform</h3>
              <p className="text-sm text-muted-foreground">
                Protected payments and verified guest reviews for peace of mind
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Full Control</h3>
              <p className="text-sm text-muted-foreground">
                Manage your calendar and availability whenever you want
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center relative">
              <div className="mb-4 relative">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Home className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">List your space</h3>
              <p className="text-sm text-muted-foreground">
                Create your listing in minutes with photos and details about your property
              </p>
              <div className="hidden md:block absolute top-8 -right-4 text-muted-foreground">
                <ArrowRight className="h-6 w-6" />
              </div>
            </div>

            <div className="flex flex-col items-center text-center relative">
              <div className="mb-4 relative">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users2 className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Welcome guests</h3>
              <p className="text-sm text-muted-foreground">
                Approve bookings and communicate with guests through our messaging system
              </p>
              <div className="hidden md:block absolute top-8 -right-4 text-muted-foreground">
                <ArrowRight className="h-6 w-6" />
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 relative">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Get paid</h3>
              <p className="text-sm text-muted-foreground">
                Receive automatic payouts after each stay, securely transferred to your account
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of hosts earning extra income by sharing their spaces
          </p>
          <Button 
            size="lg" 
            onClick={handleBecomeHost}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading demo...
              </>
            ) : (
              "Become a Host"
            )}
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BecomeHost;
