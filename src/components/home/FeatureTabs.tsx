import {
  CalendarDays,
  CreditCard,
  Mail,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarMockup from "./mockups/CalendarMockup";
import BookingsMockup from "./mockups/BookingsMockup";
import EmailsMockup from "./mockups/EmailsMockup";
import StatsMockup from "./mockups/StatsMockup";

const CATEGORIES = [
  {
    value: "calendar",
    label: "Calendrier & Réservations",
    icon: CalendarDays,
    headline: "Un calendrier centralisé pour tous vos biens",
    description:
      "Visualisez et gérez la disponibilité de chaque logement. Créez des réservations manuelles avec tarification automatique, importez depuis Excel et intégrez sur votre site.",
    points: [
      "Vue mensuelle multi-logements",
      "Blocage de dates en un clic",
      "Réservations manuelles avec calcul automatique",
      "Intégration iframe sur votre site externe",
      "Import de réservations depuis Excel",
      "Gestion des vacances scolaires",
    ],
    mockup: <CalendarMockup />,
  },
  {
    value: "payments",
    label: "Paiements & Contrats",
    icon: CreditCard,
    headline: "Maîtrisez chaque encaissement",
    description:
      "Échéanciers personnalisables, rapprochement bancaire, contrats automatisés avec signature électronique et portail client avec QR code de paiement.",
    points: [
      "Échéanciers de paiement configurables",
      "Rapprochement bancaire automatique",
      "Contrats avec variables dynamiques",
      "Signature électronique intégrée",
      "Portail client avec QR code de paiement",
      "Suivi des paiements en retard",
    ],
    mockup: <BookingsMockup />,
  },
  {
    value: "communication",
    label: "Communication & IA",
    icon: Mail,
    headline: "Communiquez sans effort grâce à l'IA",
    description:
      "E-mails automatiques, synchronisation Gmail, assistant IA pour vos réponses et messagerie intégrée. Tout pour garder le contact avec vos locataires.",
    points: [
      "E-mails déclenchés automatiquement",
      "Synchronisation Gmail intégrée",
      "Assistant IA pour rédiger vos réponses",
      "Variables dynamiques (nom, dates, prix…)",
      "Messagerie intégrée hôte ↔ locataire",
      "Instructions spécifiques par message",
    ],
    mockup: <EmailsMockup />,
  },
  {
    value: "tools",
    label: "Outils avancés",
    icon: BarChart3,
    headline: "Des outils puissants pour aller plus loin",
    description:
      "Portail ménage, gestion d'équipe, locataires, avis personnalisables, statistiques détaillées et rapports de revenus exportables.",
    points: [
      "Portail ménage avec accès sécurisé",
      "Gestion d'équipe multi-niveaux",
      "Avis avec critères personnalisables",
      "Statistiques et taux d'occupation",
      "Rapports de revenus exportables en Excel",
      "Tarification par période personnalisable",
    ],
    mockup: <StatsMockup />,
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
