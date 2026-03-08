import { CalendarDays, Eye, Lock, Upload, Globe, Layers } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import mockupCalendar from "@/assets/mockup-calendar.webp";

const CalendarFeature = () => (
  <FeaturePageLayout
    heroImage={mockupCalendar}
    heroImageAlt="Calendrier multi-logements Rentely"
    badge="Calendrier & Disponibilités"
    title="Un calendrier centralisé pour"
    titleHighlight="tous vos biens"
    subtitle="Visualisez l'occupation de chaque logement, bloquez des dates, intégrez le calendrier sur votre site externe. Tout en un coup d'œil."
    features={[
      { icon: CalendarDays, title: "Vue mensuelle multi-logements", description: "Affichez tous vos biens sur un seul calendrier. Changez de mois, filtrez par logement." },
      { icon: Lock, title: "Blocage de dates", description: "Bloquez des périodes en un clic pour travaux, usage personnel ou indisponibilité." },
      { icon: Upload, title: "Import de réservations", description: "Importez vos réservations existantes depuis un fichier Excel pour démarrer rapidement." },
      { icon: Globe, title: "Intégration externe", description: "Générez un widget iframe pour afficher vos disponibilités sur votre propre site web." },
      { icon: Eye, title: "Page publique", description: "Partagez un lien public avec vos locataires pour qu'ils consultent vos disponibilités en temps réel." },
      { icon: Layers, title: "Multi-logements", description: "Gérez autant de biens que vous le souhaitez. Chaque logement a son propre calendrier et ses propres règles." },
    ]}
    highlights={[
      "Vue consolidée de tous vos logements",
      "Blocage de dates instantané",
      "Import Excel pour démarrer vite",
      "Widget intégrable sur votre site",
      "Lien public partageable",
      "Aucune limite de logements",
    ]}
    nextPage={{ label: "Réservations & Paiements", href: "/features/bookings" }}
  />
);

export default CalendarFeature;
