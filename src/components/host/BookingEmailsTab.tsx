import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemoData } from "@/hooks/useDemoData";
import { format, parseISO, addDays, isBefore, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { Mail, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface EmailLog {
  id: string;
  subject: string;
  recipient_email: string;
  status: string;
  created_at: string;
  error_message: string | null;
  automation_name?: string;
}

interface ScheduledEmail {
  id: string;
  name: string;
  subject: string;
  trigger_type: string;
  trigger_days: number;
  recipient_type: string;
  recipient_email: string | null;
  scheduled_date: string | null;
}

interface Props {
  bookingId: string;
  checkinDate: string;
  checkoutDate: string;
  listingId: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  booking_confirmed: "Confirmation de réservation",
  days_before_checkin: "Avant l'arrivée",
  day_of_checkin: "Jour de l'arrivée",
  days_after_checkin: "Après l'arrivée",
  days_before_checkout: "Avant le départ",
  day_of_checkout: "Jour du départ",
  days_after_checkout: "Après le départ",
};

export default function BookingEmailsTab({ bookingId, checkinDate, checkoutDate, listingId }: Props) {
  const { isDemoMode } = useDemoData();
  const [sentEmails, setSentEmails] = useState<EmailLog[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
  }, [bookingId]);

  const fetchEmails = async () => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    try {
      // Fetch sent emails for this booking
      const { data: logs } = await supabase
        .from("email_send_log")
        .select("id, subject, recipient_email, status, created_at, error_message, automation_id")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      // Fetch automations that target this listing to compute scheduled emails
      const { data: automations } = await supabase
        .from("email_automations")
        .select("id, name, subject, trigger_type, trigger_days, is_enabled, listing_ids, recipient_type, recipient_email, send_if_late")
        .eq("is_enabled", true);

      if (logs) {
        // Enrich with automation name
        const enriched: EmailLog[] = logs.map((log: any) => {
          const auto = automations?.find((a: any) => a.id === log.automation_id);
          return { ...log, automation_name: auto?.name || null };
        });
        setSentEmails(enriched);
      }

      // Compute scheduled (future) emails
      if (automations) {
        const checkin = parseISO(checkinDate);
        const checkout = parseISO(checkoutDate);
        const now = new Date();
        const sentAutomationIds = new Set(logs?.map((l: any) => l.automation_id) || []);

        const scheduled: ScheduledEmail[] = [];
        for (const auto of automations as any[]) {
          // Check if automation targets this listing
          const targets = auto.listing_ids as string[] | null;
          if (targets && targets.length > 0 && !targets.includes(listingId)) continue;

          // Skip if already sent for this booking
          if (sentAutomationIds.has(auto.id)) continue;

          let scheduledDate: Date | null = null;
          if (auto.trigger_type === "booking_confirmed") {
            continue; // Already sent or instant
          } else if (auto.trigger_type === "days_before_checkin") {
            scheduledDate = addDays(checkin, -auto.trigger_days);
          } else if (auto.trigger_type === "day_of_checkin") {
            scheduledDate = checkin;
          } else if (auto.trigger_type === "days_after_checkin") {
            scheduledDate = addDays(checkin, auto.trigger_days);
          } else if (auto.trigger_type === "days_before_checkout") {
            scheduledDate = addDays(checkout, -auto.trigger_days);
          } else if (auto.trigger_type === "day_of_checkout") {
            scheduledDate = checkout;
          } else if (auto.trigger_type === "days_after_checkout") {
            scheduledDate = addDays(checkout, auto.trigger_days);
          }

          const sendIfLate = (auto as any).send_if_late === true;
          if (scheduledDate && (isAfter(scheduledDate, now) || sendIfLate)) {
            scheduled.push({
              id: auto.id,
              name: auto.name,
              subject: auto.subject,
              trigger_type: auto.trigger_type,
              trigger_days: auto.trigger_days,
              recipient_type: auto.recipient_type,
              recipient_email: auto.recipient_email,
              scheduled_date: scheduledDate.toISOString(),
            });
          }
        }

        scheduled.sort((a, b) => 
          new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime()
        );
        setScheduledEmails(scheduled);
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasNoEmails = sentEmails.length === 0 && scheduledEmails.length === 0;

  if (hasNoEmails) {
    return (
      <div className="text-center py-8">
        <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucun e-mail envoyé ou planifié pour cette réservation</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sent emails */}
      {sentEmails.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            E-mails envoyés ({sentEmails.length})
          </h4>
          <div className="space-y-2">
            {sentEmails.map((email) => (
              <div key={email.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground">{email.recipient_email}</p>
                    {email.automation_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Automation : {email.automation_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {email.status === "sent" ? (
                      <span className="text-xs text-green-600 font-medium">Envoyé</span>
                    ) : (
                      <span className="text-xs text-destructive font-medium">Erreur</span>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(email.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
                {email.error_message && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {email.error_message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled emails */}
      {scheduledEmails.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-600" />
            E-mails planifiés ({scheduledEmails.length})
          </h4>
          <div className="space-y-2">
            {scheduledEmails.map((email) => (
              <div key={email.id} className="border rounded-lg p-3 text-sm border-dashed">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {email.recipient_type === "tenant" ? "Locataire" : email.recipient_email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TRIGGER_LABELS[email.trigger_type] || email.trigger_type}
                      {email.trigger_days > 0 ? ` (${email.trigger_days}j)` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-amber-600 font-medium">Planifié</span>
                    {email.scheduled_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(email.scheduled_date), "d MMM yyyy", { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
