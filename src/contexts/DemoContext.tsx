import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { demoStorage } from "@/lib/demoStorage";
import { isDemoActive, getDemoState } from "@/lib/demoMode";
import { seedDemoData } from "@/lib/demoSeedData";

interface DemoContextType {
  isDemoMode: boolean;
  setIsDemoMode: (value: boolean) => void;
  demoUserId: string | null;
  migrationComplete: boolean;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [isDemoMode, setIsDemoMode] = useState(isDemoActive());
  const [demoUserId, setDemoUserId] = useState<string | null>(getDemoState()?.userId || null);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const { user } = useAuth();
  const isMigratingRef = useRef(false);

  useEffect(() => {
    // Check if demo mode is active (client-side, no real auth)
    if (isDemoActive()) {
      const state = getDemoState();
      if (state) {
        setIsDemoMode(true);
        setDemoUserId(state.userId);
        // Seed demo data on first activation
        seedDemoData(state.role, state.userId);
        // Demo mode is ready immediately - data comes from demoStorage
        setMigrationComplete(true);
      }
      return;
    }

    // Legacy: handle real demo accounts (guest@demo.com etc.)
    const isDemoUser = user?.email === "guest@demo.com" || user?.email === "host@demo.com" || user?.email === "admin@demo.com";
    
    if (isDemoUser && user) {
      setIsDemoMode(true);
      setDemoUserId(user.id);
      
      if (isMigratingRef.current) return;
      
      setMigrationComplete(false);
      isMigratingRef.current = true;
      
      const attemptMigration = async () => {
        try {
          const result = await demoStorage.migrateAllDataFromDatabase(user.id, supabase);
          if (result?.migrated || result?.reason) {
            setMigrationComplete(true);
          }
        } catch (error) {
          console.error('Migration error:', error);
        }
        isMigratingRef.current = false;
      };
      
      attemptMigration();
    } else {
      if (demoUserId) {
        demoStorage.clearSnapshot(demoUserId);
      }
      setIsDemoMode(false);
      setDemoUserId(null);
      setMigrationComplete(true);
      isMigratingRef.current = false;
    }
  }, [user?.email, user?.id]);

  return (
    <DemoContext.Provider value={{ isDemoMode, setIsDemoMode, demoUserId, migrationComplete }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemoMode = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoProvider");
  }
  return context;
};
