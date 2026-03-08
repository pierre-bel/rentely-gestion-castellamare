import { Mail, MessageSquare, Variable, Clock, Send, Settings } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import mockupEmails from "@/assets/mockup-emails.webp";

const AutomationFeature = () => (
  <FeaturePageLayout
    heroImage={mockupEmails}
    heroImageAlt="Automatisations e-mails"
    badge="Communication & Automatisation"
    title="Communiquez"
    titleHighlight="sans effort"
    subtitle="E-mails automatiques, messagerie intégrée, variables dynamiques. Personnalisez chaque interaction avec vos locataires."
    features={[
      { icon: Mail, title: "E-mails automatiques", description: "Déclenchez des e-mails avant l'arrivée, après le départ ou à la réservation. Vous choisissez le timing." },
      { icon: Variable, title: "Variables dynamiques", description: "Nom du locataire, dates, prix, adresse… Insérez des variables pour personnaliser chaque message automatiquement." },
      { icon: Clock, title: "Timing personnalisable", description: "3 jours avant l'arrivée ? Le jour du départ ? À la confirmation ? Configurez le déclencheur qui vous convient." },
      { icon: MessageSquare, title: "Messagerie intégrée", description: "Échangez directement avec vos locataires depuis la plateforme. Historique complet consultable." },
      { icon: Send, title: "Historique d'envoi", description: "Consultez l'historique complet de tous les e-mails envoyés. Vérifiez qu'ils ont bien été délivrés." },
      { icon: Settings, title: "Modèles personnalisables", description: "Créez autant de modèles que nécessaire. Activez ou désactivez-les selon vos besoins." },
    ]}
    highlights={[
      "E-mails déclenchés automatiquement",
      "Variables dynamiques illimitées",
      "Timing configurable au jour près",
      "Messagerie hôte ↔ locataire",
      "Historique d'envoi complet",
      "Modèles activables/désactivables",
    ]}
    nextPage={{ label: "Outils avancés", href: "/features/tools" }}
  />
);

export default AutomationFeature;
