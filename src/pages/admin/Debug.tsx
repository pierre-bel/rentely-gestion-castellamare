import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { selectByOwner, selectWhere, countWhere, selectWhereIn } from "@/lib/supabase-helpers";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Database, Activity, CheckCircle2, XCircle, Loader2, Play,
  Trash2, Filter, Server, Zap, Search, List, Hash, HeartPulse
} from "lucide-react";

// ─── Action Log ───
interface LogEntry {
  id: number;
  timestamp: Date;
  table: string;
  action: string;
  status: "success" | "error";
  duration: number;
  details: string;
}

let logCounter = 0;

export default function AdminDebug() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [resultPanel, setResultPanel] = useState<string>("");
  const [running, setRunning] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");

  const addLog = useCallback((table: string, action: string, status: "success" | "error", duration: number, details: string) => {
    setLogs(prev => [{
      id: ++logCounter,
      timestamp: new Date(),
      table, action, status, duration, details,
    }, ...prev].slice(0, 100));
  }, []);

  const runTest = useCallback(async (key: string, fn: () => Promise<string>) => {
    setRunning(key);
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      setResultPanel(result);
      addLog(key.split("-")[0] || key, key, "success", duration, result.slice(0, 200));
    } catch (e: any) {
      const duration = Math.round(performance.now() - start);
      const errMsg = e?.message || String(e);
      setResultPanel(`❌ ERREUR: ${errMsg}`);
      addLog(key.split("-")[0] || key, key, "error", duration, errMsg);
    } finally {
      setRunning(null);
    }
  }, [addLog]);

  // ─── Test Helpers ───
  const testSelectListings = () => runTest("listings-SELECT", async () => {
    const { data, error } = await selectWhere("listings", {}, { order: "created_at", ascending: false, limit: 5, select: "id, title, status, city, base_price" });
    if (error) throw new Error(error);
    return `✅ ${data?.length ?? 0} listings trouvées\n\n${JSON.stringify(data, null, 2)}`;
  });

  const testCountBookings = () => runTest("bookings-COUNT", async () => {
    const { data: count, error } = await countWhere("bookings", {});
    if (error) throw new Error(error);
    return `✅ Total bookings: ${count}`;
  });

  const testCountUsers = () => runTest("profiles-COUNT", async () => {
    const { data: count, error } = await countWhere("profiles", {});
    if (error) throw new Error(error);
    return `✅ Total users (profiles): ${count}`;
  });

  const testSelectBookings = () => runTest("bookings-SELECT", async () => {
    const { data, error } = await selectWhere("bookings", {}, { order: "created_at", ascending: false, limit: 5, select: "id, status, checkin_date, checkout_date, total_price" });
    if (error) throw new Error(error);
    return `✅ ${data?.length ?? 0} bookings récentes\n\n${JSON.stringify(data, null, 2)}`;
  });

  const testSelectFAQs = () => runTest("faqs-SELECT", async () => {
    const { data, error } = await selectWhere("faqs", { status: "published" }, { select: "id, question, category", limit: 10 });
    if (error) throw new Error(error);
    return `✅ ${data?.length ?? 0} FAQs publiées\n\n${JSON.stringify(data, null, 2)}`;
  });

  const testCountDisputes = () => runTest("disputes-COUNT", async () => {
    const pending = await countWhere("disputes", { status: "pending" });
    const total = await countWhere("disputes", {});
    return `✅ Disputes: ${total.data ?? 0} total, ${pending.data ?? 0} en attente`;
  });

  // ─── Health Checks ───
  const testRPC = () => runTest("rpc-KPIs", async () => {
    const { data, error } = await supabase.rpc("get_admin_dashboard_kpis");
    if (error) throw error;
    return `✅ RPC OK\n\n${JSON.stringify(data, null, 2)}`;
  });

  const testConnection = () => runTest("connection-CHECK", async () => {
    const start = performance.now();
    const { data, error } = await supabase.from("countries").select("id", { count: "exact", head: true });
    const latency = Math.round(performance.now() - start);
    if (error) throw error;
    const session = await supabase.auth.getSession();
    const hasSession = !!session.data.session;
    return `✅ Connexion OK\n⏱️ Latence: ${latency}ms\n🔐 Session active: ${hasSession ? "Oui" : "Non"}\n👤 User: ${user?.email ?? "N/A"}`;
  });

  const testDataIntegrity = () => runTest("integrity-CHECK", async () => {
    const issues: string[] = [];

    // Check orphan bookings (listings that don't exist)
    const { data: bookings } = await selectWhere("bookings", {}, { select: "id, listing_id, status", limit: 500 });
    const { data: listings } = await selectWhere("listings", {}, { select: "id" });
    if (bookings && listings) {
      const listingIds = new Set(listings.map((l: any) => l.id));
      const orphans = bookings.filter((b: any) => !listingIds.has(b.listing_id));
      if (orphans.length > 0) issues.push(`⚠️ ${orphans.length} booking(s) avec listing_id inexistant`);
    }

    // Check bookings with invalid dates
    if (bookings) {
      const badDates = bookings.filter((b: any) => b.checkin_date >= b.checkout_date);
      if (badDates.length > 0) issues.push(`⚠️ ${badDates.length} booking(s) avec checkin ≥ checkout`);
    }

    // Count key tables
    const tables = ["listings", "bookings", "profiles", "disputes", "faqs", "transactions"];
    const counts: string[] = [];
    for (const t of tables) {
      const { data: c } = await countWhere(t, {});
      counts.push(`${t}: ${c ?? "?"}`);
    }

    if (issues.length === 0) {
      return `✅ Aucun problème d'intégrité détecté\n\n📊 Compteurs:\n${counts.join("\n")}`;
    }
    return `⚠️ ${issues.length} problème(s) trouvé(s):\n${issues.join("\n")}\n\n📊 Compteurs:\n${counts.join("\n")}`;
  });

  // ─── Filtered logs ───
  const filteredLogs = logs.filter(log => {
    if (tableFilter !== "all" && !log.table.toLowerCase().includes(tableFilter)) return false;
    if (actionFilter !== "all" && !log.action.toLowerCase().includes(actionFilter)) return false;
    if (searchFilter && !log.details.toLowerCase().includes(searchFilter.toLowerCase()) && !log.action.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  const uniqueTables = [...new Set(logs.map(l => l.table))];
  const uniqueActions = [...new Set(logs.map(l => l.action.split("-")[1] || l.action))];

  const RunButton = ({ label, icon: Icon, onClick, testKey, variant = "outline" }: { label: string; icon: any; onClick: () => void; testKey: string; variant?: "outline" | "default" }) => (
    <Button variant={variant as any} size="sm" onClick={onClick} disabled={running !== null} className="gap-2 justify-start">
      {running === testKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );

  return (
    <div className="pb-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Panel 1: Test Helpers ─── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Tester les Helpers</CardTitle>
            </div>
            <CardDescription>Exécutez des requêtes directement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lectures</p>
            <RunButton label="SELECT listings (5)" icon={List} onClick={testSelectListings} testKey="listings-SELECT" />
            <RunButton label="SELECT bookings (5)" icon={List} onClick={testSelectBookings} testKey="bookings-SELECT" />
            <RunButton label="SELECT FAQs publiées" icon={List} onClick={testSelectFAQs} testKey="faqs-SELECT" />
            <Separator className="my-2" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Compteurs</p>
            <RunButton label="COUNT bookings" icon={Hash} onClick={testCountBookings} testKey="bookings-COUNT" />
            <RunButton label="COUNT users" icon={Hash} onClick={testCountUsers} testKey="profiles-COUNT" />
            <RunButton label="COUNT disputes" icon={Hash} onClick={testCountDisputes} testKey="disputes-COUNT" />
          </CardContent>
        </Card>

        {/* ─── Panel 2: Health Checks ─── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Santé du système</CardTitle>
            </div>
            <CardDescription>Vérifications de santé et intégrité</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <RunButton label="Test Connexion" icon={Server} onClick={testConnection} testKey="connection-CHECK" variant="default" />
            <RunButton label="Test RPC (KPIs Dashboard)" icon={Activity} onClick={testRPC} testKey="rpc-KPIs" variant="default" />
            <RunButton label="Vérifier l'intégrité des données" icon={Database} onClick={testDataIntegrity} testKey="integrity-CHECK" variant="default" />
          </CardContent>
        </Card>

        {/* ─── Panel 3: Result ─── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Résultat</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {resultPanel ? (
              <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-[350px] whitespace-pre-wrap font-mono border">
                {resultPanel}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Cliquez sur un test pour voir le résultat
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Logs Console ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Console d'actions ({filteredLogs.length})</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setLogs([]); setResultPanel(""); }} className="gap-1.5 text-muted-foreground">
                <Trash2 className="h-3.5 w-3.5" />
                Vider
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les tables</SelectItem>
                {uniqueTables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Rechercher..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="h-8 text-xs w-[180px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun log. Exécutez un test ci-dessus.
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-auto">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg text-xs font-mono border ${
                    log.status === "error" ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border"
                  }`}
                >
                  {log.status === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{log.table}</Badge>
                      <span className="text-foreground font-medium">{log.action}</span>
                      <span className="text-muted-foreground">{log.duration}ms</span>
                      <span className="text-muted-foreground ml-auto">
                        {log.timestamp.toLocaleTimeString("fr-FR")}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
