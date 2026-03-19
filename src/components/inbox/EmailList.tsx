import { InboxEmail } from "@/hooks/useInboxEmails";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Mail, Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmailListProps {
  emails: InboxEmail[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onDeleteEmail?: (emailId: string) => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-blue-100 text-blue-700" },
  pending: { label: "En cours", color: "bg-amber-100 text-amber-700" },
  handled: { label: "Traité", color: "bg-emerald-100 text-emerald-700" },
};

export const EmailList = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  loading,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onDeleteEmail,
}: EmailListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <Input
          placeholder="Rechercher un email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="new">Nouveau</SelectItem>
            <SelectItem value="pending">En cours</SelectItem>
            <SelectItem value="handled">Traité</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="flex-1">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground text-center">Aucun email reçu</p>
          </div>
        ) : (
          emails.map((email) => {
            const statusInfo = statusLabels[email.status] || statusLabels.new;
            return (
              <div
                key={email.id}
                className={`p-3 cursor-pointer border-b border-border transition-colors hover:bg-[#F8FAFF] ${
                  selectedEmailId === email.id ? "bg-[#F8FAFF] border-l-[3px] border-l-[#45CE99]" : ""
                }`}
                onClick={() => onSelectEmail(email.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`truncate ${!email.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                        {email.from_name || email.from_email}
                      </h4>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {format(new Date(email.received_at), "dd MMM", { locale: fr })}
                      </span>
                    </div>
                    <p className={`text-sm truncate mb-1 ${!email.read ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {email.subject || "(Sans objet)"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] px-1.5 py-0 h-4 border-0 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {email.body_text?.substring(0, 60) || ""}
                      </p>
                      {!email.read && (
                        <div className="w-2 h-2 rounded-full bg-[#45CE99] shrink-0" />
                      )}
                      {onDeleteEmail && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteEmail(email.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive shrink-0"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
};
