import { CalendarDays, Clock, Layers, Shield } from "lucide-react";

const STATS = [
  { icon: Layers, value: "8+", label: "Modules intégrés" },
  { icon: Clock, value: "5h", label: "Gagnées par semaine" },
  { icon: CalendarDays, value: "∞", label: "Réservations gérées" },
  { icon: Shield, value: "100%", label: "Données sécurisées" },
];

const StatsSection = () => (
  <section className="py-16 bg-primary">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <stat.icon className="h-6 w-6 text-primary-foreground/70 mx-auto mb-3" />
            <p className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">{stat.value}</p>
            <p className="text-sm text-primary-foreground/70">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsSection;
