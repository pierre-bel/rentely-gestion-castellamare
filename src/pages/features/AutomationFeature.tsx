import { Mail, MessageSquare, Variable, Clock, Send, Settings, Bot, Inbox } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import EmailsMockup from "@/components/home/mockups/EmailsMockup";

const AutomationFeature = () => (
  <FeaturePageLayout
    heroMockup={<EmailsMockup />}
    badge="Communication & Automatisation"
    title="Communiquez"
    titleHighlight="sans effort"
    subtitle="E-mails automatiques, messagerie intégrée, assistant IA pour vos réponses et synchronisation Gmail. Personnalisez chaque interaction avec vos locataires."
    features={[
      { icon: Mail, title: "E-mails automatiques", description: "Déclenchez des e-mails avant l'arrivée, après le départ ou à la réservation. Vous choisissez le timing au jour près." },
      { icon: Variable, title: "Variables dynamiques", description: "Nom du locataire, dates, prix, adresse… Insérez des variables pour personnaliser chaque message automatiquement." },
      { icon: Clock, title: "Timing personnalisable", description: "3 jours avant l'arrivée ? Le jour du départ ? À la confirmation ? Configurez le déclencheur qui vous convient." },
      { icon: Inbox, title: "Synchronisation Gmail", description: "Connectez votre boîte Gmail et retrouvez tous vos e-mails locataires directement dans Rentely. Lecture et gestion centralisées." },
      { icon: Bot, title: "Assistant IA pour les réponses", description: "L'IA génère des brouillons de réponse basés sur vos disponibilités et tarifs réels. Ajoutez des instructions spécifiques par message." },
      { icon: MessageSquare, title: "Messagerie intégrée", description: "Échangez directement avec vos locataires depuis la plateforme. Historique complet consultable à tout moment." },
      { icon: Send, title: "Historique d'envoi", description: "Consultez l'historique complet de tous les e-mails envoyés. Vérifiez qu'ils ont bien été délivrés." },
      { icon: Settings, title: "Modèles personnalisables", description: "Créez autant de modèles que nécessaire. Activez ou désactivez-les selon vos besoins, par logement ou globalement." },
    ]}
    highlights={[
      "E-mails déclenchés automatiquement",
      "Variables dynamiques illimitées",
      "Synchronisation Gmail intégrée",
      "Assistant IA pour rédiger vos réponses",
      "Instructions spécifiques par message",
      "Messagerie hôte ↔ locataire",
      "Historique d'envoi complet",
      "Modèles activables par logement",
    ]}
    nextPage={{ label: "Outils avancés", href: "/features/tools" }}
  />
);

export default AutomationFeature;
