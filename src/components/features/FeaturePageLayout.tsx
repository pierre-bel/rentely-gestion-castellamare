import { useState, ReactNode, ReactElement } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sparkles, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/AuthDialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface FeatureDetail {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeaturePageLayoutProps {
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  features: FeatureDetail[];
  highlights: string[];
  heroImage?: string;
  heroImageAlt?: string;
  heroMockup?: ReactElement;
  nextPage?: { label: string; href: string };
  children?: ReactNode;
}

const FeaturePageLayout = ({
  badge,
  title,
  titleHighlight,
  subtitle,
  features,
  highlights,
  heroImage,
  heroImageAlt,
  heroMockup,
  nextPage,
  children,
}: FeaturePageLayoutProps) => {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/[0.06] via-background to-primary/[0.1]">
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 py-20 lg:py-28 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
              <Sparkles className="h-4 w-4" />
              {badge}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6 text-foreground">
              {title} <span className="text-primary">{titleHighlight}</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              {subtitle}
            </p>
            <Button
              size="lg"
              className="rounded-full px-8 h-13 shadow-lg shadow-primary/20"
              onClick={() => setAuthDialogOpen(true)}
            >
              Essayer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {heroMockup && (
            <div className="mt-14 max-w-4xl mx-auto">
              {heroMockup}
            </div>
          )}
          {!heroMockup && heroImage && (
            <div className="mt-14 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-border/60 shadow-2xl shadow-primary/10 overflow-hidden bg-card">
                <img
                  src={heroImage}
                  alt={heroImageAlt || "Aperçu de la fonctionnalité"}
                  className="w-full h-auto"
                  loading="eager"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Optional extra content */}
      {children}

      {/* Highlights */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              En résumé
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {highlights.map((h) => (
                <div key={h} className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border/60">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-foreground">{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA + next page */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Prêt à vous lancer ?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Créez votre compte gratuitement et commencez à gérer vos locations en quelques minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="rounded-full px-8 shadow-lg shadow-primary/20"
              onClick={() => setAuthDialogOpen(true)}
            >
              Créer mon compte
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {nextPage && (
              <Button variant="outline" size="lg" className="rounded-full px-8" asChild>
                <Link to={nextPage.href}>
                  {nextPage.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <Footer />
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
};

export default FeaturePageLayout;
