import { HomeIcon, CalendarDays, Zap } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: HomeIcon,
    title: "Créez vos biens",
    description: "Ajoutez vos logements avec photos, tarifs et règles. Configuration en quelques minutes.",
    color: "accent-warm",
  },
  {
    num: "02",
    icon: CalendarDays,
    title: "Gérez vos réservations",
    description: "Calendrier interactif, réservations manuelles, suivi des paiements et contrats automatiques.",
    color: "accent-cool",
  },
  {
    num: "03",
    icon: Zap,
    title: "Automatisez le reste",
    description: "E-mails automatiques, portails client et ménage, statistiques. Gagnez du temps chaque jour.",
    color: "accent-purple",
  },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  "accent-warm": { bg: "bg-accent-warm/10", text: "text-accent-warm", border: "border-accent-warm/30" },
  "accent-cool": { bg: "bg-accent-cool/10", text: "text-accent-cool", border: "border-accent-cool/30" },
  "accent-purple": { bg: "bg-accent-purple/10", text: "text-accent-purple", border: "border-accent-purple/30" },
};

const HowItWorks = () => (
  <section className="py-24 bg-gradient-to-b from-card to-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">Simple & efficace</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3">
          Comment ça marche ?
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
        {/* Connecting line with gradient (desktop) */}
        <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-accent-warm via-accent-cool to-accent-purple opacity-40" />

        {STEPS.map((step) => {
          const colors = colorClasses[step.color];
          return (
            <div key={step.num} className="relative flex flex-col items-center text-center group">
              <div className={`relative z-10 h-16 w-16 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center mb-6 group-hover:scale-105 transition-all duration-300`}>
                <step.icon className={`h-7 w-7 ${colors.text}`} />
              </div>
              <span className={`text-xs font-bold ${colors.text} tracking-widest mb-2`}>{step.num}</span>
              <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed max-w-xs">{step.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default HowItWorks;
