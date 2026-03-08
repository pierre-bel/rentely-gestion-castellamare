import {
  CalendarDays,
  CreditCard,
  FileText,
  Mail,
  BarChart3,
  Users,
  Brush,
  ClipboardList,
  CheckCircle2,
  Globe,
  Lock,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import mockupCalendar from "@/assets/mockup-calendar.webp";
import mockupPayments from "@/assets/mockup-payments.webp";
import mockupEmails from "@/assets/mockup-emails.webp";
import mockupStats from "@/assets/mockup-stats.webp";

const CATEGORIES = [
  {
    value: "calendar",
    label: "Calendrier & Réservations",
    icon: CalendarDays,
    headline: "Un calendrier centralisé pour tous vos biens",
    description:
      "Visualisez et gérez la disponibilité de chaque logement. Créez des réservations manuelles avec tarification automatique basée sur vos grilles hebdomadaires.",
    points: [
      "Vue mensuelle multi-logements",
      "Blocage de dates en un clic",
      "Réservations manuelles avec calcul automatique",
      "Intégration sur votre site externe (iframe)",
      "Import de réservations depuis Excel",
      "Tarification semaine / week-end par période",
    ],
    mockup: (
      <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
        <img src={mockupCalendar} alt="Calendrier multi-logements" className="w-full h-auto" loading="lazy" />
      </div>
    ),
  },
  {
    value: "payments",
    label: "Paiements & Contrats",
    icon: CreditCard,
    headline: "Maîtrisez chaque encaissement",
    description:
      "Échéanciers personnalisables, suivi acompte et solde, contrats automatisés avec signature électronique. Gardez une vision claire de vos finances.",
    points: [
      "Échéanciers de paiement personnalisables",
      "Suivi acompte / solde en temps réel",
      "Contrats avec variables dynamiques",
      "Signature électronique intégrée",
      "Historique complet des transactions",
      "Rappels automatiques de paiement",
    ],
    mockup: (
      <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
        <img src={mockupPayments} alt="Échéancier de paiements" className="w-full h-auto" loading="lazy" />
      </div>
    ),
  },
  {
    value: "communication",
    label: "Communication",
    icon: Mail,
    headline: "Communiquez sans effort",
    description:
      "E-mails automatiques avant l'arrivée, après le départ ou à la réservation. Portail client personnalisé pour chaque réservation.",
    points: [
      "E-mails déclenchés automatiquement",
      "Variables dynamiques (nom, dates, prix…)",
      "Portail client avec infos de séjour",
      "Messagerie intégrée hôte ↔ locataire",
      "Modèles d'e-mails personnalisables",
      "Historique d'envoi complet",
    ],
    mockup: (
      <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
        <img src={mockupEmails} alt="Automatisations e-mails" className="w-full h-auto" loading="lazy" />
      </div>
    ),
  },
  {
    value: "tools",
    label: "Outils avancés",
    icon: BarChart3,
    headline: "Des outils puissants pour aller plus loin",
    description:
      "Portail ménage, gestion des locataires, statistiques détaillées, rapports de revenus. Tout pour professionnaliser votre activité.",
    points: [
      "Portail ménage avec accès sécurisé",
      "Fichier locataires centralisé",
      "Statistiques et taux d'occupation",
      "Rapports de revenus exportables",
      "Gestion multi-logements",
      "Tarification par période personnalisable",
    ],
    mockup: (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Aperçu</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Taux d'occupation", value: "78%", icon: CalendarDays },
            { label: "Revenus du mois", value: "4 280 €", icon: CreditCard },
            { label: "Locataires actifs", value: "12", icon: Users },
            { label: "Réservations", value: "8", icon: ClipboardList },
          ].map((item, i) => (
            <div key={i} className="bg-muted/50 rounded-xl p-3">
              <item.icon className="h-4 w-4 text-primary mb-1" />
              <p className="text-lg font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const FeatureTabs = () => (
  <section className="py-24 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-14">
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">Fonctionnalités</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
          Tout pour gérer vos locations
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Des outils pensés pour les propriétaires qui gèrent eux-mêmes leurs locations saisonnières.
        </p>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full flex flex-wrap justify-center gap-1 bg-transparent h-auto mb-12">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.value}
              value={cat.value}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-all"
            >
              <cat.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{cat.headline}</h3>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">{cat.description}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {cat.points.map((point) => (
                    <div key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">{cat.mockup}</div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  </section>
);

export default FeatureTabs;
