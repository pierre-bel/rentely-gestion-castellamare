import { useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { AuthDialog } from "./AuthDialog";

const Footer = () => {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <>
      <footer className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="bg-card-bg rounded-3xl p-8 md:p-12 lg:p-16">
            {/* Top Section */}
            <div className="flex flex-col lg:flex-row justify-between gap-12 mb-12">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <span className="text-2xl font-bold">Rentely</span>
              </Link>

              {/* Link Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
                {/* Platform */}
                <div>
                  <h3 className="font-bold text-base mb-2">Fonctionnalités</h3>
                  <div className="w-12 h-1 bg-primary mb-4"></div>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/features/calendar" className="text-foreground hover:text-primary transition-colors">
                        Calendrier
                      </Link>
                    </li>
                    <li>
                      <Link to="/features/bookings" className="text-foreground hover:text-primary transition-colors">
                        Réservations
                      </Link>
                    </li>
                    <li>
                      <Link to="/features/automation" className="text-foreground hover:text-primary transition-colors">
                        Automatisation
                      </Link>
                    </li>
                    <li>
                      <Link to="/features/tools" className="text-foreground hover:text-primary transition-colors">
                        Outils avancés
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Account */}
                <div>
                  <h3 className="font-bold text-base mb-2">Compte</h3>
                  <div className="w-12 h-1 bg-primary mb-4"></div>
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => setAuthDialogOpen(true)}
                        className="text-foreground hover:text-primary transition-colors"
                      >
                        Connexion
                      </button>
                    </li>
                    <li>
                      <Link to="/host/dashboard" className="text-foreground hover:text-primary transition-colors">
                        Tableau de bord
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Support */}
                <div>
                  <h3 className="font-bold text-base mb-2">Support</h3>
                  <div className="w-12 h-1 bg-primary mb-4"></div>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/faq" className="text-foreground hover:text-primary transition-colors">
                        FAQ
                      </Link>
                    </li>
                    <li>
                      <Link to="/help-center" className="text-foreground hover:text-primary transition-colors">
                        Centre d'aide
                      </Link>
                    </li>
                    <li>
                      <Link to="/support" className="text-foreground hover:text-primary transition-colors">
                        Contact
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom */}
            <div className="text-center pt-8 border-t border-card-border">
              <p className="text-text-secondary">
                © {new Date().getFullYear()} Rentely. Tous droits réservés.
              </p>
            </div>
          </div>
        </div>
      </footer>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
};

export default Footer;
