import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export function SuspendedUserListener() {
  useEffect(() => {
    const handleSuspendedLogin = () => {
      toast({
        title: "Account Suspended",
        description: "Your account has been suspended. Please contact support.",
        variant: "destructive",
      });
    };

    window.addEventListener('suspended-user-login', handleSuspendedLogin);
    
    return () => {
      window.removeEventListener('suspended-user-login', handleSuspendedLogin);
    };
  }, []);

  return null;
}
