import { ClipboardList, CreditCard, FileText, PenTool, Receipt, CalendarCheck } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";

const BookingsFeature = () => (
  <FeaturePageLayout
    badge="Réservations & Paiements"
    title="Maîtrisez chaque"
    titleHighlight="réservation"
    subtitle="Créez des réservations manuelles, suivez les paiements avec des échéanciers personnalisables, générez des contrats automatiques."
    features={[
      { icon: ClipboardList, title: "Réservations manuelles", description: "Créez une réservation en quelques clics. Le tarif est calculé automatiquement selon vos grilles de prix." },
      { icon: CreditCard, title: "Échéanciers de paiement", description: "Définissez des échéanciers personnalisés : acompte, versements intermédiaires, solde. Suivez chaque paiement." },
      { icon: Receipt, title: "Suivi financier complet", description: "Historique de tous les paiements, statut en temps réel, montants restants. Aucun oubli possible." },
      { icon: FileText, title: "Contrats automatisés", description: "Éditeur riche avec variables dynamiques. Générez un contrat professionnel en un clic." },
      { icon: PenTool, title: "Signature électronique", description: "Vos locataires signent directement depuis le portail client. Tout est archivé automatiquement." },
      { icon: CalendarCheck, title: "Portail client", description: "Chaque réservation dispose d'un portail dédié avec toutes les infos du séjour, le contrat et le suivi de paiement." },
    ]}
    highlights={[
      "Tarification automatique par période",
      "Échéanciers acompte / solde flexibles",
      "Contrats avec variables dynamiques",
      "Signature électronique intégrée",
      "Portail client par réservation",
      "Historique complet des paiements",
    ]}
    nextPage={{ label: "Communication & Automatisation", href: "/features/automation" }}
  />
);

export default BookingsFeature;
