import { ClipboardList, CreditCard, FileText, PenTool, Receipt, CalendarCheck, Landmark, QrCode } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import BookingsMockup from "@/components/home/mockups/BookingsMockup";

const BookingsFeature = () => (
  <FeaturePageLayout
    heroMockup={<BookingsMockup />}
    badge="Réservations & Paiements"
    title="Maîtrisez chaque"
    titleHighlight="réservation"
    subtitle="Créez des réservations manuelles, suivez les paiements avec des échéanciers personnalisables, générez des contrats automatiques et rapprochez vos virements bancaires."
    features={[
      { icon: ClipboardList, title: "Réservations manuelles", description: "Créez une réservation en quelques clics. Le tarif est calculé automatiquement selon vos grilles de prix semaine/week-end." },
      { icon: CreditCard, title: "Échéanciers de paiement", description: "Définissez des échéanciers personnalisés : acompte, versements intermédiaires, solde. Configurez vos propres modèles d'échéancier." },
      { icon: Receipt, title: "Suivi financier complet", description: "Historique de tous les paiements, statut en temps réel, montants restants, paiements en retard. Aucun oubli possible." },
      { icon: Landmark, title: "Rapprochement bancaire", description: "Importez vos relevés bancaires et associez automatiquement les virements aux réservations et échéances correspondantes." },
      { icon: FileText, title: "Contrats automatisés", description: "Éditeur riche avec variables dynamiques (nom, dates, prix, adresse…). Générez un contrat professionnel en un clic." },
      { icon: PenTool, title: "Signature électronique", description: "Vos locataires signent directement depuis le portail client. Tout est archivé automatiquement et consultable à tout moment." },
      { icon: CalendarCheck, title: "Portail client dédié", description: "Chaque réservation dispose d'un portail avec toutes les infos du séjour, le contrat, le suivi de paiement et un QR code de paiement." },
      { icon: QrCode, title: "Paiement par QR code", description: "Générez un QR code unique par réservation pour faciliter le paiement de vos locataires." },
    ]}
    highlights={[
      "Tarification automatique semaine/week-end",
      "Échéanciers acompte / solde configurables",
      "Contrats avec variables dynamiques",
      "Signature électronique intégrée",
      "Rapprochement bancaire automatique",
      "Portail client par réservation",
      "Paiement par QR code",
      "Historique complet des paiements",
    ]}
    nextPage={{ label: "Communication & Automatisation", href: "/features/automation" }}
  />
);

export default BookingsFeature;
