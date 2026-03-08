import {
  Home,
  CalendarDays,
  MessageSquare,
  ClipboardList,
  Euro,
  Brush,
  Users,
  Star,
  CreditCard,
  Mail,
  TrendingUp,
  BarChart3,
  FileText,
  Globe,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, label: "Tableau de bord", active: true },
  { icon: Home, label: "Mes biens" },
  { icon: CalendarDays, label: "Calendrier" },
  { icon: MessageSquare, label: "Messages" },
  { icon: ClipboardList, label: "Réservations" },
  { icon: Euro, label: "Tarifs" },
  { icon: Brush, label: "Ménage" },
  { icon: Users, label: "Locataires" },
  { icon: Star, label: "Avis" },
  { icon: CreditCard, label: "Paiements" },
  { icon: Mail, label: "E-mails auto" },
  { icon: TrendingUp, label: "Revenus" },
  { icon: BarChart3, label: "Statistiques" },
  { icon: FileText, label: "Contrats" },
  { icon: Globe, label: "Portail client" },
];

const KPI = [
  { icon: TrendingUp, label: "Taux d'occupation", value: "68.5%", color: "text-primary" },
  { icon: Euro, label: "Tarif moyen", value: "85,00 €", color: "text-yellow-600" },
  { icon: CreditCard, label: "Revenus bruts", value: "4 280 €", color: "text-primary" },
  { icon: TrendingUp, label: "Revenus nets", value: "3 850 €", color: "text-green-600" },
];

const BOOKINGS = [
  { name: "Marie Leroy", property: "Castellamare - 3è...", dates: "17 avr. - 24 avr.", badge: "Dans 40 jours", amount: "625,00 €" },
  { name: "Jean Dupont", property: "Castellamare - 4è...", dates: "8 mai - 15 mai", badge: "Dans 61 jours", amount: "465,00 €" },
  { name: "Sophie Martin", property: "Castellamare - 3è...", dates: "3 juil. - 10 juil.", badge: "Dans 117 jours", amount: "1 025,00 €" },
  { name: "Pierre Bernard", property: "Castellamare - 5è...", dates: "14 juil. - 21 juil.", badge: "Dans 128 jours", amount: "780,00 €" },
];

const DashboardMockup = () => (
  <div className="rounded-2xl border border-border/60 shadow-2xl shadow-primary/10 overflow-hidden bg-card text-[10px] leading-tight select-none pointer-events-none">
    <div className="flex">
      {/* Sidebar */}
      <div className="w-[140px] bg-card border-r border-border/60 py-3 px-2 flex-shrink-0 hidden sm:block">
        <div className="flex items-center gap-1.5 px-2 mb-4">
          <div className="h-5 w-5 rounded-md bg-primary/20 flex items-center justify-center">
            <Globe className="h-3 w-3 text-primary" />
          </div>
          <span className="font-bold text-foreground text-[11px]">Rentely</span>
        </div>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md ${
                item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 min-w-0">
        <h3 className="font-bold text-foreground text-sm mb-3">Tableau de bord</h3>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {KPI.map((kpi) => (
            <div key={kpi.label} className="border border-border/60 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-1">
                <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                <span className="text-muted-foreground text-[9px]">{kpi.label}</span>
              </div>
              <span className="font-bold text-foreground text-xs">{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Bookings table */}
        <div className="border border-border/60 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border/40">
            <span className="font-semibold text-foreground text-[11px]">Prochaines locations</span>
          </div>
          <div className="divide-y divide-border/40">
            <div className="grid grid-cols-5 gap-2 px-3 py-1.5 text-muted-foreground text-[9px] font-medium">
              <span>Locataire</span>
              <span>Bien</span>
              <span>Dates</span>
              <span>Arrivée</span>
              <span className="text-right">Montant</span>
            </div>
            {BOOKINGS.map((b) => (
              <div key={b.name} className="grid grid-cols-5 gap-2 px-3 py-2 items-center">
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary flex-shrink-0">
                    {b.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className="text-foreground truncate">{b.name}</span>
                </div>
                <span className="text-muted-foreground truncate">{b.property}</span>
                <span className="text-muted-foreground">{b.dates}</span>
                <span className="inline-flex items-center bg-primary/10 text-primary rounded px-1 py-0.5 text-[8px] w-fit">{b.badge}</span>
                <span className="text-foreground font-medium text-right">{b.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default DashboardMockup;
