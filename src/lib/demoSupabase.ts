import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEMO_EMAILS = [
  "demo.admin@example.com",
  "demo.host@example.com", 
  "demo.guest@example.com"
];

// Session storage key for demo data
const DEMO_DATA_KEY = "lovable_demo_data";

// Get demo data from session storage
const getDemoData = () => {
  try {
    const data = sessionStorage.getItem(DEMO_DATA_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Save demo data to session storage
const saveDemoData = (data: any) => {
  try {
    sessionStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save demo data:", error);
  }
};

// Clear demo data from session storage
export const clearDemoData = () => {
  try {
    sessionStorage.removeItem(DEMO_DATA_KEY);
  } catch (error) {
    console.error("Failed to clear demo data:", error);
  }
};

// Check if current user is a demo user
export const isDemoUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  return DEMO_EMAILS.includes(user.email || "");
};

// Create a wrapper around Supabase that intercepts mutations for demo users
export const createDemoSupabase = (): SupabaseClient => {
  return new Proxy(supabase, {
    get(target, prop) {
      const original = target[prop as keyof typeof target];
      
      // Intercept the 'from' method for table access
      if (prop === "from") {
        return (tableName: string) => {
          const table = (original as any).call(target, tableName);
          
          return new Proxy(table, {
            get(tableTarget, tableProp) {
              const tableMethod = tableTarget[tableProp as keyof typeof tableTarget];
              
              // Intercept insert, update, delete, upsert methods
              if (["insert", "update", "delete", "upsert"].includes(tableProp as string)) {
                return async (...args: any[]) => {
                  const isDemo = await isDemoUser();
                  
                  if (isDemo) {
                    // For demo users, simulate the operation in session storage
                    const demoData = getDemoData();
                    if (!demoData[tableName]) {
                      demoData[tableName] = [];
                    }
                    
                    // Return success without actually writing to DB
                    return { 
                      data: args[0], 
                      error: null,
                      count: null,
                      status: 200,
                      statusText: "OK"
                    };
                  }
                  
                  // For real users, execute normally
                  return (tableMethod as any).apply(tableTarget, args);
                };
              }
              
              return tableMethod;
            }
          });
        };
      }
      
      return original;
    }
  }) as SupabaseClient;
};

export const demoSupabase = createDemoSupabase();
