import { Quote } from "lucide-react";

const TestimonialSection = () => (
  <section className="py-24 bg-card">
    <div className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto text-center">
        <Quote className="h-10 w-10 text-primary/30 mx-auto mb-6 rotate-180" />
        <blockquote className="text-xl md:text-2xl font-medium text-foreground leading-relaxed mb-6">
          Conçu par un propriétaire, pour les propriétaires. Rentely est né d'un besoin réel : centraliser 
          la gestion de locations saisonnières sans complexité inutile.
        </blockquote>
        <div className="flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">R</span>
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
