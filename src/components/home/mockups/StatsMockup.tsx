import { BarChart3, Euro, TrendingUp, CalendarDays } from "lucide-react";

const KPIS = [
  { icon: BarChart3, label: "Taux d'occupation", value: "68.5%" },
  { icon: Euro, label: "ADR", value: "98 €" },
  { icon: TrendingUp, label: "RevPAR", value: "67 €" },
  { icon: CalendarDays, label: "Nuits réservées", value: "124" },
];

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const OCC_VALUES = [0, 15, 42, 48, 45, 52, 72, 68, 55, 30, 12, 0];
const REV_VALUES = [0, 280, 510, 620, 465, 780, 1750, 1280, 850, 390, 180, 0];

const StatsMockup = () => (
  <div className="rounded-2xl border border-border/60 shadow-lg overflow-hidden bg-card text-[10px] leading-tight select-none pointer-events-none">
    {/* Header */}
    <div className="px-4 py-3 border-b border-border/40">
      <h3 className="font-bold text-foreground text-sm mb-3">Statistiques</h3>
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="border border-border/60 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <kpi.icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground text-[9px]">{kpi.label}</span>
            </div>
            <span className="font-bold text-foreground text-sm">{kpi.value}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Chart area */}
    <div className="px-4 py-3">
      <div className="text-foreground font-semibold text-[11px] mb-3">Taux d'occupation mensuel</div>
      {/* Simple bar chart */}
      <div className="flex items-end gap-1 h-24">
        {OCC_VALUES.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-primary/20 rounded-t-sm relative"
              style={{ height: `${Math.max(val * 0.9, 2)}px` }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm"
                style={{ height: `${Math.max(val * 0.7, 1)}px` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {MONTHS.map((m) => (
          <span key={m} className="flex-1 text-center text-[7px] text-muted-foreground">{m}</span>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="text-foreground font-semibold text-[11px] mt-4 mb-3">Revenus mensuels</div>
      <div className="flex items-end gap-1 h-20">
        {REV_VALUES.map((val, i) => (
          <div key={i} className="flex-1">
            <div
              className="w-full bg-primary rounded-t-sm"
              style={{ height: `${Math.max((val / 1750) * 72, 1)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {MONTHS.map((m) => (
          <span key={m} className="flex-1 text-center text-[7px] text-muted-foreground">{m}</span>
        ))}
      </div>
    </div>
  </div>
);

export default StatsMockup;
