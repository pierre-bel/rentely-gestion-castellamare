import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  Mail,
  CreditCard,
  BarChart3,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Home as HomeIcon,
  ClipboardList,
  Brush,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthDialog } from "@/components/AuthDialog";
import Footer from "@/components/Footer";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Calendrier & Disponibilités",
    description:
      "Visualisez et gérez la disponibilité de tous vos biens sur un calendrier interactif. Bloquez des dates, intégrez le calendrier sur votre site externe.",
  },
  {
    icon: ClipboardList,
    title: "Réservations manuelles",
    description:
      "Créez et modifiez vos réservations en quelques clics. Tarification automatique basée sur vos grilles hebdomadaires, échéances de paiement pré-remplies.",
  },
  {
    icon: CreditCard,
    title: "Suivi des paiements",
    description:
      "Échéanciers personnalisables, suivi acompte/solde, historique complet. Gardez une vue claire sur chaque encaissement.",
  },
  {
    icon: FileText,
    title: "Contrats automatisés",
    description:
      "Éditeur riche avec variables dynamiques. Générez des contrats professionnels en un clic et collectez les signatures électroniques.",
  },
  {
    icon: Mail,
    title: "E-mails automatiques",
    description:
      "Configurez des e-mails déclenchés avant l'arrivée, après le départ ou à la réservation. Personnalisez le contenu avec des variables dynamiques.",
  },
  {
    icon: BarChart3,
    title: "Tarification hebdomadaire",
    description:
      "Définissez des tarifs semaine/week-end par période. Import/export Excel, génération automatique des semaines futures.",
  },
  {
    icon: Users,
    title: "Gestion des locataires",
    description:
      "Fichier locataires centralisé avec coordonnées, historique des séjours et association automatique aux réservations.",
  },
  {
    icon: Brush,
    title: "Portail ménage",
    description:
      "Partagez un lien sécurisé avec votre équipe de ménage. Ils voient les arrivées/départs sans accéder à vos données sensibles.",
  },
];

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
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Plateforme de gestion locative
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-foreground">
              Gérez vos locations de vacances{" "}
              <span className="text-primary">simplement</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Calendrier, réservations, contrats, paiements, e-mails automatiques
              — tout ce dont vous avez besoin pour gérer vos biens, au même endroit.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="rounded-full px-8 h-12 text-base"
                onClick={() => setAuthDialogOpen(true)}
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-12 text-base"
                asChild
              >
                <Link to="/help-center">En savoir plus</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tout pour gérer vos locations
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Des outils pensés pour les propriétaires qui gèrent eux-mêmes leurs locations saisonnières.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="group hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/30"
              >
                <CardContent className="p-6">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights / Why Rentely */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Pourquoi choisir Rentely ?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Fini les tableurs Excel et les échanges d'e-mails interminables.
                Centralisez toute votre gestion locative dans une interface moderne et intuitive.
              </p>
              <Button
                size="lg"
                className="rounded-full px-8"
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
                  className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border/60"
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
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-center">
            <ShieldCheck className="h-12 w-12 text-primary-foreground mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Prêt à simplifier votre gestion ?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Rejoignez Rentely et gagnez du temps sur chaque réservation.
              Configuration en quelques minutes.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full px-8 h-12 text-base"
              onClick={() => setAuthDialogOpen(true)}
            >
              Démarrer maintenant
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
};

export default Home;
