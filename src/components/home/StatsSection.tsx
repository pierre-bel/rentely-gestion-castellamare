import { CalendarDays, Clock, Layers, Shield } from "lucide-react";

const STATS = [
  { icon: Layers, value: "8+", label: "Modules intégrés" },
  { icon: Clock, value: "5h", label: "Gagnées par semaine" },
  { icon: CalendarDays, value: "∞", label: "Réservations gérées" },
  { icon: Shield, value: "100%", label: "Données sécurisées" },
];

const StatsSection = () => (
  <section className="py-16 bg-primary relative overflow-hidden">
    {/* Subtle decorative glows */}
    <div className="absolute top-0 left-1/4 w-64 h-64 bg-accent-warm/20 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent-cool/20 rounded-full blur-3xl pointer-events-none" />
    
    <div className="container mx-auto px-4 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        {STATS.map((stat, index) => (
          <div key={stat.label} className="text-center group">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary-foreground/10 mb-3 group-hover:scale-110 transition-transform duration-300">
              <stat.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <p className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">{stat.value}</p>
            <p className="text-sm text-primary-foreground/80">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsSection;
