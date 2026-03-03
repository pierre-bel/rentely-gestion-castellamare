import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { demoStorage } from "@/lib/demoStorage";
import { Separator } from "@/components/ui/separator";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const [loadingStates, setLoadingStates] = useState({
    regular: false,
    guestDemo: false,
    hostDemo: false,
    adminDemo: false,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingStates(prev => ({ ...prev, regular: true }));

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Compte créé !",
        description: "Votre compte a été créé avec succès.",
      });
      onOpenChange(false);
      navigate("/host/dashboard");
    }
    setLoadingStates(prev => ({ ...prev, regular: false }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingStates(prev => ({ ...prev, regular: true }));

    const demoEmails = ["demo.admin@example.com", "demo.host@example.com", "demo.guest@example.com"];
    const isDemoEmail = demoEmails.includes(email.toLowerCase());

    let { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If login fails with demo credentials, auto-create the account
    if (error && isDemoEmail && password === "demo123") {
      const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: email.includes("admin") ? "Demo" : email.includes("host") ? "Demo" : "Demo",
            last_name: email.includes("admin") ? "Admin" : email.includes("host") ? "Host" : "Guest",
          },
        },
      });

      if (signUpError) {
        toast({
          title: "Login failed",
          description: signUpError.message,
          variant: "destructive",
        });
        setLoadingStates(prev => ({ ...prev, regular: false }));
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (signUpData.user) {
        const roleTableName = "user_roles";
        const roleValue = email.includes("admin") ? "admin" : email.includes("host") ? "host" : "guest";
        
        const { error: roleError } = await supabase
          .from(roleTableName)
          .insert([{ user_id: signUpData.user.id, role: roleValue }]);

        if (roleError) {
          console.error("Failed to assign role:", roleError);
        }

        data = signUpData;
      }
    }

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bienvenue !",
        description: "Connexion réussie.",
      });
      onOpenChange(false);
      navigate("/host/dashboard");
    }

    setLoadingStates(prev => ({ ...prev, regular: false }));
  };

  const handleDemoGuestLogin = async () => {
    setLoadingStates(prev => ({ ...prev, guestDemo: true }));
    try {
      // Login as guest@demo.com
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "guest@demo.com",
        password: "demoguest12345",
      });

      if (error) throw error;

      if (!data.user) throw new Error("Failed to login");

      // Wait for data migration to complete
      const waitForMigration = async (userId: string, maxAttempts = 20): Promise<boolean> => {
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Check every 500ms
          
          try {
            const snapshot = demoStorage.getSnapshot(userId);
            // Check if bookings data exists (indicates migration complete)
            if (snapshot.bookings && snapshot.bookings.length > 0) {
              console.log('✅ Migration complete, bookings found:', snapshot.bookings.length);
              return true;
            }
          } catch (err) {
            console.log('⏳ Waiting for migration...', i + 1);
          }
        }
        return false;
      };

      toast({
        title: "Loading Demo Data",
        description: "Please wait while we load your demo data...",
      });

      const migrationSuccess = await waitForMigration(data.user.id);

      if (migrationSuccess) {
        toast({
          title: "Demo Mode Activated",
          description: "You're now using demo guest mode with sample data.",
        });

        onOpenChange(false);
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
      setLoadingStates(prev => ({ ...prev, guestDemo: false }));
    }
  };

  const handleDemoHostLogin = async () => {
    setLoadingStates(prev => ({ ...prev, hostDemo: true }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "host@demo.com",
        password: "demohost12345",
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to login");

      // Wait for data migration to complete
      const waitForMigration = async (userId: string, maxAttempts = 20): Promise<boolean> => {
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Check every 500ms
          
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

        onOpenChange(false);
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
      setLoadingStates(prev => ({ ...prev, hostDemo: false }));
    }
  };

  const handleDemoAdminLogin = async () => {
    setLoadingStates(prev => ({ ...prev, adminDemo: true }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@demo.com",
        password: "demoadmin12345",
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to login");

      // Wait for data migration to complete
      const waitForMigration = async (userId: string, maxAttempts = 20): Promise<boolean> => {
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Check every 500ms
          
          try {
            const snapshot = demoStorage.getSnapshot(userId);
            // Check if ALL admin data is loaded
            const hasAllAdminData = 
              snapshot.adminListings && snapshot.adminListings.length > 0 &&
              snapshot.adminUsers && snapshot.adminUsers.length > 0 &&
              snapshot.adminReviews && snapshot.adminReviews.length > 0 &&
              snapshot.adminPayouts && snapshot.adminPayouts.length > 0 &&
              snapshot.disputes && snapshot.disputes.length > 0 &&
              snapshot.adminSupportThreads && snapshot.adminSupportThreads.length > 0 &&
              snapshot.platformSettings && snapshot.platformSettings.default_host_commission_rate &&
              snapshot.adminFAQs !== undefined;

            if (hasAllAdminData) {
              console.log('✅ Admin migration complete with full data:', {
                listings: snapshot.adminListings.length,
                users: snapshot.adminUsers.length,
                reviews: snapshot.adminReviews.length,
                payouts: snapshot.adminPayouts.length,
                disputes: snapshot.disputes.length,
                supportThreads: snapshot.adminSupportThreads.length,
                faqs: snapshot.adminFAQs.length,
                platformSettings: 'loaded'
              });
              return true;
            }
          } catch (err) {
            console.log('⏳ Waiting for admin migration...', i + 1);
          }
        }
        return false;
      };

      toast({
        title: "Loading Demo Data",
        description: "Loading admin dashboard data (listings, users, reviews, disputes, payouts)... This may take a few seconds.",
      });

      const migrationSuccess = await waitForMigration(data.user.id);

      if (migrationSuccess) {
        toast({
          title: "Demo Mode Activated",
          description: "You're now using demo admin mode with sample data.",
        });

        onOpenChange(false);
        navigate("/admin");
      } else {
        throw new Error("Data migration timeout. Please try again.");
      }
    } catch (error: any) {
      console.error("Demo admin login error:", error);
      toast({
        title: "Demo login failed",
        description: error.message || "Failed to activate demo mode",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, adminDemo: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bienvenue</DialogTitle>
          <DialogDescription>Connectez-vous à votre compte ou créez-en un nouveau</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Inscription</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loadingStates.regular}>
                {loadingStates.regular ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>

            <Separator className="my-4" />
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">Mode démonstration</p>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-white border-2 border-gray-300 hover:bg-gray-50"
                onClick={handleDemoGuestLogin}
                disabled={loadingStates.guestDemo}
              >
                {loadingStates.guestDemo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading demo...
                  </>
                ) : (
                  "Guest Demo Login"
                )}
              </Button>
              <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white border-2 border-gray-300 hover:bg-gray-50"
                  onClick={handleDemoHostLogin}
                  disabled={loadingStates.hostDemo}
                >
                  {loadingStates.hostDemo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading demo...
                    </>
                  ) : (
                    "Host Demo Login"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white border-2 border-gray-300 hover:bg-gray-50"
                  onClick={handleDemoAdminLogin}
                  disabled={loadingStates.adminDemo}
                >
                  {loadingStates.adminDemo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading demo...
                    </>
                  ) : (
                    "Admin Demo Login"
                  )}
                </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">Prénom</Label>
                  <Input
                    id="first-name"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Nom</Label>
                  <Input
                    id="last-name"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">E-mail</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Mot de passe</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loadingStates.regular}>
                {loadingStates.regular ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
