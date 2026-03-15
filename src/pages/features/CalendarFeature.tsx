import { CalendarDays, Eye, Lock, Upload, Globe, Layers, GraduationCap } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import CalendarMockup from "@/components/home/mockups/CalendarMockup";

const CalendarFeature = () => (
  <FeaturePageLayout
    heroMockup={<CalendarMockup />}
    badge="Calendrier & Disponibilités"
    title="Un calendrier centralisé pour"
    titleHighlight="tous vos biens"
    subtitle="Visualisez l'occupation de chaque logement, bloquez des dates, gérez les vacances scolaires et intégrez le calendrier sur votre site externe. Tout en un coup d'œil."
    features={[
      { icon: CalendarDays, title: "Vue mensuelle multi-logements", description: "Affichez tous vos biens sur un seul calendrier. Changez de mois, filtrez par logement. Vue consolidée des arrivées et départs." },
      { icon: Lock, title: "Blocage de dates", description: "Bloquez des périodes en un clic pour travaux, usage personnel ou indisponibilité. Débloquez tout aussi facilement." },
      { icon: Upload, title: "Import de réservations", description: "Importez vos réservations existantes depuis un fichier Excel pour démarrer rapidement sans ressaisie." },
      { icon: Globe, title: "Intégration externe (iframe)", description: "Générez un widget iframe pour afficher vos disponibilités sur votre propre site web. Personnalisable par logement ou pour tous vos biens." },
      { icon: Eye, title: "Page publique de disponibilités", description: "Partagez un lien public avec vos locataires pour qu'ils consultent vos disponibilités en temps réel, sans créer de compte." },
      { icon: GraduationCap, title: "Vacances scolaires", description: "Configurez vos périodes de vacances scolaires pour une meilleure visibilité sur le calendrier et une tarification adaptée." },
      { icon: Layers, title: "Multi-logements illimité", description: "Gérez autant de biens que vous le souhaitez. Chaque logement a son propre calendrier, ses propres règles et tarifs." },
    ]}
    highlights={[
      "Vue consolidée de tous vos logements",
      "Blocage de dates instantané",
      "Import Excel pour démarrer vite",
      "Widget intégrable sur votre site",
      "Lien public partageable",
      "Gestion des vacances scolaires",
      "Aucune limite de logements",
    ]}
    nextPage={{ label: "Réservations & Paiements", href: "/features/bookings" }}
  />
);

export default CalendarFeature;
