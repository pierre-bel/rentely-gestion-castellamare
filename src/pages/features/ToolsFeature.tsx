import { Brush, Users, BarChart3, FileSpreadsheet, DollarSign, Shield } from "lucide-react";
import FeaturePageLayout from "@/components/features/FeaturePageLayout";
import StatsMockup from "@/components/home/mockups/StatsMockup";

const ToolsFeature = () => (
  <FeaturePageLayout
    heroMockup={<StatsMockup />}
    badge="Outils avancés"
    title="Professionnalisez votre"
    titleHighlight="activité"
    subtitle="Portail ménage, gestion des locataires, statistiques détaillées et rapports de revenus pour une gestion optimale."
    features={[
      { icon: Brush, title: "Portail ménage", description: "Partagez un lien sécurisé avec votre équipe de ménage. Ils voient les arrivées et départs sans accéder à vos données sensibles." },
      { icon: Users, title: "Gestion des locataires", description: "Fichier centralisé avec coordonnées, historique des séjours et association automatique aux réservations." },
      { icon: BarChart3, title: "Statistiques détaillées", description: "Taux d'occupation, revenus par période, nombre de réservations. Analysez la performance de chaque logement." },
      { icon: FileSpreadsheet, title: "Rapports de revenus", description: "Générez des rapports détaillés exportables en Excel. Idéal pour votre comptabilité." },
      { icon: DollarSign, title: "Tarification par période", description: "Définissez des tarifs semaine/week-end par période. Importez et exportez vos grilles depuis Excel." },
      { icon: Shield, title: "Données sécurisées", description: "Vos données sont hébergées de manière sécurisée. Accès protégé par authentification." },
    ]}
    highlights={[
      "Portail ménage avec accès restreint",
      "Fichier locataires centralisé",
      "Statistiques et taux d'occupation",
      "Rapports exportables en Excel",
      "Tarification flexible par période",
      "Hébergement sécurisé des données",
    ]}
    nextPage={{ label: "Retour à l'accueil", href: "/" }}
  />
);

export default ToolsFeature;
