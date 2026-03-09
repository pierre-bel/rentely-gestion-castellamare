import { Quote } from "lucide-react";

const TestimonialSection = () => (
  <section className="py-24 bg-gradient-to-b from-background to-card relative overflow-hidden">
    {/* Decorative accent */}
    <div className="absolute top-1/2 left-0 w-1 h-32 bg-gradient-to-b from-accent-warm via-accent-cool to-accent-purple rounded-r-full opacity-60" />
    <div className="absolute top-1/2 right-0 w-1 h-32 bg-gradient-to-b from-accent-purple via-accent-cool to-accent-warm rounded-l-full opacity-60" />
    
    <div className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto text-center">
        <Quote className="h-10 w-10 text-accent-cool/50 mx-auto mb-6 rotate-180" />
        <blockquote className="text-xl md:text-2xl font-medium text-foreground leading-relaxed mb-6">
          Conçu par un propriétaire, pour les propriétaires. Rentely est né d'un besoin réel : centraliser 
          la gestion de locations saisonnières sans complexité inutile.
        </blockquote>
        <div className="flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent-warm to-accent-cool flex items-center justify-center">
            <span className="text-sm font-bold text-white">R</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">L'équipe Rentely</p>
            <p className="text-xs text-muted-foreground">Propriétaires & développeurs</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default TestimonialSection;
