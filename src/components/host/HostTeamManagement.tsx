import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Users, UserPlus, Trash2, Mail, Shield, Eye, EyeOff, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type AccessLevel = "full_access" | "read_only" | "read_only_anonymous" | "accounting_only";

interface TeamMember {
  id: string;
  member_user_id: string;
  access_level: AccessLevel;
  created_at: string;
  profile?: { email: string; first_name: string | null; last_name: string | null };
}

interface Invitation {
  id: string;
  email: string;
  access_level: AccessLevel;
  status: string;
  created_at: string;
  expires_at: string;
}

const ACCESS_LABELS: Record<AccessLevel, { label: string; description: string; icon: React.ReactNode }> = {
  full_access: { label: "Accès complet", description: "Lecture et écriture sur toutes les données", icon: <Shield className="h-3.5 w-3.5" /> },
  read_only: { label: "Lecture seule", description: "Peut voir toutes les données sans modifier", icon: <Eye className="h-3.5 w-3.5" /> },
  read_only_anonymous: { label: "Lecture anonyme", description: "Lecture seule, noms des locataires masqués", icon: <EyeOff className="h-3.5 w-3.5" /> },
  accounting_only: { label: "Comptabilité", description: "Accès limité aux données financières", icon: <Calculator className="h-3.5 w-3.5" /> },
};

const ACCESS_BADGE_VARIANT: Record<AccessLevel, "default" | "secondary" | "outline" | "destructive"> = {
  full_access: "default",
  read_only: "secondary",
  read_only_anonymous: "outline",
  accounting_only: "secondary",
};

export default function HostTeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccessLevel, setInviteAccessLevel] = useState<AccessLevel>("read_only");
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);

    const [membersRes, invitationsRes] = await Promise.all([
      supabase
        .from("host_team_members")
        .select("id, member_user_id, access_level, created_at")
        .eq("host_user_id", user.id),
      supabase
        .from("host_team_invitations")
        .select("id, email, access_level, status, created_at, expires_at")
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (membersRes.data) {
      // Fetch profiles for members
      const memberIds = membersRes.data.map((m: any) => m.member_user_id);
      let profiles: any[] = [];
      if (memberIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", memberIds);
        profiles = profilesData || [];
      }

      setMembers(
        membersRes.data.map((m: any) => ({
          ...m,
          profile: profiles.find((p: any) => p.id === m.member_user_id),
        }))
      );
    }

    if (invitationsRes.data) {
      setInvitations(invitationsRes.data as any[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleInvite = async () => {
    if (!user?.id || !inviteEmail.trim()) return;
    setSending(true);

    try {
      // Insert invitation
      const { data: inv, error: insertError } = await supabase
        .from("host_team_invitations")
        .insert({
          host_user_id: user.id,
          email: inviteEmail.trim().toLowerCase(),
          access_level: inviteAccessLevel as any,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          toast({ variant: "destructive", title: "Erreur", description: "Cette adresse e-mail a déjà été invitée." });
        } else {
          toast({ variant: "destructive", title: "Erreur", description: insertError.message });
        }
        setSending(false);
        return;
      }

      // Send invitation email via edge function
      if (inv) {
        const { error: emailError } = await supabase.functions.invoke("send-team-invitation", {
          body: { invitation_id: (inv as any).id },
        });

        if (emailError) {
          console.error("Failed to send invitation email:", emailError);
          // Invitation created but email failed - still show success
        }
      }

      toast({ title: "Invitation envoyée", description: `Un e-mail d'invitation a été envoyé à ${inviteEmail}.` });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteAccessLevel("read_only");
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    }

    setSending(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from("host_team_members").delete().eq("id", memberId);
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast({ title: "Membre retiré" });
    }
  };

  const handleCancelInvitation = async (invId: string) => {
    const { error } = await supabase.from("host_team_invitations").delete().eq("id", invId);
    if (!error) {
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
      toast({ title: "Invitation annulée" });
    }
  };

  const handleUpdateAccess = async (memberId: string, newLevel: AccessLevel) => {
    const { error } = await supabase
      .from("host_team_members")
      .update({ access_level: newLevel as any, updated_at: new Date().toISOString() })
      .eq("id", memberId);

    if (!error) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, access_level: newLevel } : m))
      );
      toast({ title: "Niveau d'accès mis à jour" });
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Gestion de l'équipe
              </CardTitle>
              <CardDescription className="mt-1">
                Invitez des collaborateurs à accéder à vos données de gestion
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Inviter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active members */}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Membres actifs</Label>
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3 px-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {(m.profile?.first_name?.[0] || m.profile?.email?.[0] || "?").toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.profile?.first_name && m.profile?.last_name
                          ? `${m.profile.first_name} ${m.profile.last_name}`
                          : m.profile?.email || "Utilisateur"}
                      </p>
                      {m.profile?.email && (
                        <p className="text-xs text-muted-foreground truncate">{m.profile.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Select
                      value={m.access_level}
                      onValueChange={(v) => handleUpdateAccess(m.id, v as AccessLevel)}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACCESS_LABELS).map(([key, { label, icon }]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-1.5">{icon} {label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending invitations */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Invitations en attente</Label>
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3 px-3 rounded-lg border border-dashed border-border bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {ACCESS_LABELS[inv.access_level as AccessLevel]?.label || inv.access_level}
                        {" · "}
                        En attente
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {members.length === 0 && pendingInvitations.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun collaborateur pour le moment</p>
              <p className="text-xs mt-1">Invitez quelqu'un pour partager l'accès à vos données</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inviter un collaborateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Adresse e-mail</Label>
              <Input
                type="email"
                placeholder="collaborateur@exemple.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">Niveau d'accès</Label>
              <Select value={inviteAccessLevel} onValueChange={(v) => setInviteAccessLevel(v as AccessLevel)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCESS_LABELS).map(([key, { label, description, icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5">{icon}</span>
                        <div>
                          <p className="font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Envoyer l'invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
