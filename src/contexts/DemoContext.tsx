import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { demoStorage } from "@/lib/demoStorage";

interface DemoContextType {
  isDemoMode: boolean;
  setIsDemoMode: (value: boolean) => void;
  demoUserId: string | null;
  migrationComplete: boolean;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoUserId, setDemoUserId] = useState<string | null>(null);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const { user } = useAuth();
  const retryCountRef = useRef(0);
  const isMigratingRef = useRef(false);

  useEffect(() => {
    const initDemoMode = async () => {
      // Check if current user is demo guest, demo host, or demo admin
      const isDemoUser = user?.email === "guest@demo.com" || user?.email === "host@demo.com" || user?.email === "admin@demo.com";
      
      if (isDemoUser) {
        setIsDemoMode(true);
        setDemoUserId(user.id);
        
        // Skip if already migrating
        if (isMigratingRef.current) {
          return;
        }
        
        setMigrationComplete(false);
        isMigratingRef.current = true;
        retryCountRef.current = 0;
        
        const MAX_RETRIES = 2;
        
        const attemptMigration = async (): Promise<void> => {
          const userType = user.email === "host@demo.com" ? "host" : "guest";
          console.log(`🔄 Starting ${userType} migration check for user:`, user.id);
          
          try {
            const result = await demoStorage.migrateAllDataFromDatabase(user.id, supabase);
            
            if (result?.migrated) {
              console.log(`✅ ${userType} demo data migrated successfully:`, result.counts);
              setMigrationComplete(true);
              isMigratingRef.current = false;
            } else if (result?.reason) {
              console.log('⏭️ Migration skipped:', result.reason);
              setMigrationComplete(true);
              isMigratingRef.current = false;
            } else if (result?.error) {
              console.error('❌ Migration failed:', result.error);
              
              if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++;
                console.log(`🔄 Retrying migration (${retryCountRef.current}/${MAX_RETRIES})...`);
                setTimeout(() => attemptMigration(), 1000 * retryCountRef.current);
              } else {
                setMigrationComplete(false);
                isMigratingRef.current = false;
              }
            }
          } catch (error) {
            console.error('❌ Migration error:', error);
            
            if (retryCountRef.current < MAX_RETRIES) {
              retryCountRef.current++;
              console.log(`🔄 Retrying migration (${retryCountRef.current}/${MAX_RETRIES})...`);
              setTimeout(() => attemptMigration(), 1000 * retryCountRef.current);
            } else {
              setMigrationComplete(false);
              isMigratingRef.current = false;
            }
          }
        };
        
        attemptMigration();
      } else {
        // Clear demo data from localStorage when logging out of demo account
        if (demoUserId) {
          console.log('🧹 Clearing demo data for user:', demoUserId);
          demoStorage.clearSnapshot(demoUserId);
        }
        
        setIsDemoMode(false);
        setDemoUserId(null);
        setMigrationComplete(true);
        isMigratingRef.current = false;
      }
    };
    
    initDemoMode();
  }, [user?.email, user?.id, demoUserId]); // Added demoUserId to dependencies

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
