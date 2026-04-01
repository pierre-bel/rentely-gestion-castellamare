import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DashboardRecentEmailsProps {
  userId: string;
}

const DashboardRecentEmails = ({ userId }: DashboardRecentEmailsProps) => {
  const navigate = useNavigate();

  const { data: emails, isLoading } = useQuery({
    queryKey: ["dashboard-recent-emails", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_emails")
        .select("id, from_name, from_email, subject, received_at, read")
        .eq("host_id", userId)
        .eq("hidden", false)
        .order("received_at", { ascending: false })
        .limit(7);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun e-mail</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Vous n'avez reçu aucun e-mail pour le moment
        </p>
        <Button variant="outline" onClick={() => navigate("/host/inbox")}>
          Voir la messagerie
        </Button>
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
      {emails.map((email) => (
        <div
          key={email.id}
          className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${!email.read ? "bg-primary/5" : ""}`}
          onClick={() => navigate("/host/inbox")}
        >
          <div className="mt-0.5">
            {email.read ? (
              <MailOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Mail className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm truncate ${!email.read ? "font-semibold" : "font-medium"}`}>
                {email.from_name || email.from_email}
              </p>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(email.received_at), "dd MMM", { locale: fr })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {email.subject || "(sans objet)"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardRecentEmails;
