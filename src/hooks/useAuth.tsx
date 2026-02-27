import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { clearDemoData } from "@/lib/demoSupabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Update state synchronously first
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Defer the suspended check with setTimeout
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.status === 'suspended') {
            await supabase.auth.signOut();
            clearDemoData();
            setSession(null);
            setUser(null);
            setLoading(false);
            navigate("/");
            // Show error after navigation
            setTimeout(() => {
              const event = new CustomEvent('suspended-user-login');
              window.dispatchEvent(event);
            }, 100);
          }
        }, 0);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Clear demo snapshot if user was in demo mode (guest, host, or admin)
      const isDemoUser = user?.email === "guest@demo.com" || 
                         user?.email === "host@demo.com" || 
                         user?.email === "admin@demo.com";
      
      if (isDemoUser && user?.id) {
        const { demoStorage } = await import("@/lib/demoStorage");
        demoStorage.clearSnapshot(user.id);
        console.log('🧹 Cleared demo snapshot for:', user.email);
      }
      
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear demo data for demo users
      clearDemoData();
      
      // Always clear local state even if API call fails
      setSession(null);
      setUser(null);
      navigate("/");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
