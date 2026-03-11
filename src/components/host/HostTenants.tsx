import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Trash2, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoContext";
import { demoStorage } from "@/lib/demoStorage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CreateEditTenantDialog } from "./CreateEditTenantDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Tenant {
  id: string;
  host_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  street: string | null;
  street_number: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function HostTenants() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isDemoMode, demoUserId } = useDemoMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["host-tenants", user?.id, isDemoMode],
    queryFn: async () => {
      if (isDemoMode && demoUserId) {
        const snapshot = demoStorage.getSnapshot(demoUserId);
        return (snapshot.tenants || []) as Tenant[];
      }
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("host_user_id", user.id)
        .order("first_name");
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: isDemoMode ? !!demoUserId : !!user?.id,
  });

  // Fetch booking data per tenant to classify: nouveau / ponctuel / habitué
  const { data: tenantStats = {} } = useQuery({
    queryKey: ["host-tenant-booking-stats", user?.id, isDemoMode],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      if (isDemoMode && demoUserId) {
        const snapshot = demoStorage.getSnapshot(demoUserId);
        const stats: Record<string, { total: number; future: number; past: number }> = {};
        for (const b of snapshot.hostBookings || []) {
          const pb = b.pricing_breakdown as any;
          const tid = pb?.tenant_id;
          if (!tid) continue;
          if (!stats[tid]) stats[tid] = { total: 0, future: 0, past: 0 };
          stats[tid].total++;
          if (b.checkin_date >= today) stats[tid].future++;
          else stats[tid].past++;
        }
        return stats;
      }
      if (!user?.id) return {};
      const { data, error } = await supabase
        .from("bookings")
        .select("pricing_breakdown, status, checkin_date")
        .in("status", ["confirmed", "completed", "pending_payment"]);
      if (error) throw error;
      const stats: Record<string, { total: number; future: number; past: number }> = {};
      for (const b of data || []) {
        const pb = b.pricing_breakdown as any;
        const tid = pb?.tenant_id;
        if (!tid) continue;
        if (!stats[tid]) stats[tid] = { total: 0, future: 0, past: 0 };
        stats[tid].total++;
        if (b.checkin_date >= today) stats[tid].future++;
        else stats[tid].past++;
      }
      return stats;
    },
    enabled: isDemoMode ? !!demoUserId : !!user?.id,
  });

  const filtered = tenants.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${t.first_name} ${t.last_name || ""}`.toLowerCase();
    return fullName.includes(q) || t.email?.toLowerCase().includes(q) || t.phone?.includes(q);
  });

  const handleDelete = async () => {
    if (!tenantToDelete) return;
    const { error } = await supabase.from("tenants").delete().eq("id", tenantToDelete.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le locataire.", variant: "destructive" });
    } else {
      toast({ title: "Locataire supprimé" });
      queryClient.invalidateQueries({ queryKey: ["host-tenants"] });
    }
    setDeleteDialogOpen(false);
    setTenantToDelete(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Locataires</CardTitle>
          <Button onClick={() => { setEditingTenant(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau locataire
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un locataire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun locataire</h3>
            <p className="text-muted-foreground mb-4">Ajoutez vos locataires pour faciliter la création de réservations</p>
            <Button onClick={() => { setEditingTenant(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un locataire
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="rounded-lg border overflow-hidden hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background">
                    <TableHead className="font-semibold">Nom</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Téléphone</TableHead>
                    <TableHead className="font-semibold">Sexe</TableHead>
                    <TableHead className="font-semibold">Ville</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tenant, i) => (
                    <TableRow key={tenant.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium">{tenant.first_name} {tenant.last_name}</TableCell>
                      <TableCell>
                        <TenantBadge stats={tenantStats[tenant.id]} />
                      </TableCell>
                      <TableCell>{tenant.email || "—"}</TableCell>
                      <TableCell>{tenant.phone || "—"}</TableCell>
                      <TableCell>{tenant.gender === "H" ? "Homme" : tenant.gender === "F" ? "Femme" : "—"}</TableCell>
                      <TableCell>{tenant.city || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingTenant(tenant); setDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setTenantToDelete(tenant); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((tenant) => (
                <div key={tenant.id} className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{tenant.first_name} {tenant.last_name}</div>
                    {(bookingCounts[tenant.id] || 0) >= 1 ? (
                      <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/10 text-[11px]">Habitué</Badge>
                    ) : (
                      <Badge className="bg-muted/50 text-muted-foreground border-muted-foreground/20 hover:bg-muted/50 text-[11px]">Nouveau</Badge>
                    )}
                  </div>
                  {tenant.email && <p className="text-sm text-muted-foreground truncate">{tenant.email}</p>}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{tenant.phone || "—"}</span>
                    <span>{tenant.city || "—"}</span>
                  </div>
                  <div className="flex justify-end gap-1 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingTenant(tenant); setDialogOpen(true); }}>
                      <Edit className="h-4 w-4 mr-1" /> Modifier
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setTenantToDelete(tenant); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <CreateEditTenantDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenant={editingTenant}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le locataire ?</AlertDialogTitle>
            <AlertDialogDescription>
              {tenantToDelete?.first_name} {tenantToDelete?.last_name} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
