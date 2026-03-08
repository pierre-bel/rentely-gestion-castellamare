import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import mockupHero from "@/assets/mockup-hero-dashboard.webp";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/AuthDialog";
import Footer from "@/components/Footer";
import HowItWorks from "@/components/home/HowItWorks";
import FeatureTabs from "@/components/home/FeatureTabs";
import StatsSection from "@/components/home/StatsSection";
import TestimonialSection from "@/components/home/TestimonialSection";

const HIGHLIGHTS = [
  "Calendrier multi-logements synchronisé",
  "Contrats avec signature électronique",
  "E-mails automatiques personnalisables",
  "Tarification semaine/week-end par période",
  "Portail client pour chaque réservation",
  "Suivi complet des paiements et échéances",
  "Portail ménage avec accès sécurisé",
  "Statistiques et rapports de revenus",
];

const Home = () => {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/[0.07] via-background to-primary/[0.12]">
        {/* Decorative shapes */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-primary/[0.06] pointer-events-none" />

        <div className="container mx-auto px-4 py-24 lg:py-36 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-5 py-2 text-sm font-semibold mb-8 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              Plateforme de gestion locative saisonnière
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 text-foreground">
              Gérez vos locations{" "}
              <span className="text-primary relative">
                simplement
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 5.5C40 2 80 1 100 3C120 5 160 6.5 199 3"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.4"
                  />
                </svg>
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Calendrier, réservations, contrats, paiements, e-mails automatiques — tout ce dont vous avez besoin pour gérer vos biens, au même endroit.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="rounded-full px-8 h-13 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                onClick={() => setAuthDialogOpen(true)}
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-13 text-base"
                asChild
              >
                <Link to="/features/calendar">Découvrir les fonctionnalités</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Stats */}
      <StatsSection />

      {/* Feature Tabs */}
      <FeatureTabs />

      {/* Testimonial */}
      <TestimonialSection />

      {/* Why Rentely */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">Avantages</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-6">
                Pourquoi choisir Rentely ?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Fini les tableurs Excel et les échanges d'e-mails interminables. Centralisez toute votre gestion locative dans une interface moderne et intuitive.
              </p>
              <Button
                size="lg"
                className="rounded-full px-8 shadow-lg shadow-primary/20"
                onClick={() => setAuthDialogOpen(true)}
              >
                Créer mon compte
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HIGHLIGHTS.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all duration-300"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-foreground)/0.05),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary-foreground)/0.08),transparent_50%)]" />
            <div className="relative z-10">
              <ShieldCheck className="h-12 w-12 text-primary-foreground mx-auto mb-6 opacity-80" />
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Prêt à simplifier votre gestion ?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-10 max-w-xl mx-auto">
                Rejoignez Rentely et gagnez du temps sur chaque réservation. Configuration en quelques minutes.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full px-8 h-13 text-base shadow-xl"
                onClick={() => setAuthDialogOpen(true)}
              >
                Démarrer maintenant
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
};

export default Home;
