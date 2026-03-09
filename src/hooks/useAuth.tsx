import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { clearDemoData } from "@/lib/demoSupabase";
import { getDemoState, getDemoFakeUser, deactivateDemo, isDemoActive } from "@/lib/demoMode";

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
    // Check for active demo mode first
    if (isDemoActive()) {
      const fakeUser = getDemoFakeUser();
      setUser(fakeUser as User);
      setSession(null);
      setLoading(false);
      // Don't set up Supabase auth listeners in demo mode
      return;
    }

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip if demo mode is active
      if (isDemoActive()) return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
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
      if (isDemoActive()) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // If in demo mode, just clear demo state
      if (isDemoActive()) {
        const demoState = getDemoState();
        if (demoState) {
          const { demoStorage } = await import("@/lib/demoStorage");
          demoStorage.clearSnapshot(demoState.userId);
        }
        deactivateDemo();
        clearDemoData();
        setSession(null);
        setUser(null);
        navigate("/");
        return;
      }

      // Regular sign out
      const isDemoUser = user?.email === "guest@demo.com" || 
                         user?.email === "host@demo.com" || 
                         user?.email === "admin@demo.com";
      
      if (isDemoUser && user?.id) {
        const { demoStorage } = await import("@/lib/demoStorage");
        demoStorage.clearSnapshot(user.id);
      }
      
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearDemoData();
      deactivateDemo();
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
